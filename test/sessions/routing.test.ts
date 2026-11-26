import test from "node:test";
import assert from "node:assert/strict";
import { selectModel } from "../../src/sessions/routing.ts";

const catalog = {
  providers: ["codex", "claudeAgent"].map(providerInstanceId => ({
    providerInstanceId, driverKind: providerInstanceId, displayName: null, constraints: [],
    canRunChildTask: true, canRunCrossProviderChildTask: true,
    models: (providerInstanceId === "codex"
      ? ["gpt-6-luna", "gpt-6.1-sol", "gpt-6.2-sol", "gpt-6.2-sol-fast"]
      : ["claude-sonnet-5-5", "claude-opus-5-5"]).map(id => ({
      id, label: null, options: [{ id: providerInstanceId === "codex" ? "reasoningEffort" : "effort", values: ["low", "medium", "high"] }],
    })),
  })),
};

test("all six harness and difficulty combinations map to the requested model and reasoning", () => {
  for (const [harness, difficulty, instanceId, model, options] of [
    ["claude-code", "low", "claudeAgent", "claude-sonnet-5-5", { effort: "low" }],
    ["claude-code", "medium", "claudeAgent", "claude-opus-5-5", { effort: "medium" }],
    ["claude-code", "high", "claudeAgent", "claude-opus-5-5", { effort: "high" }],
    ["codex", "low", "codex", "gpt-6-luna", { reasoningEffort: "low" }],
    ["codex", "medium", "codex", "gpt-6.2-sol", { reasoningEffort: "low" }],
    ["codex", "high", "codex", "gpt-6.2-sol", { reasoningEffort: "high" }],
  ] as const) {
    assert.deepEqual(selectModel([`harness:${harness}`, `difficulty:${difficulty}`, "bug"], catalog), { instanceId, model, options });
  }
});

test("unlabeled tasks inherit T3 defaults and an explicit harness selects the latest family member", () => {
  assert.equal(selectModel([], catalog), undefined);
  assert.deepEqual(selectModel(["harness:codex"], catalog), { instanceId: "codex", model: "gpt-6.2-sol" });
  assert.equal(selectModel(["difficulty:low"], catalog, "claudeAgent")?.model, "claude-sonnet-5-5");
  assert.throws(() => selectModel(["difficulty:low"], catalog), /Add harness/);
});

test("conflicting and unsupported routing labels fail instead of silently falling back", () => {
  for (const labels of [
    ["harness:codex", "harness:claude-code"], ["difficulty:low", "difficulty:high"],
    ["harness:unknown"], ["difficulty:extreme"], ["harness:"], ["difficulty:"],
  ]) assert.throws(() => selectModel(labels, catalog));
  assert.deepEqual(selectModel(["difficulty:high", "difficulty:high"], catalog, "claudeAgent")?.options, { effort: "high" });
});
