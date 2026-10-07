import { randomUUID } from "node:crypto";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { T3Tools } from "./contracts.ts";
import { CredentialFile, type Credential } from "./credentials.ts";
import { AuthorizationCleanupError, LocalAuthorization } from "./auth.ts";
import type { T3Config } from "../config.ts";

const mutations = new Set<keyof T3Tools>([
  "t3_thread_launch",
  "t3_thread_send",
  "t3_queue_cancel",
  "t3_thread_interrupt",
  "t3_pending_request_respond",
]);
export type UncertainOperation = {
  id: string;
  tool: keyof T3Tools;
  input: Record<string, unknown>;
  credentialSessionId: string;
  acceptedThreadId?: string;
};
export type Connection = {
  call<K extends keyof T3Tools>(
    tool: K,
    input: T3Tools[K]["input"],
  ): Promise<T3Tools[K]["output"]>;
  close(): Promise<void>;
};
export async function connectMcp(credential: Credential): Promise<Connection> {
  const client = new Client({ name: "t3-linear-agent", version: "0.1.0" });
  const transport = new StreamableHTTPClientTransport(
    new URL(credential.endpoint),
    {
      requestInit: { headers: { Authorization: `Bearer ${credential.token}` } },
    },
  );
  try {
    await client.connect(transport, { timeout: 15_000 });
    // listTools installs the SDK's output-schema validators.
    await client.listTools();
  } catch {
    await client.close().catch(() => {});
    throw new Error(
      "T3 MCP connection failed. Check the endpoint and local authorization.",
    );
  }
  return {
    async call<K extends keyof T3Tools>(tool: K, input: T3Tools[K]["input"]) {
      const result = await client.callTool(
        { name: tool, arguments: input },
        undefined,
        { timeout: 30_000 },
      );
      if (result.isError)
        throw new Error(
          `T3 tool ${tool} rejected the request. Reconcile mutations before retrying.`,
        );
      if (!result.structuredContent)
        throw new Error(`T3 tool ${tool} omitted its structured result.`);
      // The SDK validated this result against the tool's advertised output schema.
      return result.structuredContent as T3Tools[K]["output"];
    },
    close: () => client.close(),
  };
}
export type ReconciliationReads = Pick<
  T3Client,
  | "projects"
  | "project"
  | "capabilities"
  | "threads"
  | "readThread"
  | "waitRun"
  | "queue"
  | "pendingRequests"
  | "pendingRequest"
>;
export type Reconcile = (
  operations: readonly UncertainOperation[],
  reads: ReconciliationReads,
) => Promise<readonly string[]>;

