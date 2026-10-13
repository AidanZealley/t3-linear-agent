import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Store } from "../../src/store/index.ts";
import { SessionService, type SessionT3, publicText } from "../../src/sessions/service.ts";
import type { AgentEvent } from "../../src/linear/events.ts";
import type { T3Tools } from "../../src/t3/contracts.ts";
import type { Report } from "../../src/sessions/types.ts";

const event = (id: string, action: "created" | "prompted" = "created", body = "", activityId = body, signal?: string): AgentEvent => ({
  type: "AgentSessionEvent", action, organizationId: "workspace", appUserId: "app", oauthClientId: "client", webhookTimestamp: Date.now(),
  agentSession: { id, issueId: id, appUserId: "app", organizationId: "workspace", issue: { identifier: `DEV-${id}` } },
  promptContext: "Investigate only. Do not edit, push or create a PR.",
  ...(action === "prompted" ? { agentActivity: { id: activityId, agentSessionId: id, content: { type: "prompt", body }, signal } } : {}),
});
class FakeT3 {
  credentialSessionId = "old";
  status = { paused: false, reason: undefined, uncertain: [], pendingRetirementSessionIds: [] };
  projectsList: T3Tools["t3_project_list"]["output"]["projects"] = [];
  states = new Map<string, T3Tools["t3_thread_read"]["output"]>();
  launched: string[] = [];
  selections: NonNullable<Parameters<SessionT3["launch"]>[0]["modelSelection"]>[] = [];
  sent: string[] = [];
  answers: Record<string, string>[] = [];
  cancelled: string[] = [];
  interrupted: string[] = [];
  lostLaunch = false;
  lostSend = false;
  missingSend = false;
  pending: string[] = [];
  queued: string[] = [];
  async projects() { return { projects: this.projectsList, nextCursor: null }; }
  async project(input: { projectId: string }) { const found = this.projectsList.find(p => p.id === input.projectId); if (!found) throw Error(); return found; }
  async capabilities(): Promise<T3Tools["orchestrator_capabilities"]["output"]> {
    return { features: {} as T3Tools["orchestrator_capabilities"]["output"]["features"], inheritedModel: null, inheritedProviderInstanceId: null, parentThreadId: null, interactionMode: "default", runtimeMode: "full-access", providers: [
      { providerInstanceId: "provider", driverKind: "codex", displayName: null, constraints: [], canRunChildTask: true, canRunCrossProviderChildTask: true, models: [{ id: "model", label: null }] },
      ...["codex", "claudeAgent"].map(providerInstanceId => ({ providerInstanceId, driverKind: providerInstanceId, displayName: null, constraints: [], canRunChildTask: true, canRunCrossProviderChildTask: true, models: (providerInstanceId === "codex" ? ["gpt-6-luna", "gpt-6.1-sol"] : ["claude-sonnet-5-5", "claude-opus-5-5"]).map(id => ({ id, label: null, options: [{ id: providerInstanceId === "codex" ? "reasoningEffort" : "effort", label: "Reasoning", type: "select" as const, options: ["low", "medium", "high"].map(id => ({ id, label: id })) }] })) })),
    ] };
  }
  async reconnect() { this.status.paused = false; }
  async renew() { throw Error("not used"); }
  async launch(input: Parameters<SessionT3["launch"]>[0]) {
    const threadId = `thread-${this.launched.length}`;
    this.launched.push(input.projectId);
    this.selections.push(input.modelSelection);
    const now = new Date().toISOString();
    this.states.set(threadId, { thread: { threadId, projectId: input.projectId, title: input.title, branch: input.workspaceStrategy.branch, worktreePath: "/worktree", createdAt: now, updatedAt: now, createdBy: "agent", creationSource: "mcp", archived: false, status: "idle", latestRunId: null, activeRunId: null, interactionMode: "default", itemCount: 0, linkedPullRequest: null, model: "model", providerInstanceId: "provider", pendingRequestCount: 0, parentThreadId: null, relationshipToParent: null, runCount: 0, runtimeMode: "full-access", settled: false, settledAt: null, titleRegeneration: null }, items: [], recentRuns: [], nextPosition: null, hasMore: false });
    if (this.lostLaunch) throw Error("lost launch response");
    return { threadId, projectId: input.projectId, modelSelection: input.modelSelection, runId: null, status: null };
  }
  async send(input: Parameters<SessionT3["send"]>[0]) {
    this.sent.push(input.message);
    const state = this.states.get(input.threadId)!;
    const runId = `run-${this.sent.length}`;
    const messageId = `message:mcp:${encodeURIComponent(`client:${this.credentialSessionId}`)}:thread-send:${encodeURIComponent(input.clientRequestId)}`;
    if (!this.missingSend) {
      state.items.push({ itemId: messageId, messageId, runId, position: state.items.length, type: "user_message", text: input.message, textTruncated: false, createdBy: "agent", creationSource: "mcp", sourceThreadId: input.threadId, status: "completed", title: null, updatedAt: new Date().toISOString(), visibility: "local" });
      state.recentRuns.unshift({ runId, status: "running", ordinal: this.sent.length, completedAt: null, startedAt: null, requestedAt: new Date().toISOString(), model: "model", providerInstanceId: "provider" });
      state.thread.activeRunId = runId;
    }
    if (this.lostSend) throw Error("lost send response");
    return { threadId: input.threadId, messageId, runId, status: "running" as const, delivery: "started" as const };
  }
  async readThread(input: T3Tools["t3_thread_read"]["input"]) {
    const state = this.states.get(input.threadId)!;
    return { ...state, items: state.items.filter(item => item.position > (input.afterPosition ?? -1)), nextPosition: state.items.at(-1)?.position ?? null };
  }
  async threads(input: T3Tools["t3_thread_list"]["input"]) { return { projectId: input.projectId!, currentThreadId: null, nextCursor: null, total: this.states.size, threads: Array.from(this.states.values()).map(s => ({ ...s.thread })) }; }
  async waitRun(input: T3Tools["t3_thread_wait"]["input"]) { return { threadId: input.threadId, runId: input.runId ?? null, status: this.states.get(input.threadId)!.recentRuns.find(r => r.runId === input.runId)!.status, timedOut: false }; }
  async queue() { return { items: this.queued.map(queuedRunId => ({ queuedRunId, text: "queued", truncated: false })), nextCursor: null }; }
  async cancelQueued(input: { queuedRunId: string }) { this.cancelled.push(input.queuedRunId); this.queued = this.queued.filter(id => id !== input.queuedRunId); return { sequence: 1 }; }
  async interrupt(input: { threadId: string; runId?: string | null }) { this.interrupted.push(input.runId!); const state = this.states.get(input.threadId)!; state.thread.activeRunId = null; state.recentRuns.find(r => r.runId === input.runId)!.status = "interrupted"; return { threadId: input.threadId, runId: input.runId ?? null, status: "interrupted" as const }; }
  async pendingRequests() { return { requestIds: this.pending }; }
  async pendingRequest(input: { requestId: string }) { return { requestId: input.requestId, questions: [{ id: "choice", header: "Choice", question: "Choose a word", options: [{ label: "blue", description: "Blue" }] }] }; }
  async answer(input: { answers: Record<string, string> }) { this.answers.push(input.answers); this.pending = []; return { sequence: 1 }; }
  finish(threadId: string, text = "Investigation complete. The answer is 42.") {
    const state = this.states.get(threadId)!;
    const run = state.recentRuns[0]!; run.status = "completed"; state.thread.activeRunId = null;
    state.items.push({ ...state.items[0]!, itemId: `final-${run.runId}`, messageId: `final-${run.runId}`, runId: run.runId, type: "assistant_message", creationSource: "provider", position: state.items.length, text });
  }
}
// The edge's initial worker is covered separately. Most lifecycle fixtures acknowledge immediately.
class AcknowledgedStore extends Store {
  receive(...arguments_: Parameters<Store["receive"]>) {
    const inserted = super.receive(...arguments_);
    for (const activity of this.dueActivities()) this.activitySent(activity.activityId);
    return inserted;
  }
}
async function fixture(t: test.TestContext) {
  const directory = await mkdtemp(join(tmpdir(), "linear-lifecycle-"));
  t.after(() => rm(directory, { force: true, recursive: true }));
  let store = new AcknowledgedStore(join(directory, "state.sqlite")); t.after(() => store.close());
  const t3 = new FakeT3();
  t3.projectsList = ["Alpha", "Beta"].map((title, index) => ({ id: `project-${index}`, title, workspaceRoot: directory, createdAt: "now", updatedAt: "now", deletedAt: null, defaultModelSelection: null, scripts: [] }));
  const names = new Map([["one", "Alpha"], ["two", "Beta"]]);
  const labels = new Map<string, string[]>();
  const delivered: Report[] = []; let failReport = false;
  const linear = { async issue(id: string) { return { identifier: id, projectName: names.get(id), labels: labels.get(id) }; }, async report(report: Report) { if (failReport) throw Error(); delivered.push({ ...report }); } };
  const config = { providerInstanceId: "provider", model: "model", maxActiveSessions: 1, projects: Object.fromEntries(t3.projectsList.map(p => [p.id, { repository: directory, baseRef: "main" }])) };
  const service = new SessionService(store, t3, linear, config, "full-access");
  return { get store() { return store; }, reopen() { store.close(); store = new AcknowledgedStore(join(directory, "state.sqlite")); }, t3, service, names, labels, delivered, linear, config, failReports(value: boolean) { failReport = value; } };
}

