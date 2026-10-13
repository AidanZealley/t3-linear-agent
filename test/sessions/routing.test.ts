import test from "node:test";
import assert from "node:assert/strict";
import { selectModel } from "../../src/sessions/routing.ts";

const config = { providerInstanceId: "claudeAgent", model: "claude-opus-5-5", maxActiveSessions: 5, projects: {} };

test("all six harness and difficulty combinations map to the requested model and reasoning", () => {
  for (const [harness, difficulty, instanceId, model, options] of [
    ["claude-code", "low", "claudeAgent", "claude-sonnet-5-5", { effort: "low" }],
    ["claude-code", "medium", "claudeAgent", "claude-opus-5-5", { effort: "medium" }],
    ["claude-code", "high", "claudeAgent", "claude-opus-5-5", { effort: "high" }],
    ["codex", "low", "codex", "gpt-6-luna", { reasoningEffort: "low" }],
    ["codex", "medium", "codex", "gpt-6.1-sol", { reasoningEffort: "low" }],
    ["codex", "high", "codex", "gpt-6.1-sol", { reasoningEffort: "high" }],
  ] as const) {
    assert.deepEqual(selectModel([`harness:${harness}`, `difficulty:${difficulty}`, "bug"], config), { instanceId, model, options });
  }
});

test("missing labels use the configured harness and medium difficulty", () => {
  assert.deepEqual(selectModel([], config), { instanceId: "claudeAgent", model: "claude-opus-5-5", options: { effort: "medium" } });
  assert.deepEqual(selectModel([], { ...config, providerInstanceId: "codex" }), { instanceId: "codex", model: "gpt-6.1-sol", options: { reasoningEffort: "low" } });
  assert.equal(selectModel(["harness:codex"], config).model, "gpt-6.1-sol");
  assert.equal(selectModel(["difficulty:low"], config).model, "claude-sonnet-5-5");
  assert.deepEqual(selectModel([], { ...config, providerInstanceId: "custom", model: "custom-model" }), { instanceId: "custom", model: "custom-model" });
});

test("conflicting and unsupported routing labels fail instead of silently falling back", () => {
  for (const labels of [
    ["harness:codex", "harness:claude-code"], ["difficulty:low", "difficulty:high"],
    ["harness:unknown"], ["difficulty:extreme"], ["harness:"], ["difficulty:"],
  ]) assert.throws(() => selectModel(labels, config));
  assert.deepEqual(selectModel(["difficulty:high", "difficulty:high"], config).options, { effort: "high" });
});
