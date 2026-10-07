import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHmac, randomUUID } from "node:crypto";
import { get } from "node:http";
import { Store, type Installation } from "../../src/store/index.ts";
import { Linear } from "../../src/linear/client.ts";
import { verifyEvent, type AgentEvent } from "../../src/linear/events.ts";
import { InitialActivityWorker } from "../../src/linear/worker.ts";
import { bridgeServer } from "../../src/http.ts";

const secret = "synthetic-signing-key";
const config = { clientId: "client", clientSecret: "synthetic-client-secret", publicUrl: "https://example.com" };
const installation: Installation = { workspaceId: "workspace", appUserId: "app", clientId: "client", accessToken: "synthetic-token", refreshToken: "synthetic-refresh", expiresAt: Date.now() + 600_000, scope: "read write app:assignable app:mentionable" };
const event = (): AgentEvent => ({ type: "AgentSessionEvent", action: "created", organizationId: "workspace", appUserId: "app", oauthClientId: "client", webhookTimestamp: Date.now(), agentSession: { id: "session", appUserId: "app", organizationId: "workspace" }, promptContext: "Test context" });
function fixture() { const directory = mkdtempSync(join(tmpdir(), "linear-edge-")); const path = join(directory, "bridge.sqlite"); return { path, store: new Store(path), cleanup: () => rmSync(directory, { recursive: true, force: true }) }; }
const sign = (raw: Buffer) => createHmac("sha256", secret).update(raw).digest("hex");

test("SDK verifies exact raw bytes and signed timestamps, including future replay", () => {
  const raw = Buffer.from(JSON.stringify(event(), null, 2));
  assert.equal(verifyEvent(raw, sign(raw), secret).agentSession.id, "session");
  assert.throws(() => verifyEvent(Buffer.from(JSON.stringify(event())), sign(raw), secret));
  assert.throws(() => verifyEvent(raw, "bad", secret));
  for (const delta of [-61_000, 61_000]) {
    const old = Buffer.from(JSON.stringify({ ...event(), webhookTimestamp: Date.now() + delta }));
    assert.throws(() => verifyEvent(old, sign(old), secret));
  }
});

test("OAuth state binds browser callback, expires, is single use and survives restart", async () => {
  const f = fixture();
  try {
    let exchanges = 0;
    const linear = new Linear(f.store, config, async () => { exchanges++; throw new Error("No network"); });
    const start = linear.start();
    const url = new URL(start.url);
    assert.equal(url.searchParams.get("actor"), "app");
    assert.equal(url.searchParams.get("code_challenge_method"), "S256");
    await assert.rejects(linear.callback(start.state, "wrong-browser", "code"));
    assert.equal(exchanges, 0);
    f.store.close(); f.store = new Store(f.path);
    assert.ok(f.store.consumeState(start.state));
    assert.throws(() => f.store.consumeState(start.state));
    f.store.saveState("expired", "verifier", 0);
    assert.throws(() => f.store.consumeState("expired", 600_001));
  } finally { f.store.close(); f.cleanup(); }
});

test("receipt and initial intent are durable, deduplicated, ordered and independently consumed", () => {
  const f = fixture();
  try {
    f.store.saveInstallation(installation);
    const e = event();
    f.store.receive("delivery", e, 0);
    assert.equal(f.store.receive("delivery", e, 0), false);
    f.store.receive("second-created-delivery", e, 0);
    f.store.receive("followup", { ...e, action: "prompted", agentActivity: { id: "prompt", agentSessionId: "session", content: { type: "prompt", body: "Follow up" }, signal: "stop" } }, 0);
    const activity = f.store.dueActivities(0)[0]!;
    f.store.close(); f.store = new Store(f.path);
    assert.deepEqual(f.store.installation(), installation);
    assert.equal(f.store.dueActivities(0).length, 1);
    assert.equal(f.store.dueActivities(0)[0]!.activityId, activity.activityId);
    const receipts = f.store.pendingEvents();
    assert.deepEqual(receipts.map(row => row.deliveryId), ["delivery", "second-created-delivery", "followup"]);
    f.store.consumeEvent(receipts[0]!.sequence);
    assert.equal(f.store.pendingEvents().length, 2);
  } finally { f.store.close(); f.cleanup(); }
});