test("five sessions run across projects, retain capacity after restart and refill freed slots", async t => {
  const f = await fixture(t);
  f.config.maxActiveSessions = 5;
  for (let index = 0; index < 7; index++) {
    const id = `session-${index}`;
    f.names.set(id, index % 2 ? "Beta" : "Alpha");
    f.store.receive(id, event(id));
  }
  await Promise.all([f.service.tick(), f.service.tick()]);
  assert.deepEqual(f.t3.launched, ["project-0", "project-1", "project-0", "project-1", "project-0"]);
  assert.equal(f.store.sessions().filter(session => session.status === "active").length, 5);
  assert.equal(f.store.sessions().filter(session => session.status === "queued").length, 2);
  f.reopen();
  const restarted = new SessionService(f.store, f.t3, f.linear, f.config, "full-access");
  await restarted.tick();
  assert.equal(f.t3.launched.length, 5);
  f.t3.finish(f.store.sessions()[0]!.threadId!);
  await restarted.tick();
  assert.equal(f.t3.launched.length, 6);
  assert.equal(f.store.sessions().find(session => session.id === "session-5")!.status, "active");
  assert.equal(f.store.sessions().find(session => session.id === "session-6")!.status, "queued");
  f.config.maxActiveSessions = 2;
  await restarted.tick();
  assert.equal(f.t3.launched.length, 6);
  assert.equal(f.store.sessions().filter(session => session.status === "active").length, 5);
});

