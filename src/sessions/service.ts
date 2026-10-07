import { randomUUID } from "node:crypto";
import { realpathSync } from "node:fs";
import type { Store, Receipt } from "../store/index.ts";
import type { T3Client, ReconciliationReads, UncertainOperation } from "../t3/client.ts";
import type { RuntimeMode, T3Tools } from "../t3/contracts.ts";
import type { ServiceConfig } from "./config.ts";
import type { Session, Intent, Report, IssueContext } from "./types.ts";

export type SessionT3 = Pick<T3Client, "projects" | "project" | "capabilities" | "waitRun" | "launch" | "send" | "readThread" | "threads" | "queue" | "cancelQueued" | "interrupt" | "pendingRequests" | "pendingRequest" | "answer" | "credentialSessionId" | "status" | "reconnect" | "renew">;
export type SessionLinear = {
  issue(id: string): Promise<IssueContext>;
  report(report: Report): Promise<void>;
};
const terminal = new Set(["completed", "failed", "cancelled", "interrupted", "rolled_back"]);
const stopText = /^(?:\/stop|(?:please\s+)?(?:stop|cancel))(?:\s+(?:now|(?:this|the)\s+(?:task|run|session|work)|working|work))?[.!]?$/i;
const resumeText = /^\/resume(?:\s+([\s\S]+))?$/i;
const branchName = (identifier: string, sessionId: string) => `linear/${identifier.toLowerCase().replace(/[^a-z0-9-]/g, "-")}-${sessionId.replace(/[^a-zA-Z0-9-]/g, "-")}`;

export class SessionService {
  private flight?: Promise<void>;
  private timer?: ReturnType<typeof setInterval>;
  private reporting = new Map<string, Promise<void>>();
  private closed = false;
  private store: Store;
  private t3: SessionT3;
  private linear: SessionLinear;
  private config: ServiceConfig;
  private runtimeMode: RuntimeMode;
  constructor(store: Store, t3: SessionT3, linear: SessionLinear, config: ServiceConfig, runtimeMode: RuntimeMode) {
    this.store = store; this.t3 = t3; this.linear = linear; this.config = config; this.runtimeMode = runtimeMode;
  }

