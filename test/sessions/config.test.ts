import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { serviceConfigSchema, validateConfiguration } from "../../src/sessions/config.ts";
import type { T3Tools } from "../../src/t3/contracts.ts";

const git = promisify(execFile);
test("session concurrency defaults to five and requires a positive integer", () => {
  const config = { providerInstanceId: "provider", model: "model", projects: {} };
  assert.equal(serviceConfigSchema.parse(config).maxActiveSessions, 5);
  assert.equal(serviceConfigSchema.parse({ ...config, maxActiveSessions: 2 }).maxActiveSessions, 2);
  for (const maxActiveSessions of [0, -1, 1.5, "5", null]) {
    assert.equal(serviceConfigSchema.safeParse({ ...config, maxActiveSessions }).success, false);
  }
});

const catalog: T3Tools["orchestrator_capabilities"]["output"] = {
  features: { appOwnedSubagents: true, asyncPolling: true, batchThreadCreation: true, cancellation: true, incrementalThreadRead: true, maxBatchThreads: 5, scheduledTasks: true, threadManagement: true },
  inheritedModel: null, inheritedProviderInstanceId: null, interactionMode: "default", parentThreadId: null, runtimeMode: "full-access",
  providers: [{ providerInstanceId: "configured-provider", driverKind: "codex", displayName: "Codex", constraints: [], canRunChildTask: true, canRunCrossProviderChildTask: true, models: [{ id: "configured-model", label: "Model" }] }],
};
test("configuration validates an explicit model and real repository/base branch before dispatch", async t => {
  const directory = await mkdtemp(join(tmpdir(), "linear-session-config-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await git("git", ["init", "-b", "main", directory]);
  await git("git", ["-C", directory, "-c", "user.name=Fixture", "-c", "user.email=fixture@example.invalid", "commit", "--allow-empty", "-m", "Fixture"]);
  const config = serviceConfigSchema.parse({ providerInstanceId: "configured-provider", model: "configured-model", projects: { project: { repository: directory, baseRef: "main" } } });
  const t3 = { async capabilities() { return catalog; } };
  await validateConfiguration(config, t3);
  await assert.rejects(validateConfiguration({ ...config, model: "unknown-model" }, t3), /provider\/model/);
  await assert.rejects(validateConfiguration({ ...config, projects: { project: { repository: directory, baseRef: "missing" } } }, t3));
  await assert.rejects(validateConfiguration({ ...config, projects: { project: { repository: tmpdir(), baseRef: "main" } } }, t3));
});