test("paused sessions reserve only their own slot and clarification does not consume capacity", async t => {
  const f = await fixture(t);
  f.config.maxActiveSessions = 2;
  f.names.delete("one");
  f.store.receive("one", event("one")); f.store.receive("two", event("two"));
  await f.service.tick();
  assert.equal(f.store.sessions().find(session => session.id === "one")!.status, "clarification");
  const paused = f.store.sessions().find(session => session.id === "two")!;
  paused.status = "paused"; f.store.saveSession(paused);
  for (const id of ["three", "four"]) {
    f.names.set(id, "Alpha"); f.store.receive(id, event(id));
  }
  await f.service.tick();
  assert.equal(f.t3.launched.length, 2);
  assert.equal(f.store.sessions().find(session => session.id === "three")!.status, "active");
  assert.equal(f.store.sessions().find(session => session.id === "four")!.status, "queued");
});

test("exact routing, global durable queue, rename and restart retain identity", async t => {
  const f = await fixture(t);
  f.store.receive("one", event("one")); f.store.receive("two", event("two"));
  await f.service.tick(); assert.deepEqual(f.t3.launched, ["project-0"]);
  assert.equal(f.store.sessions()[1]!.status, "queued");
  f.t3.projectsList[0]!.title = "Renamed"; f.names.set("one", "Renamed Linear");
  const original = f.store.sessions()[0]!.threadId!;
  f.store.receive("follow", event("one", "prompted", "Follow-up", "follow"));
  f.t3.finish(original);
  f.reopen();
  const restarted = new SessionService(f.store, f.t3, f.linear, f.config, "full-access");
  await restarted.tick(); assert.equal(f.t3.sent.at(-1), "Follow-up"); assert.equal(f.store.sessions()[0]!.threadId, original);
  f.t3.finish(original); await restarted.tick(); assert.deepEqual(f.t3.launched, ["project-0", "project-1"]);
});