export class T3Client {
  private connection: Connection | undefined;
  private inFlight = new Set<Promise<unknown>>();
  private uncertain: UncertainOperation[];
  private pausedReason: string | undefined;
  private lifecycle: Promise<void> | undefined;
  private renewalTimer: ReturnType<typeof setTimeout> | undefined;
  private closed = false;
  private retryDelay = 60_000;
  private retirements: Credential[] = [];
  private credential: Credential;
  private readonly file: CredentialFile;
  private readonly authorization: Pick<LocalAuthorization, "issue" | "revoke">;
  private readonly connect: typeof connectMcp;
  constructor(
    credential: Credential,
    file: CredentialFile,
    authorization: Pick<LocalAuthorization, "issue" | "revoke">,
    connect = connectMcp,
    uncertain: UncertainOperation[] = [],
  ) {
    this.credential = credential;
    this.file = file;
    this.authorization = authorization;
    this.connect = connect;
    this.uncertain = [...uncertain];
    if (uncertain.length)
      this.pausedReason =
        "Restore delivery intent and reconcile uncertain T3 mutations before dispatch.";
  }
  get credentialSessionId() {
    return this.credential.sessionId;
  }
  get status() {
    const reason =
      this.closed
        ? "T3 client is closed."
        : this.credential.expiresAt <= Date.now()
        ? "T3 credential expired. Renew local authorization before dispatch."
        : this.pausedReason;
    return {
      paused: Boolean(reason),
      reason,
      uncertain: structuredClone(this.uncertain),
      pendingRetirementSessionIds: this.retirements.map(
        (item) => item.sessionId,
      ),
    };
  }
  private async exclusiveLifecycle(operation: () => Promise<void>) {
    if (this.lifecycle || this.closed)
      throw new Error("T3 connection handover is already running or client is closed.");
    const pending = operation();
    this.lifecycle = pending;
    try {
      await pending;
    } finally {
      this.lifecycle = undefined;
    }
  }
  open() {
    return this.exclusiveLifecycle(() => this.openConnection());
  }
  private async openConnection() {
    if (this.credential.expiresAt <= Date.now())
      throw new Error(
        "T3 credential expired. Renew local authorization before dispatch.",
      );
    this.connection = await this.connect(this.credential);
    try {
      await this.connection.call("t3_project_list", {});
    } catch {
      await this.connection.close();
      this.connection = undefined;
      throw new Error(
        "T3 authorization was rejected. Pair locally before dispatch.",
      );
    }
  }
  static async create(config: T3Config, uncertain: UncertainOperation[] = []) {
    const file = new CredentialFile(config.credentialFile);
    const authorization = new LocalAuthorization(config);
    const credential = await file.read();
    if (
      credential.endpoint !== config.endpoint ||
      credential.runtimeMode !== config.runtimeMode
    )
      throw new Error(
        "Stored T3 authorization differs from configured endpoint or runtime ceiling.",
      );
    const client = new T3Client(
      credential,
      file,
      authorization,
      connectMcp,
      uncertain,
    );
    await client.open();
    return client;
  }
  private request<K extends keyof T3Tools>(
    tool: K,
    input: T3Tools[K]["input"],
    reconciliationConnection?: Connection,
    prepare?: (
      output: T3Tools[K]["output"],
      connection: Connection,
      operation: UncertainOperation,
    ) => Promise<void>,
  ): Promise<T3Tools[K]["output"]> {
    const connection = reconciliationConnection ?? this.connection;
    if (!connection || this.closed)
      return Promise.reject(
        new Error("T3 is disconnected. Reconnect before dispatch."),
      );
    if (!reconciliationConnection && this.status.paused)
      return Promise.reject(new Error(this.status.reason));
    const operation: UncertainOperation = {
      id: randomUUID(),
      tool,
      input: structuredClone(input),
      credentialSessionId: this.credential.sessionId,
    };
    const request = connection
      .call(tool, input)
      .then(async (output) => {
        await prepare?.(output, connection, operation);
        return output;
      })
      .catch(() => {
        if (mutations.has(tool)) {
          this.uncertain.push(operation);
          this.pausedReason =
            "A T3 mutation has an uncertain outcome. Reconcile durable state before retrying or renewing.";
        } else {
          this.pausedReason =
            "T3 read failed. Check authorization and reconnect before dispatch.";
        }
        // Transport errors may include headers or server content. Never propagate them.
        throw new Error(`T3 ${tool} failed. ${this.pausedReason}`);
      });
    this.inFlight.add(request);
    void request.finally(() => this.inFlight.delete(request)).catch(() => {});
    return request;
  }
  projects(input: T3Tools["t3_project_list"]["input"] = {}) {
    return this.request("t3_project_list", input);
  }
  project(input: T3Tools["t3_project_read"]["input"]) {
    return this.request("t3_project_read", input);
  }
  capabilities() {
    return this.request("orchestrator_capabilities", {});
  }
  threads(input: T3Tools["t3_thread_list"]["input"]) {
    return this.request("t3_thread_list", input);
  }
  readThread(input: T3Tools["t3_thread_read"]["input"]) {
    return this.request("t3_thread_read", input);
  }
  waitRun(input: T3Tools["t3_thread_wait"]["input"]) {
    return this.request("t3_thread_wait", input);
  }
  queue(input: T3Tools["t3_queue_list"]["input"]) {
    return this.request("t3_queue_list", input);
  }
  pendingRequests(input: T3Tools["t3_pending_request_list"]["input"]) {
    return this.request("t3_pending_request_list", input);
  }
  pendingRequest(input: T3Tools["t3_pending_request_read"]["input"]) {
    return this.request("t3_pending_request_read", input);
  }
  launch(
    input: Pick<
      T3Tools["t3_thread_launch"]["input"],
      "title" | "runtimeMode" | "interactionMode"
    > & {
      projectId: string;
      workspaceStrategy: {
        type: "worktree";
        baseRef: string;
        branch: string;
        startFromOrigin: boolean;
      };
      modelSelection: {
        instanceId: string;
        model: string;
        options?: Record<string, unknown>;
      };
    },
  ) {
    // Send only the idle-launch fields, including for untyped callers.
    const {
      title,
      projectId,
      workspaceStrategy,
      modelSelection,
      runtimeMode,
      interactionMode,
    } = input;
    return this.request(
      "t3_thread_launch",
      {
        title,
        projectId,
        workspaceStrategy,
        modelSelection,
        ...(runtimeMode ? { runtimeMode } : {}),
        ...(interactionMode ? { interactionMode } : {}),
      },
      undefined,
      async (launched, connection, operation) => {
        operation.acceptedThreadId = launched.threadId;
        await this.confirmWorktree(
          connection,
          launched.threadId,
          projectId,
          workspaceStrategy.branch,
        );
      },
    );
  }
  private async confirmWorktree(
    connection: Connection,
    threadId: string,
    projectId: string,
    branch: string,
  ) {
    const deadline = Date.now() + 30_000;
    do {
      const { thread } = await connection.call("t3_thread_read", { threadId });
      if (thread.projectId !== projectId || thread.branch !== branch)
        throw new Error(
          "T3 bound the launch to an unexpected project or branch.",
        );
      if (thread.worktreePath) return;
      await new Promise((resolve) => setTimeout(resolve, 100));
    } while (Date.now() < deadline);
    throw new Error(
      "T3 workspace preparation did not finish. Reconcile the accepted thread ID before sending.",
    );
  }
  send(
    input: T3Tools["t3_thread_send"]["input"] & { clientRequestId: string },
    credentialSessionId: string,
  ) {
    if (credentialSessionId !== this.credentialSessionId)
      return Promise.reject(
        new Error(
          "T3 credential changed. Reconcile persisted delivery intent before sending.",
        ),
      );
    if (!input.clientRequestId.trim())
      return Promise.reject(
        new Error("Persist a non-empty stable send key before dispatch."),
      );
    return this.request("t3_thread_send", input);
  }
  cancelQueued(input: T3Tools["t3_queue_cancel"]["input"]) {
    return this.request("t3_queue_cancel", input);
  }
  interrupt(input: T3Tools["t3_thread_interrupt"]["input"]) {
    return this.request("t3_thread_interrupt", input);
  }
  answer(
    input: Pick<
      T3Tools["t3_pending_request_respond"]["input"],
      "requestId" | "threadId"
    > & { answers: Record<string, string> },
  ) {
    return this.request("t3_pending_request_respond", input);
  }