  // Only one lifecycle pass runs at a time. Receipt and initial acknowledgement remain independent.
  tick() {
    if (this.closed) return Promise.resolve();
    this.flight ??= this.pass().finally(() => { this.flight = undefined; });
    return this.flight;
  }
  start() { this.timer ??= setInterval(() => { void this.tick().catch(() => {}); }, 1000); void this.tick().catch(() => {}); }
  async stop() { this.closed = true; clearInterval(this.timer); await this.flight?.catch(() => {}); await Promise.all(this.reporting.values()); }
  private report(session: Session, type: Report["type"], body: string, url?: string) {
    this.store.transaction(() => {
      this.store.saveReport({ id: randomUUID(), sessionId: session.id, type, body: publicText(body), ...(url ? { url } : {}), attempts: 0, nextAt: 0, status: "pending" });
      session.lastReportAt = Date.now();
      this.store.saveSession(session);
    });
  }
  private pause(session: Session, problem: string) {
    if (session.status !== "stopped") session.status = "paused";
    const changed = session.problem !== problem;
    session.problem = problem;
    if (changed) this.report(session, "error", problem);
    this.store.saveSession(session);
  }
  private ingest(receipt: Receipt) {
    const event = receipt.event;
    let session = this.store.sessions().find(item => item.id === event.agentSession.id);
    if (!session && event.action !== "created") return;
    this.store.transaction(() => {
      if (!session) {
        const identifier = typeof event.agentSession.issue?.identifier === "string" ? event.agentSession.issue.identifier : "Linear";
        session = {
          id: event.agentSession.id, issueId: event.agentSession.issueId ?? undefined,
          title: `${identifier} [Linear ${event.agentSession.id}]`,
          branch: branchName(identifier, event.agentSession.id),
          order: receipt.sequence, status: "queued", inputs: [{ key: `created:${event.agentSession.id}`, text: this.prompt(event) }], seen: [], cursor: -1, lastReportAt: 0,
        };
      }
      if (event.action === "prompted") {
        const activity = event.agentActivity;
        const key = activity?.id ?? receipt.deliveryId;
        if (!session.seen.includes(key)) {
          session.seen.push(key);
          const text = typeof activity?.content.body === "string" ? activity.content.body.trim() : "";
          if (activity?.signal === "stop" || stopText.test(text)) {
            session.status = "stopped"; session.inputs = []; session.stopPending = true;
          } else if (session.status === "stopped") {
            const resume = text.match(resumeText);
            if (resume && !session.stopPending) {
              session.status = "queued"; session.order = receipt.sequence;
              session.inputs.push({ key, text: resume[1] ?? "Explicitly resume the stopped task. Inspect existing work before continuing." });
            }
          } else if (text) {
            session.inputs.push({ key, text });
            if (["clarification", "completed", "failed"].includes(session.status)) { session.status = "queued"; session.order = receipt.sequence; }
          }
        }
      }
      this.store.saveSession(session);
      this.store.consumeEvent(receipt.sequence);
    });
  }
  private prompt(event: Receipt["event"]) {
    return `Linear agent session ${event.agentSession.id}, issue ${event.agentSession.issueId ?? "unknown"}.\n${event.promptContext ?? ""}\nGuidance: ${JSON.stringify(event.guidance ?? [])}\nFollow repository instructions. A question authorizes investigation and an answer, not edits. For an implementation request, run appropriate checks and return a concise summary, checks, limitations and the PR URL. Never merge, deploy or access production. Permission approvals stay in T3.`;
  }
  private async pass() {
    for (const receipt of this.store.pendingEvents()) this.ingest(receipt);
    try {
      if (this.t3.status.paused) {
        // Renewal owns the supported reconciliation read connection while dispatch is paused.
        if (this.t3.status.uncertain.length) await this.t3.renew(this.reconcile);
        else await this.t3.reconnect();
      }
      const unresolved = this.store.intents().filter(item => item.status !== "confirmed");
      if (unresolved.length) await this.reconcile(unresolved, this.t3);
      // Restore unfinished threads before selecting new work, including cancellation after a crash.
      for (const session of this.store.sessions().filter(item => item.threadId || item.stopPending)) {
        if (session.stopPending) await this.stopSession(session);
        else if (session.status === "active") await this.observe(session);
      }
      const blocked = this.store.sessions().some(item => item.status === "active" || item.status === "paused" || item.stopPending);
      if (!blocked && !this.t3.status.paused) {
        const next = this.store.sessions().find(item => item.status === "queued");
        if (next) await this.dispatch(next);
      }
    } catch {
      // Raw transport/provider errors can contain credentials or command output.
      for (const session of this.store.sessions().filter(item => item.status === "active" || item.stopPending)) {
        if (!session.problem) { session.problem = "T3 is unavailable. Delivery is retained for reconciliation; no coding work will be resent."; this.report(session, "error", session.problem); }
      }
    }
    await this.flushReports();
  }
  private async select(session: Session) {
    if (!session.projectId) {
      const issue = session.issueId ? await this.linear.issue(session.issueId) : undefined;
      if (issue) { session.title = `${issue.identifier} [Linear ${session.id}]`; session.branch = branchName(issue.identifier, session.id); }
      const projects: T3Tools["t3_project_list"]["output"]["projects"] = [];
      let cursor: number | null = null;
      do { const page = await this.t3.projects({ ...(cursor === null ? {} : { cursor }), limit: 100 }); projects.push(...page.projects); cursor = page.nextCursor; } while (cursor !== null);
      const matches = projects.filter(item => !item.deletedAt && issue?.projectName && item.title === issue.projectName);
      if (matches.length !== 1) {
        session.status = "clarification";
        this.report(session, "elicitation", "Set the issue's Linear project to exactly one local T3 project name, then reply here. No coding thread has started.");
        return false;
      }
      session.projectId = matches[0]!.id;
      this.store.saveSession(session);
    }
    let project: T3Tools["t3_project_read"]["output"];
    try { project = await this.t3.project({ projectId: session.projectId }); }
    catch {
      session.status = "failed";
      this.report(session, "error", "The selected T3 project could not be read. Restore access and reply here; this session will not switch repositories.");
      return false;
    }
    const configured = this.config.projects[session.projectId];
    let repositoryMatches = false;
    try { if (configured) repositoryMatches = realpathSync(project.workspaceRoot) === realpathSync(configured.repository); } catch { repositoryMatches = false; }
    if (project.deletedAt || !repositoryMatches) {
      session.status = "failed";
      this.report(session, "error", "The selected T3 project is unavailable or its repository is not configured. Restore that project; this session will not switch repositories.");
      return false;
    }
    return true;
  }
  private async dispatch(session: Session) {
    if (!await this.select(session)) return;
    session.status = "active"; session.problem = undefined; this.store.saveSession(session);
    if (!session.threadId) {
      const project = this.config.projects[session.projectId!]!;
      const input = {
        title: session.title, projectId: session.projectId!,
        workspaceStrategy: { type: "worktree" as const, baseRef: project.baseRef, branch: session.branch, startFromOrigin: false },
        modelSelection: { instanceId: this.config.providerInstanceId, model: this.config.model }, runtimeMode: this.runtimeMode,
      };
      const intent = this.intent(session, "t3_thread_launch", input);
      const result = await this.t3.launch(input);
      session.threadId = result.threadId;
      this.confirm(intent, session, { threadId: result.threadId });
    }
    if (session.inputs.length && !session.runId) await this.sendNext(session);
  }
  private intent(session: Session, tool: Intent["tool"], input: Record<string, unknown>): Intent {
    const intent: Intent = { id: randomUUID(), tool, input, credentialSessionId: this.t3.credentialSessionId, sessionId: session.id, status: "pending" };
    this.store.transaction(() => { this.store.saveIntent(intent); this.store.saveSession(session); });
    return intent;
  }
  private confirm(intent: Intent, session: Session, result: Intent["result"]) {
    const { threadId, messageId, runId, sequence } = result ?? {};
    intent.status = "confirmed"; intent.result = { threadId, messageId, runId, sequence };
    this.store.transaction(() => { this.store.saveIntent(intent); this.store.saveSession(session); });
  }
  private async sendNext(session: Session) {
    const state = await this.t3.readThread({ threadId: session.threadId! });
    if (!this.validateThreadBinding(session, state.thread)) return;
    const next = session.inputs.shift()!;
    const input = { threadId: session.threadId!, message: next.text, clientRequestId: `${session.id}:${next.key}`, mode: "auto" as const };
    const intent = this.intent(session, "t3_thread_send", input);
    const result = await this.t3.send(input, intent.credentialSessionId);
    session.runId = result.runId;
    this.confirm(intent, session, result);
    this.report(session, "thought", "T3 is working in the selected project's managed worktree.");
  }
  private validateThreadBinding(session: Session, thread: T3Tools["t3_thread_read"]["output"]["thread"]) {
    if (thread.projectId === session.projectId && thread.branch === session.branch && thread.worktreePath) return true;
    this.pause(session, "T3 thread workspace binding does not match the selected project. Operator reconciliation is required.");
    return false;
  }
  private async stopSession(session: Session) {
    if (session.threadId) {
      let cursor: number | null = null;
      const queuedRuns: string[] = [];
      do {
        const page = await this.t3.queue({ threadId: session.threadId, ...(cursor === null ? {} : { cursor }), limit: 100 });
        queuedRuns.push(...page.items.map(item => item.queuedRunId));
        cursor = page.nextCursor;
      } while (cursor !== null);
      for (const queuedRunId of queuedRuns) {
        const input = { threadId: session.threadId, queuedRunId };
        const intent = this.intent(session, "t3_queue_cancel", input);
        this.confirm(intent, session, await this.t3.cancelQueued(input));
      }
      const state = await this.t3.readThread({ threadId: session.threadId });
      const runId = state.thread.activeRunId;
      if (runId) {
        // The actual active ID is read once and pinned; latestRunId can name a cancelled queued run.
        const input = { threadId: session.threadId, runId, clientRequestId: `stop:${session.id}:${runId}`, reason: "Stopped from Linear" };
        const intent = this.intent(session, "t3_thread_interrupt", input);
        const result = await this.t3.interrupt(input);
        this.confirm(intent, session, { threadId: result.threadId, runId: result.runId ?? undefined });
        const after = await this.t3.readThread({ threadId: session.threadId });
        if (after.thread.activeRunId === runId) return;
      }
    }
    session.stopPending = false; session.runId = undefined; session.question = undefined;
    this.report(session, "response", "Stopped. Pending messages were cancelled. The T3 worktree is retained for inspection. Reply /resume to continue explicitly.");
  }
  private async observe(session: Session) {
    if (!session.threadId) return;
    const state = await this.t3.readThread({ threadId: session.threadId, ...(session.cursor < 0 ? {} : { afterPosition: session.cursor }), limit: 100, runLimit: 50, maxCharsPerItem: 20000 });
    if (!this.validateThreadBinding(session, state.thread)) return;
    if (!session.runId && session.inputs.length) { await this.sendNext(session); return; }
    const pending = await this.t3.pendingRequests({ threadId: session.threadId });
    if (pending.requestIds.length) {
      const requestId = pending.requestIds[0]!;
      if (session.question?.requestId !== requestId) {
        const request = await this.t3.pendingRequest({ threadId: session.threadId, requestId });
        session.question = request;
        this.report(session, "elicitation", request.questions.map(q => `${q.id}: ${q.question}\n${q.options.map(o => o.label).join(" / ")}`).join("\n\n") + (request.questions.length > 1 ? '\nReply with a JSON object mapping each question ID to a string answer.' : "\nReply here with your answer. Permission approvals must be handled in T3."));
      }
      if (session.inputs.length) await this.answerNext(session);
    } else session.question = undefined;
    const run = state.recentRuns.find(item => item.runId === session.runId) ?? (session.runId ? await this.t3.waitRun({ threadId: session.threadId, runId: session.runId, timeoutMs: 1 }) : undefined);
    if (session.question) {
      if (Date.now() - session.lastReportAt >= 10 * 60_000) this.report(session, "elicitation", "T3 is waiting for your answer. Reply to the question above.");
      this.store.saveSession(session); return;
    }
    if (run && terminal.has(run.status)) {
      if (run.status === "completed") {
        // Agent output is forwarded only after the pinned durable run confirms completion.
        let page = state;
        const items = [...state.items];
        while (page.hasMore && page.nextPosition !== null) {
          page = await this.t3.readThread({ threadId: session.threadId, afterPosition: page.nextPosition, limit: 100, maxCharsPerItem: 20000 });
          items.push(...page.items);
        }
        const messages = items.filter(item => item.runId === run.runId && item.type === "assistant_message" && item.creationSource === "provider");
        if (messages.at(-1)?.textTruncated) { this.pause(session, "T3's final response exceeds the readable report limit. Inspect the thread; no success has been reported."); return; }
        const final = messages.at(-1)?.text;
        if (!final) { this.pause(session, "T3 completed without a readable final response. Inspect the thread; no success has been reported."); return; }
        const url = state.thread.linkedPullRequest?.url ?? final.match(/https:\/\/github\.com\/[^\s/]+\/[^\s/]+\/pull\/\d+/)?.[0];
        // Persist the occupied slot with pending input in the final-report transaction.
        // Restart then sends that input instead of replaying this finished run.
        session.status = session.inputs.length ? "active" : "completed";
        session.runId = undefined; session.question = undefined;
        session.cursor = page.nextPosition ?? session.cursor;
        this.report(session, "response", publicText(final), url);
      } else if (run.status === "interrupted" || run.status === "cancelled") {
        session.status = "stopped"; session.inputs = []; session.stopPending = true;
      } else { session.status = "failed"; session.runId = undefined; session.question = undefined; this.report(session, "error", `T3 run ${run.status}. Inspect the retained T3 thread and reply here when ready to continue.`); }
      session.runId = undefined; session.question = undefined;
      if (session.status === "active" && session.inputs.length) await this.sendNext(session);
    } else if (Date.now() - session.lastReportAt >= 10 * 60_000) {
      this.report(session, "thought", "T3 is still working. Permission approvals, if needed, remain in T3.");
    }
    // Preserve final messages until the run ends. Advancing through an active message would lose its later text.
    this.store.saveSession(session);
  }
  private async answerNext(session: Session) {
    const question = session.question!;
    const next = session.inputs[0]!;
    let answers: Record<string, string>;
    if (question.questions.length === 1) answers = { [question.questions[0]!.id]: next.text };
    else {
      try {
        const parsed: unknown = JSON.parse(next.text);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) || question.questions.some(q => typeof (parsed as Record<string, unknown>)[q.id] !== "string")) throw new Error();
        answers = Object.fromEntries(question.questions.map(q => [q.id, (parsed as Record<string, string>)[q.id]!]));
      } catch {
        session.inputs.shift(); this.report(session, "elicitation", "Please reply with a JSON object mapping each question ID to a string answer."); return;
      }
    }
    session.inputs.shift();
    const input = { threadId: session.threadId!, requestId: question.requestId, answers };
    const intent = this.intent(session, "t3_pending_request_respond", input);
    this.confirm(intent, session, await this.t3.answer(input));
    session.question = undefined; this.store.saveSession(session);
  }

  reconcile = async (operations: readonly UncertainOperation[], reads: ReconciliationReads): Promise<string[]> => {
    const resolved: string[] = [];
    for (const operation of operations) {
      const intent = this.store.intents().find(item => item.status !== "confirmed" && item.tool === operation.tool && JSON.stringify(item.input) === JSON.stringify(operation.input));
      if (!intent) continue;
      const session = this.store.sessions().find(item => item.id === intent.sessionId)!;
      let result: Intent["result"];
      if (intent.tool === "t3_thread_launch") {
        const candidates: string[] = [];
        let cursor: number | null = null;
        do {
          const page = await reads.threads({ projectId: session.projectId, titleContains: session.title, ...(cursor === null ? {} : { cursor }), limit: 100 });
          candidates.push(...page.threads.filter(item => item.title === session.title && item.projectId === session.projectId).map(item => item.threadId));
          cursor = page.nextCursor;
        } while (cursor !== null);
        if (candidates.length === 1) {
          const state = await reads.readThread({ threadId: candidates[0]! });
          if (state.thread.projectId === session.projectId && state.thread.branch === session.branch && state.thread.worktreePath) { session.threadId = state.thread.threadId; result = { threadId: session.threadId }; }
        }
      } else if (session.threadId && intent.tool === "t3_thread_send") {
        const matches: T3Tools["t3_thread_read"]["output"]["items"] = [];
        let position = -1;
        let more = true;
        while (more) {
          const page = await reads.readThread({ threadId: session.threadId, ...(position < 0 ? {} : { afterPosition: position }), limit: 100, maxCharsPerItem: 50000 });
          const expectedId = `message:mcp:${encodeURIComponent(`client:${intent.credentialSessionId}`)}:thread-send:${encodeURIComponent(String(intent.input.clientRequestId))}`;
          matches.push(...page.items.filter(item => item.type === "user_message" && item.creationSource === "mcp" && item.messageId === expectedId && !item.textTruncated && item.text === intent.input.message));
          more = page.hasMore; position = page.nextPosition ?? position;
          if (more && !page.nextPosition) break;
        }
        // T3 encodes the OAuth namespace and request key in its durable message ID.
        const known = this.store.intents().filter(item => item.status === "confirmed" && item.tool === "t3_thread_send").map(item => item.result?.messageId);
        const fresh = matches.filter(item => item.messageId && item.runId && !known.includes(item.messageId));
        if (fresh.length === 1) { session.runId = fresh[0]!.runId!; result = { threadId: session.threadId, messageId: fresh[0]!.messageId!, runId: session.runId }; }
      } else if (session.threadId && intent.tool === "t3_pending_request_respond") {
        if (!(await reads.pendingRequests({ threadId: session.threadId })).requestIds.includes(String(intent.input.requestId))) result = {};
      } else if (session.threadId && intent.tool === "t3_queue_cancel") {
        let cursor: number | null = null; let found = false;
        do { const page = await reads.queue({ threadId: session.threadId, ...(cursor === null ? {} : { cursor }), limit: 100 }); found ||= page.items.some(item => item.queuedRunId === intent.input.queuedRunId); cursor = page.nextCursor; } while (cursor !== null);
        if (!found) result = {};
      } else if (session.threadId && intent.tool === "t3_thread_interrupt") {
        const state = await reads.waitRun({ threadId: session.threadId, runId: String(intent.input.runId), timeoutMs: 1 });
        if (terminal.has(state.status)) result = {};
      }
      if (result) {
        if (session.status === "paused") { session.status = "active"; session.problem = undefined; }
        this.confirm(intent, session, result); resolved.push(operation.id);
      } else {
        intent.status = "paused"; this.store.saveIntent(intent);
        this.pause(session, "A T3 delivery is ambiguous. Dispatch is paused. Inspect durable thread/message IDs and reconcile the stored intent before continuing; do not resend it.");
      }
    }
    return resolved;
  };
  async flushReports(now = Date.now()) {
    const sessions = new Set<string>();
    for (const report of this.store.reports().filter(item => item.status !== "sent")) {
      // Keep public activities in order. A later response must not be followed by an older thought retry.
      if (sessions.has(report.sessionId)) continue;
      sessions.add(report.sessionId);
      const initialStatus = this.store.initialActivityStatus(report.sessionId);
      if (initialStatus && initialStatus !== "sent") continue;
      if (report.status !== "pending" || report.nextAt > now || this.reporting.has(report.id)) continue;
      const pending = (async () => {
        try { await this.linear.report(report); report.status = "sent"; }
        catch { report.attempts++; report.nextAt = now + Math.min(60_000, 1000 * 2 ** (report.attempts - 1)); if (report.attempts >= 6) report.status = "failed"; }
        this.store.saveReport(report);
      })().finally(() => { this.reporting.delete(report.id); });
      this.reporting.set(report.id, pending);
    }
    await Promise.all(this.reporting.values());
  }
}

// Final responses and questions are public output. Never copy reasoning/activity/command items.
export function publicText(text: string) {
  return text.replace(/```[\s\S]*?```/g, "[Command/code details are available in T3.]")
    .replace(/\b(?:sk-[A-Za-z0-9_-]{12,}|Bearer\s+[A-Za-z0-9._-]+|(?:token|password|secret|api[_-]?key)\s*[:=]\s*\S+)/gi, "[redacted]").slice(0, 12000);
}