test("HTTP survives malformed targets, acknowledges before API delivery and rejects unrelated identities", async () => {
  const f = fixture();
  f.store.saveInstallation(installation);
  const server = bridgeServer(f.store, new Linear(f.store, config), secret, "synthetic-installation-password");
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address(); assert.ok(address && typeof address !== "string");
  const base = `http://127.0.0.1:${address.port}`;
  try {
    const malformedStatus = await new Promise<number | undefined>((resolve, reject) => {
      get({ hostname: "127.0.0.1", port: address.port, path: "//[", agent: false }, response => {
        response.resume();
        response.once("end", () => resolve(response.statusCode));
      }).once("error", reject);
    });
    assert.equal(malformedStatus, 400);
    const post = async (e: AgentEvent) => { const raw = Buffer.from(JSON.stringify(e)); return fetch(`${base}/webhooks/linear`, { method: "POST", body: raw, headers: { "linear-signature": sign(raw), "linear-delivery": randomUUID() } }); };
    const began = Date.now();
    assert.equal((await post(event())).status, 200);
    assert.ok(Date.now() - began < 5000);
    assert.equal(f.store.dueActivities().length, 1);
    for (const e of [{ ...event(), organizationId: "other" }, { ...event(), oauthClientId: "other" }, { ...event(), appUserId: "other" }]) assert.equal((await post(e)).status, 403);
    assert.equal((await fetch(`${base}/oauth/start`)).status, 401);
    assert.equal(f.store.pendingEvents().length, 1);
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); f.store.close(); f.cleanup(); }
});

test("API failure retries the same logical activity after restart and retains exhausted work", async () => {
  const f = fixture();
  try {
    f.store.receive("delivery", event(), 0);
    const ids: string[] = [];
    await new InitialActivityWorker(f.store, async (_, id) => { ids.push(id); throw new Error("API unavailable"); }).flush();
    assert.equal(f.store.dueActivities().length, 0);
    f.store.close(); f.store = new Store(f.path);
    await new InitialActivityWorker(f.store, async (_, id) => { ids.push(id); }).flush(Date.now() + 2000);
    assert.equal(ids.length, 2); assert.equal(ids[0], ids[1]);
    assert.equal(f.store.dueActivities(Number.MAX_SAFE_INTEGER).length, 0);
    f.store.receive("other", { ...event(), agentSession: { ...event().agentSession, id: "other" } }, 0);
    const activity = f.store.dueActivities()[0]!;
    f.store.activityFailed(activity.activityId, 6);
    assert.equal(f.store.dueActivities(Date.now() + 100_000).length, 0);
    f.store.retryFailedActivities();
    assert.equal(f.store.dueActivities().length, 1);
  } finally { f.store.close(); f.cleanup(); }
});

test("refresh rotates once for concurrent callers and saves both replacement tokens", async () => {
  const f = fixture();
  try {
    f.store.saveInstallation({ ...installation, expiresAt: 0 });
    let calls = 0;
    const linear = new Linear(f.store, config, async (_url, init) => {
      calls++;
      const form = new URLSearchParams(String(init?.body));
      assert.equal(form.get("grant_type"), "refresh_token");
      assert.equal(form.get("refresh_token"), "synthetic-refresh");
      await new Promise(resolve => setTimeout(resolve, 10));
      return Response.json({ access_token: "replacement", refresh_token: "rotated", expires_in: 86400, token_type: "Bearer", scope: installation.scope });
    });
    await Promise.all([linear.client(), linear.client()]);
    assert.equal(calls, 1);
    assert.equal(f.store.installation()?.accessToken, "replacement");
    assert.equal(f.store.installation()?.refreshToken, "rotated");
    f.store.saveInstallation({ ...f.store.installation()!, expiresAt: 0 });
    const failing = new Linear(f.store, config, async () => new Response("private API error", { status: 503 }));
    await assert.rejects(failing.client(), /Linear token exchange failed/);
    assert.equal(f.store.installation()?.refreshToken, "rotated");
  } finally { f.store.close(); f.cleanup(); }
});

test("late sessions deliver independently, overlapping flushes send once and shutdown drains all sends", async () => {
  const f = fixture();
  const releases: (() => void)[] = [];
  const started: string[] = [];
  const worker = new InitialActivityWorker(f.store, async session => {
    started.push(session);
    await new Promise<void>(resolve => { releases.push(resolve); });
  });
  try {
    f.store.receive("one", event(), 0);
    const firstFlush = worker.flush();
    await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(started, ["session"]);
    f.store.receive("two", { ...event(), agentSession: { ...event().agentSession, id: "second" } }, 0);
    const laterFlush = worker.flush();
    const repeatedFlush = worker.flush();
    await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(started, ["session", "second"]);
    let stopped = false;
    const stop = worker.stop().then(() => { stopped = true; });
    releases[0]!(); await firstFlush;
    assert.equal(stopped, false);
    releases[1]!();
    await Promise.all([laterFlush, repeatedFlush, stop]);
    assert.equal(stopped, true);
    assert.equal(f.store.dueActivities().length, 0);
  } finally { for (const release of releases) release(); await worker.stop(); f.store.close(); f.cleanup(); }
});