  private reads(connection: Connection): ReconciliationReads {
    return {
      projects: (input = {}) =>
        this.request("t3_project_list", input, connection),
      project: (input) => this.request("t3_project_read", input, connection),
      capabilities: () =>
        this.request("orchestrator_capabilities", {}, connection),
      threads: (input) => this.request("t3_thread_list", input, connection),
      readThread: (input) => this.request("t3_thread_read", input, connection),
      waitRun: (input) => this.request("t3_thread_wait", input, connection),
      queue: (input) => this.request("t3_queue_list", input, connection),
      pendingRequests: (input) =>
        this.request("t3_pending_request_list", input, connection),
      pendingRequest: (input) =>
        this.request("t3_pending_request_read", input, connection),
    };
  }
  renew(reconcile?: Reconcile) {
    return this.exclusiveLifecycle(() => this.replaceCredential(reconcile));
  }
  private async replaceCredential(reconcile?: Reconcile) {
    this.pausedReason = "T3 credential handover is in progress.";
    let candidate: Credential | undefined;
    let replacement: Connection | undefined;
    let switched = false;
    try {
      await Promise.allSettled([...this.inFlight]);
      if (this.retirements.length) await this.retireCredentials();
      if (this.uncertain.length) {
        if (!reconcile || !this.connection)
          throw new Error(
            "Uncertain T3 mutations require lifecycle reconciliation before credential replacement.",
          );
        const resolved = new Set(
          await reconcile(this.status.uncertain, this.reads(this.connection)),
        );
        this.uncertain = this.uncertain.filter(
          (operation) => !resolved.has(operation.id),
        );
        if (this.uncertain.length)
          throw new Error(
            "T3 mutation outcomes remain ambiguous. Operator reconciliation is required.",
          );
      }
      candidate = await this.authorization.issue(this.credential);
      if (
        candidate.endpoint !== this.credential.endpoint ||
        candidate.runtimeMode !== this.credential.runtimeMode ||
        [...candidate.scopes].sort().join(" ") !==
          [...this.credential.scopes].sort().join(" ")
      )
        throw new Error("T3 replacement changed the original authorization.");
      replacement = await this.connect(candidate);
      await replacement.call("t3_project_list", {});
      await this.file.write(candidate);
      const old = this.credential;
      const previous = this.connection;
      this.connection = replacement;
      this.credential = candidate;
      replacement = undefined;
      switched = true;
      this.retirements.push(old);
      await previous?.close().catch(() => {});
      this.pausedReason = undefined;
      this.retryDelay = 60_000;
    } catch (error) {
      await replacement?.close().catch(() => {});
      if (candidate && !switched)
        await this.authorization.revoke(candidate).catch(() => {
          this.retirements.push(candidate!);
        });
      if (this.uncertain.length)
        this.pausedReason =
          "Uncertain T3 mutations remain. Reconcile durable state before renewing or dispatching.";
      else if (this.credential.expiresAt > Date.now() && this.connection) {
        try {
          await this.connection.call("t3_project_list", {});
          this.pausedReason = undefined;
        } catch {
          this.pausedReason =
            "T3 authorization was rejected. Pair locally before dispatch.";
        }
      } else
        this.pausedReason =
          "T3 authorization expired. Renew locally before dispatch.";
      if (error instanceof AuthorizationCleanupError) throw error;
      throw new Error(
        this.pausedReason ??
          "T3 renewal failed. The verified old credential remains in use; renewal will retry.",
      );
    }
    await this.retireCredentials();
  }
  private async retireCredentials() {
    for (const retired of [...this.retirements]) {
      try {
        await this.authorization.revoke(retired);
        this.retirements = this.retirements.filter((item) => item !== retired);
      } catch {
        throw new Error(
          "T3 credential retirement failed. Retry renewal or revoke pendingRetirementSessionIds locally.",
        );
      }
    }
  }
  startRenewal(
    reconcile?: Reconcile,
    onFailure: (error: Error) => void = () => {},
  ) {
    const schedule = (delay: number) => {
      this.renewalTimer = setTimeout(
        async () => {
          let failed = false;
          try {
            await this.renew(reconcile);
          } catch (error) {
            failed = true;
            onFailure(
              error instanceof Error ? error : new Error("T3 renewal failed."),
            );
            this.retryDelay = Math.min(this.retryDelay * 2, 3_600_000);
          }
          if (!this.closed)
            schedule(
              failed ||
                this.status.paused ||
                this.credential.expiresAt - Date.now() <= 5 * 86_400_000
                ? this.retryDelay
                : this.credential.expiresAt - Date.now() - 5 * 86_400_000,
            );
        },
        Math.min(Math.max(0, delay), 2_147_483_647),
      );
      this.renewalTimer.unref();
    };
    if (this.closed) throw new Error("T3 client is closed.");
    if (this.renewalTimer) throw new Error("T3 renewal is already scheduled.");
    schedule(this.credential.expiresAt - Date.now() - 5 * 86_400_000);
  }
  reconnect() {
    return this.exclusiveLifecycle(async () => {
      this.pausedReason = "T3 reconnect is in progress.";
      await Promise.allSettled([...this.inFlight]);
      await this.connection?.close();
      this.connection = undefined;
      await this.openConnection();
      this.pausedReason = this.uncertain.length
        ? "Reconcile uncertain T3 mutations before dispatch."
        : undefined;
    });
  }
  async close() {
    this.closed = true;
    if (this.renewalTimer) clearTimeout(this.renewalTimer);
    await this.lifecycle?.catch(() => {});
    await Promise.allSettled([...this.inFlight]);
    await this.connection?.close();
    this.connection = undefined;
  }
}
