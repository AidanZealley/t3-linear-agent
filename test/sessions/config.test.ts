import test from "node:test";
import assert from "node:assert/strict";
import { serviceConfigSchema } from "../../src/sessions/config.ts";

test("session concurrency defaults to five and requires a positive integer", () => {
  const config = { providerInstanceId: "provider", model: "model", projects: {} };
  assert.equal(serviceConfigSchema.parse(config).maxActiveSessions, 5);
  assert.equal(serviceConfigSchema.parse({ ...config, maxActiveSessions: 2 }).maxActiveSessions, 2);
  for (const maxActiveSessions of [0, -1, 1.5, "5", null]) {
    assert.equal(serviceConfigSchema.safeParse({ ...config, maxActiveSessions }).success, false);
  }
});