test("missing, absent and duplicate project selection waits and correction resumes same session", async t => {
  const f = await fixture(t);
  f.names.delete("one"); f.store.receive("create", event("one")); await f.service.tick();
  assert.equal(f.store.sessions()[0]!.status, "clarification"); assert.equal(f.t3.launched.length, 0);
  f.names.set("one", "alpha"); f.store.receive("retry-1", event("one", "prompted", "Fixed", "retry-1")); await f.service.tick(); assert.equal(f.t3.launched.length, 0);
  f.names.set("one", "Alpha"); f.t3.projectsList.push({ ...f.t3.projectsList[0]!, id: "duplicate" });
  f.store.receive("retry-2", event("one", "prompted", "Fixed", "retry-2")); await f.service.tick(); assert.equal(f.t3.launched.length, 0);
  f.t3.projectsList.pop(); f.store.receive("retry-3", event("one", "prompted", "Fixed", "retry-3")); await f.service.tick();
  assert.deepEqual(f.t3.launched, ["project-0"]); assert.equal(f.store.sessions().length, 1);
});

test("duplicate deliveries and activities preserve thread and follow-up order", async t => {
  const f = await fixture(t);
  f.store.receive("create", event("one")); f.store.receive("different-created-id", event("one")); await f.service.tick();
  f.store.receive("a", event("one", "prompted", "First", "activity-1")); f.store.receive("duplicate-a", event("one", "prompted", "First", "activity-1"));
  f.store.receive("b", event("one", "prompted", "Second", "activity-2"));
  const threadId = f.store.sessions()[0]!.threadId!;
  f.t3.finish(threadId); await f.service.tick(); f.t3.finish(threadId); await f.service.tick();
  assert.equal(f.t3.launched.length, 1); assert.deepEqual(f.t3.sent.slice(1), ["First", "Second"]);
});

test("lost idle launch and send responses adopt exact durable identities without resending", async t => {
  const f = await fixture(t);
  f.t3.lostLaunch = true; f.store.receive("create", event("one")); await f.service.tick();
  f.t3.lostLaunch = false; f.t3.lostSend = true; await f.service.tick();
  assert.equal(f.t3.launched.length, 1); assert.equal(f.t3.sent.length, 1);
  f.t3.lostSend = false; await f.service.tick();
  assert.equal(f.t3.sent.length, 1); assert.equal(f.store.sessions()[0]!.runId, "run-1");
  assert.ok(f.store.intents().every(i => i.status === "confirmed"));
});

test("an absent uncertain send remains visibly paused and prevents new coding work", async t => {
  const f = await fixture(t); f.t3.lostSend = true; f.t3.missingSend = true;
  f.store.receive("one", event("one")); f.store.receive("two", event("two")); await f.service.tick(); await f.service.tick();
  assert.equal(f.store.sessions()[0]!.status, "paused"); assert.equal(f.t3.launched.length, 1); assert.equal(f.t3.sent.length, 1);
  assert.ok(f.delivered.some(r => r.type === "error" && r.body.includes("ambiguous")));
});

