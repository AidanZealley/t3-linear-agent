import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CredentialFile, type Credential } from "../../src/t3/credentials.ts";
import { AuthorizationCleanupError } from "../../src/t3/auth.ts";
import { T3Client, type Connection } from "../../src/t3/client.ts";
import type { T3Tools } from "../../src/t3/contracts.ts";

const old: Credential = {
  version: 1,
  endpoint: "http://localhost:3873/mcp",
  token: "test-only-old",
  sessionId: "old",
  scopes: ["orchestration:read", "orchestration:operate"],
  runtimeMode: "full-access",
  expiresAt: Date.now() + 86_400_000,
};
const replacement: Credential = {
  ...old,
  token: "test-only-new",
  sessionId: "new",
};
const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return { promise, resolve };
};
async function fixture(
  t: test.TestContext,
  call: (
    session: string,
    tool: keyof T3Tools,
    input: Record<string, unknown>,
  ) => Promise<unknown>,
) {
  const directory = await mkdtemp(join(tmpdir(), "t3-client-test-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const file = new CredentialFile(join(directory, "credential.json"));
  await file.write(old);
  const issued: Credential[] = [];
  const revoked: string[] = [];
  const closed: string[] = [];
  const authorization = {
    async issue(previous?: Credential) {
      assert.deepEqual(previous, old);
      issued.push(replacement);
      return replacement;
    },
    async revoke(credential: Credential) {
      revoked.push(credential.sessionId);
    },
  };
  const connect = async (credential: Credential): Promise<Connection> => ({
    // This fake controls transport outcomes; product contracts are validated by SDK transport tests.
    async call<K extends keyof T3Tools>(tool: K, input: T3Tools[K]["input"]) {
      return (await call(
        credential.sessionId,
        tool,
        input,
      )) as T3Tools[K]["output"];
    },
    async close() {
      closed.push(credential.sessionId);
    },
  });
  const client = new T3Client(old, file, authorization, connect);
  await client.open();
  t.after(() => client.close());
  return { client, file, authorization, issued, revoked, closed, directory };
}

test("handover drains requests and blocks dispatch before verifying, persisting and retiring", async (t) => {
  const sending = deferred();
  const started = deferred();
  const events: string[] = [];
  const f = await fixture(t, async (session, tool) => {
    events.push(`${session}:${tool}`);
    if (tool === "t3_thread_send") {
      started.resolve();
      await sending.promise;
      return { messageId: "message", runId: "still-running" };
    }
    return { projects: [], nextCursor: null };
  });
  const send = f.client.send(
    {
      threadId: "thread",
      message: "task",
      clientRequestId: "durable-key",
    },
    "old",
  );
  await started.promise;
  const renewal = f.client.renew();
  assert.equal(f.client.status.paused, true);
  await assert.rejects(f.client.projects(), /handover/);
  assert.equal(f.issued.length, 0);
  sending.resolve();
  await send;
  await renewal;
  assert.equal(f.client.credentialSessionId, "new");
  assert.deepEqual(events, [
    "old:t3_project_list",
    "old:t3_thread_send",
    "new:t3_project_list",
  ]);
  assert.deepEqual(f.revoked, ["old"]);
  assert.deepEqual(f.closed, ["old"]);
  assert.equal((await f.file.read()).sessionId, "new");
  assert.equal((await stat(f.file.path)).mode & 0o777, 0o600);
  assert.equal((await stat(f.directory)).mode & 0o777, 0o700);
});

test("accepted send with lost response stays paused until old-session durable reconciliation", async (t) => {
  let sends = 0;
  const f = await fixture(t, async (session, tool) => {
    if (tool === "t3_thread_send") {
      sends++;
      throw new Error("response lost after acceptance");
    }
    if (tool === "t3_thread_read") {
      assert.equal(session, "old");
      return {
        items: [{ messageId: "accepted-message", runId: "accepted-run" }],
      };
    }
    return { projects: [], nextCursor: null };
  });
  await assert.rejects(
    f.client.send(
      {
        threadId: "thread",
        message: "task",
        clientRequestId: "persisted-key",
      },
      "old",
    ),
    /uncertain/,
  );
  assert.equal(f.client.status.uncertain[0]?.credentialSessionId, "old");
  assert.equal(
    f.client.status.uncertain[0]?.input.clientRequestId,
    "persisted-key",
  );
  await assert.rejects(f.client.renew(), /Uncertain/);
  assert.equal(f.issued.length, 0);
  await assert.rejects(
    f.client.send(
      {
        threadId: "thread",
        message: "task",
        clientRequestId: "persisted-key",
      },
      "old",
    ),
    /Uncertain/,
  );
  await f.client.renew(async (operations, reads) => {
    const state = await reads.readThread({ threadId: "thread" });
    assert.equal(state.items[0]?.messageId, "accepted-message");
    return operations.map((operation) => operation.id);
  });
  assert.equal(sends, 1);
  assert.equal(f.client.credentialSessionId, "new");
  assert.equal(f.client.status.paused, false);
});

test("ambiguous launch never retries or issues replacement authorization", async (t) => {
  let launches = 0;
  const f = await fixture(t, async (_session, tool, input) => {
    if (tool === "t3_thread_launch") {
      assert.equal("message" in input, false);
      assert.equal("attachments" in input, false);
      launches++;
      throw Error("lost launch response");
    }
    return { projects: [], nextCursor: null };
  });
  await assert.rejects(
    f.client.launch({
      title: "session-title",
      projectId: "project",
      workspaceStrategy: {
        type: "worktree",
        branch: "branch",
        baseRef: "main",
        startFromOrigin: false,
      },
      modelSelection: { instanceId: "codex", model: "selected" },
    }),
  );
  await assert.rejects(
    f.client.renew(async () => []),
    /Uncertain/,
  );
  assert.equal(f.issued.length, 0);
  assert.equal(launches, 1);
  assert.equal(f.client.status.paused, true);
});

test("failed replacement verification retains the valid old file and retires candidate", async (t) => {
  const f = await fixture(t, async (session) => {
    if (session === "new") throw Error("unauthorized");
    return { projects: [], nextCursor: null };
  });
  await assert.rejects(f.client.renew(), /old credential remains/);
  assert.equal(f.client.credentialSessionId, "old");
  assert.equal((await f.file.read()).token, old.token);
  assert.deepEqual(f.revoked, ["new"]);
  assert.equal(f.client.status.paused, false);
  assert.deepEqual(f.closed, ["new"]);
});

test("expired and revoked credentials pause dispatch with actionable errors", async (t) => {
  let revoked = false;
  const f = await fixture(t, async () => {
    if (revoked) throw Error("401");
    return { projects: [], nextCursor: null };
  });
  revoked = true;
  await assert.rejects(f.client.projects(), /Check authorization/);
  await assert.rejects(f.client.projects(), /Check authorization/);
  const expired = new T3Client({ ...old, expiresAt: 0 }, f.file, {
    async issue() {
      return replacement;
    },
    async revoke() {},
  });
  await assert.rejects(expired.open(), /expired.*Renew/);
  assert.equal(expired.status.paused, true);
});

test("reconnection preserves credential identity and uncertain outcomes", async (t) => {
  const f = await fixture(t, async (_session, tool) => {
    if (tool === "t3_thread_send") throw Error("lost");
    return { projects: [], nextCursor: null };
  });
  await assert.rejects(
    f.client.send(
      {
        threadId: "thread",
        message: "task",
        clientRequestId: "key",
      },
      "old",
    ),
  );
  await f.client.reconnect();
  assert.equal(f.client.credentialSessionId, "old");
  assert.equal(f.client.status.uncertain.length, 1);
  assert.equal(f.client.status.paused, true);
  assert.equal(f.issued.length, 0);
});

test("credential files reject repository paths and permissive files", async (t) => {
  const f = await fixture(t, async () => ({ projects: [], nextCursor: null }));
  const forbidden = new CredentialFile(
    join(f.directory, "inside.json"),
    f.directory,
  );
  await assert.rejects(forbidden.write(old), /outside the repository/);
  const { chmod } = await import("node:fs/promises");
  await chmod(f.file.path, 0o644);
  await assert.rejects(f.file.read(), /0600/);
  await chmod(f.file.path, 0o600);
  assert.equal(
    JSON.parse(await readFile(f.file.path, "utf8")).sessionId,
    "old",
  );
});

test("launch waits for a bound idle worktree and retains known ID if preparation fails", async (t) => {
  let reads = 0;
  let fail = false;
  const f = await fixture(t, async (_session, tool) => {
    if (tool === "t3_thread_launch")
      return { threadId: "known-thread", runId: null };
    if (tool === "t3_thread_read") {
      if (fail) throw Error("preparation connection lost");
      reads++;
      return {
        thread: {
          projectId: "project",
          branch: "branch",
          worktreePath: reads > 1 ? "/isolated/worktree" : null,
        },
      };
    }
    return { projects: [], nextCursor: null };
  });
  const input = {
    title: "session",
    projectId: "project",
    workspaceStrategy: {
      type: "worktree" as const,
      branch: "branch",
      baseRef: "main",
      startFromOrigin: false,
    },
    modelSelection: { instanceId: "codex", model: "selected" },
  };
  assert.equal((await f.client.launch(input)).threadId, "known-thread");
  assert.equal(reads, 2);
  fail = true;
  await assert.rejects(
    f.client.launch({ ...input, title: "another-session" }),
    /uncertain/,
  );
  assert.equal(f.client.status.uncertain[0]?.acceptedThreadId, "known-thread");
  assert.equal(f.client.status.paused, true);
});

test("delivery intent cannot cross credential namespaces between persistence and send", async (t) => {
  let sends = 0;
  const f = await fixture(t, async (_session, tool) => {
    if (tool === "t3_thread_send") sends++;
    return { projects: [], nextCursor: null };
  });
  const recordedSession = f.client.credentialSessionId;
  await f.client.renew();
  await assert.rejects(
    f.client.send(
      { threadId: "thread", message: "task", clientRequestId: "persisted-key" },
      recordedSession,
    ),
    /credential changed/,
  );
  assert.equal(sends, 0);
  assert.equal(f.client.status.uncertain.length, 0);
});

test("close waits for blocked renewal and closes its replacement before returning", async (t) => {
  const issuing = deferred();
  const release = deferred();
  const f = await fixture(t, async () => ({ projects: [], nextCursor: null }));
  f.authorization.issue = async () => {
    issuing.resolve();
    await release.promise;
    return replacement;
  };
  const renewal = f.client.renew();
  await issuing.promise;
  await assert.rejects(f.client.reconnect(), /handover is already running/);
  let shutdownFinished = false;
  const shutdown = f.client.close().then(() => { shutdownFinished = true; });
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(shutdownFinished, false);
  await assert.rejects(f.client.renew(), /closed/);
  release.resolve();
  await renewal;
  await shutdown;
  assert.deepEqual(f.closed, ["old", "new"]);
  assert.deepEqual(f.revoked, ["old"]);
  assert.equal((await f.file.read()).sessionId, "new");
  assert.equal(f.client.status.paused, true);
  assert.match(f.client.status.reason!, /closed/);
  await assert.rejects(f.client.open(), /closed/);
  await assert.rejects(f.client.reconnect(), /closed/);
  await assert.rejects(f.client.projects(), /disconnected/);
});

test("reconnect excludes renewal and shutdown drains its new transport", async (t) => {
  const verifying = deferred();
  const release = deferred();
  let projectReads = 0;
  const f = await fixture(t, async () => {
    if (++projectReads === 2) {
      verifying.resolve();
      await release.promise;
    }
    return { projects: [], nextCursor: null };
  });
  const reconnect = f.client.reconnect();
  await verifying.promise;
  await assert.rejects(f.client.renew(), /handover is already running/);
  await assert.rejects(f.client.reconnect(), /handover is already running/);
  assert.equal(f.issued.length, 0);
  let shutdownFinished = false;
  const shutdown = f.client.close().then(() => { shutdownFinished = true; });
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(shutdownFinished, false);
  release.resolve();
  await reconnect;
  await shutdown;
  assert.deepEqual(f.closed, ["old", "old"]);
  assert.equal(f.client.status.paused, true);
  assert.match(f.client.status.reason!, /closed/);
  await assert.rejects(f.client.reconnect(), /closed/);
});


test("renewal retains the valid old credential and preserves actionable authorization cleanup failures", async (t) => {
  const f = await fixture(t, async () => ({ projects: [], nextCursor: null }));
  const cleanup = new AuthorizationCleanupError("unique-client-label", "pairing-id", []);
  f.authorization.issue = async () => { throw cleanup; };
  await assert.rejects(f.client.renew(), (error: unknown) => {
    assert.equal(error, cleanup);
    return true;
  });
  assert.equal(f.client.credentialSessionId, "old");
  assert.equal((await f.file.read()).sessionId, "old");
  assert.equal(f.client.status.paused, false);
  await f.client.projects();
});
