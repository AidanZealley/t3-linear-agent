import test from "node:test";
import assert from "node:assert/strict";
import { routingLabels } from "../../src/linear/labels.ts";
import { selectModel } from "../../src/sessions/routing.ts";

test("Linear group children and full-name labels select the same model", async () => {
  const labels = await routingLabels([
    { name: "codex", parent: Promise.resolve({ name: "harness" }) },
    { name: "high", parent: Promise.resolve({ name: "difficulty" }) },
    { name: "bug", parent: Promise.resolve({ name: "type" }) },
    { name: "frontend" },
  ]);
  assert.deepEqual(labels, ["harness:codex", "difficulty:high", "bug", "frontend"]);
  assert.deepEqual(selectModel(labels, { providerInstanceId: "claudeAgent", model: "claude-opus-5-5", maxActiveSessions: 5, projects: {} }), {
    instanceId: "codex", model: "gpt-6.1-sol", options: { reasoningEffort: "high" },
  });
  assert.deepEqual(await routingLabels([{ name: "harness:claude-code", parent: Promise.resolve({ name: "harness" }) }, { name: "difficulty:low" }]), ["harness:claude-code", "difficulty:low"]);
});