test("pending native questions receive answers on the original thread", async t => {
  const f = await fixture(t); f.store.receive("one", event("one")); await f.service.tick();
  f.t3.pending = ["request-1"]; await f.service.tick();
  assert.ok(f.delivered.some(r => r.type === "elicitation"));
  f.store.receive("answer", event("one", "prompted", "blue", "answer")); await f.service.tick();
  assert.deepEqual(f.t3.answers, [{ choice: "blue" }]); assert.equal(f.t3.sent.length, 1);
});

test("Linear stop cancels the queue, interrupts the active ID and requires explicit resume", async t => {
  const f = await fixture(t); f.store.receive("one", event("one")); f.store.receive("two", event("two")); await f.service.tick();
  f.t3.queued = ["queued-other", "queued-last"];
  f.store.receive("stop-one", event("one", "prompted", "", "stop-one", "stop"));
  f.store.receive("stop-two", event("two", "prompted", "stop", "stop-two")); await f.service.tick();
  assert.deepEqual(f.t3.cancelled, ["queued-other", "queued-last"]); assert.deepEqual(f.t3.interrupted, ["run-1"]);
  f.store.receive("late", event("one", "prompted", "keep going", "late")); await f.service.tick(); assert.equal(f.t3.sent.length, 1); assert.equal(f.t3.launched.length, 1);
  f.store.receive("resume", event("one", "prompted", "/resume Investigate again", "resume")); await f.service.tick();
  assert.equal(f.t3.launched.length, 1); assert.equal(f.t3.sent.at(-1), "Investigate again");
});

test("final report retries retain the original UUID and never repeat coding", async t => {
  const f = await fixture(t); f.store.receive("one", event("one")); await f.service.tick();
  f.failReports(true); f.t3.finish(f.store.sessions()[0]!.threadId!, "Answer 42.\n```sh\nsecret command logs\n```\nBearer test-token"); await f.service.tick();
  const report = f.store.reports().find(r => r.type === "response")!;
  assert.equal(f.store.sessions()[0]!.status, "completed"); assert.equal(report.attempts, 1);
  f.failReports(false); await f.service.flushReports(Date.now() + 2000);
  assert.equal(f.delivered.at(-1)!.id, report.id); assert.equal(f.t3.sent.length, 1);
  assert.ok(!f.delivered.at(-1)!.body.includes("test-token")); assert.ok(!publicText("```raw logs``` token=abc").includes("raw logs"));
});

test("unavailable selected project does not reroute follow-up work", async t => {
  const f = await fixture(t); f.store.receive("one", event("one")); await f.service.tick();
  f.t3.finish(f.store.sessions()[0]!.threadId!); await f.service.tick();
  f.t3.projectsList.shift(); f.names.set("one", "Beta"); f.store.receive("follow", event("one", "prompted", "Continue", "follow")); await f.service.tick();
  assert.equal(f.store.sessions()[0]!.status, "failed"); assert.equal(f.store.sessions()[0]!.projectId, "project-0"); assert.equal(f.t3.sent.length, 1);
});

test("report retries keep public activity order within a session", async t => {
  const f = await fixture(t); f.failReports(true);
  f.store.receive("one", event("one")); await f.service.tick();
  f.t3.finish(f.store.sessions()[0]!.threadId!); await f.service.tick();
  assert.deepEqual(f.store.reports().map(r => r.status), ["pending", "pending"]);
  f.failReports(false); await f.service.flushReports(Date.now() + 2000);
  assert.deepEqual(f.delivered.map(r => r.type), ["thought"]);
  await f.service.flushReports(Date.now() + 2000);
  assert.deepEqual(f.delivered.map(r => r.type), ["thought", "response"]);
  assert.equal(f.t3.sent.length, 1);
});

