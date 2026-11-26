import test from "node:test";
import assert from "node:assert/strict";
import { routingLabels } from "../../src/linear/labels.ts";

test("Linear group children and full-name labels normalize to routing labels", async () => {
  const labels = await routingLabels([
    { name: "codex", parent: Promise.resolve({ name: "harness" }) },
    { name: "high", parent: Promise.resolve({ name: "difficulty" }) },
    { name: "bug", parent: Promise.resolve({ name: "type" }) },
    { name: "frontend" },
  ]);
  assert.deepEqual(labels, ["harness:codex", "difficulty:high", "bug", "frontend"]);
  assert.deepEqual(await routingLabels([{ name: "harness:claude-code", parent: Promise.resolve({ name: "harness" }) }, { name: "difficulty:low" }]), ["harness:claude-code", "difficulty:low"]);
});