test("an interrupted T3 run cannot be restarted by already pending follow-ups", async t => {
  const f = await fixture(t); f.store.receive("one", event("one")); await f.service.tick();
  f.store.receive("follow", event("one", "prompted", "Continue later", "follow"));
  const session = f.store.sessions()[0]!;
  await f.t3.interrupt({ threadId: session.threadId!, runId: session.runId! });
  await f.service.tick(); await f.service.tick();
  assert.equal(f.store.sessions()[0]!.status, "stopped"); assert.equal(f.store.sessions()[0]!.inputs.length, 0);
  assert.equal(f.t3.sent.length, 1);
});

test("lifecycle reports wait for initial acknowledgement without holding coding work", async t => {
  const f = await fixture(t);
  const store = new Store(join(f.config.projects["project-0"]!.repository, "ack-order.sqlite"));
  t.after(() => store.close());
  const service = new SessionService(store, f.t3, f.linear, f.config, "full-access");
  store.receive("one", event("one")); await service.tick();
  assert.equal(f.t3.sent.length, 1); assert.equal(f.delivered.length, 0);
  f.t3.finish(store.sessions()[0]!.threadId!); await service.tick();
  assert.equal(store.sessions()[0]!.status, "completed"); assert.equal(f.delivered.length, 0);
  store.activitySent(store.dueActivities()[0]!.activityId);
  await service.flushReports(); await service.flushReports();
  assert.deepEqual(f.delivered.map(r => r.type), ["thought", "response"]);
  assert.equal(f.t3.sent.length, 1);
});

test("completed follow-ups and stopped resumes check the retained thread before sending", async t => {
  const cases: Array<{ stopped: boolean; changed: Partial<T3Tools["t3_thread_read"]["output"]["thread"]> }> = [
    { stopped: false, changed: { projectId: "other-project" } },
    { stopped: false, changed: { branch: "other-branch" } },
    { stopped: true, changed: { worktreePath: null } },
  ];
  for (const scenario of cases) {
    const f = await fixture(t); f.store.receive("one", event("one")); await f.service.tick();
    const original = f.store.sessions()[0]!;
    if (scenario.stopped) f.store.receive("stop", event("one", "prompted", "/stop", "stop"));
    else f.t3.finish(original.threadId!);
    await f.service.tick();
    Object.assign(f.t3.states.get(original.threadId!)!.thread, scenario.changed);
    const instructions = "Implement the requested change";
    f.store.receive("follow", event("one", "prompted", scenario.stopped ? `/resume ${instructions}` : instructions, "follow"));
    await f.service.tick();
    const retained = f.store.sessions()[0]!;
    assert.equal(retained.status, "paused");
    assert.deepEqual(retained.inputs, [{ key: "follow", text: instructions }]);
    assert.equal(retained.projectId, original.projectId); assert.equal(retained.threadId, original.threadId);
    assert.equal(f.t3.sent.length, 1); assert.equal(f.t3.launched.length, 1);
    assert.equal(f.store.intents().filter(i => i.tool === "t3_thread_send").length, 1);
    assert.ok(f.delivered.some(report => report.type === "error" && report.body.includes("workspace binding")));
  }
});

test("restart after the final-report commit continues pending input without releasing the coding slot", async t => {
  const f = await fixture(t);
  f.store.receive("one", event("one")); f.store.receive("two", event("two")); await f.service.tick();
  const original = f.store.sessions()[0]!;
  f.store.receive("follow", event("one", "prompted", "Continue the investigation", "follow"));
  f.t3.finish(original.threadId!, "First investigation complete");
  const transaction = f.store.transaction.bind(f.store);
  let crashed = false;
  f.store.transaction = <T>(update: () => T): T => {
    const result = transaction(update);
    if (!crashed && f.store.reports().some(report => report.type === "response")) {
      crashed = true;
      throw new Error("Simulated crash after committing the final report, before next-send intent");
    }
    return result;
  };
  await f.service.tick();
  assert.equal(crashed, true); assert.equal(f.t3.sent.length, 1);
  const saved = f.store.sessions()[0]!;
  assert.equal(saved.status, "active"); assert.equal(saved.runId, undefined);
  assert.deepEqual(saved.inputs, [{ key: "follow", text: "Continue the investigation" }]);
  const finalReport = f.store.reports().find(report => report.type === "response")!;
  f.reopen();
  const restarted = new SessionService(f.store, f.t3, f.linear, f.config, "full-access");
  await restarted.tick(); await restarted.tick();
  assert.deepEqual(f.t3.sent.slice(1), ["Continue the investigation"]);
  assert.equal(f.t3.launched.length, 1); assert.equal(f.store.sessions()[1]!.status, "queued");
  assert.equal(f.store.sessions()[0]!.threadId, original.threadId);
  assert.equal(f.store.reports().filter(report => report.type === "response").length, 1);
  assert.equal(f.store.reports().find(report => report.type === "response")!.id, finalReport.id);
  assert.equal(f.delivered.filter(report => report.id === finalReport.id).length, 1);
  f.t3.finish(original.threadId!); await restarted.tick();
  assert.deepEqual(f.t3.launched, ["project-0", "project-1"]);
});


test("ticket labels select reasoning, persist through restart and ignore follow-up label changes", async t => {
  const f = await fixture(t);
  f.labels.set("one", ["harness:claude-code", "difficulty:high"]);
  f.store.receive("one", event("one"));
  await f.service.tick();
  const selected = { instanceId: "claudeAgent", model: "claude-opus-5-5", options: { effort: "high" } };
  assert.deepEqual(f.t3.selections, [selected]);
  assert.deepEqual(f.store.sessions()[0]!.modelSelection, selected);
  assert.ok(f.delivered.some(r => r.body.includes("claude-opus-5-5 with high reasoning")));
  f.labels.set("one", ["harness:codex", "difficulty:low"]);
  f.t3.finish(f.store.sessions()[0]!.threadId!);
  f.reopen();
  f.store.receive("follow", event("one", "prompted", "Continue", "follow"));
  await new SessionService(f.store, f.t3, f.linear, f.config, "full-access").tick();
  assert.deepEqual(f.t3.selections, [selected]);
  assert.deepEqual(f.store.sessions()[0]!.modelSelection, selected);
  assert.equal(f.t3.sent.at(-1), "Continue");
});

test("conflicting routing labels wait without launch and correction retries the pinned project", async t => {
  const f = await fixture(t);
  f.labels.set("one", ["harness:claude-code", "harness:codex"]);
  f.store.receive("one", event("one")); await f.service.tick();
  assert.equal(f.store.sessions()[0]!.status, "clarification");
  assert.equal(f.t3.launched.length, 0);
  f.labels.set("one", ["harness:codex", "difficulty:low"]);
  f.store.receive("fixed", event("one", "prompted", "Fixed", "fixed")); await f.service.tick();
  assert.deepEqual(f.t3.selections, [{ instanceId: "codex", model: "gpt-6-luna", options: { reasoningEffort: "low" } }]);
});

test("unavailable routing selection prevents launch and remains pinned", async t => {
  const f = await fixture(t);
  f.labels.set("one", ["harness:claude-code"]);
  const capabilities = f.t3.capabilities.bind(f.t3);
  f.t3.capabilities = async () => ({ ...await capabilities(), providers: [] });
  f.store.receive("one", event("one")); await f.service.tick();
  assert.equal(f.store.sessions()[0]!.status, "failed");
  assert.equal(f.t3.launched.length, 0);
  f.labels.set("one", ["harness:codex"]);
  f.t3.capabilities = capabilities;
  f.store.receive("retry", event("one", "prompted", "Retry", "retry")); await f.service.tick();
  assert.equal(f.t3.selections[0]!.model, "claude-opus-5-5");
});
