import test from "node:test";
import assert from "node:assert/strict";
import { chmod, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AuthorizationCleanupError, LocalAuthorization } from "../../src/t3/auth.ts";

async function fixture(t: test.TestContext, mode: string) {
  const directory = await mkdtemp(join(tmpdir(), "t3-auth-test-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const cli = join(directory, "cli.mjs");
  await writeFile(cli, `#!/usr/bin/env node
import { appendFile, readFile, writeFile } from "node:fs/promises";
const args = process.argv.slice(2);
const base = args[args.indexOf("--base-dir") + 1];
const action = args.slice(0, 3).join(" ");
await appendFile(base + "/calls", action + "\\n");
if (action === "auth pairing create") {
  await writeFile(base + "/label", args[args.indexOf("--label") + 1]);
  console.log(JSON.stringify({id: "pairing-id", credential: "fake-pairing-secret"}));
} else if (action === "auth session list") {
  const label = await readFile(base + "/label", "utf8");
  const calls = await readFile(base + "/calls", "utf8");
  if (${JSON.stringify(mode)} === "discovery-unavailable" ||
      (${JSON.stringify(mode)} === "discovery-once" && calls.split(action).length === 2))
    process.exit(1);
  console.log(JSON.stringify([{sessionId: "issued-session", client: {label}}]));
} else if (action === "auth session revoke") {
  if (args.at(-1) !== "issued-session" ||
      ${JSON.stringify(mode)} === "retirement-unavailable") process.exit(1);
} else if (action === "auth pairing revoke" && args.at(-1) !== "pairing-id") {
  process.exit(1);
}
`);
  await chmod(cli, 0o700);
  const origin = "http://127.0.0.1:3873";
  t.mock.method(globalThis, "fetch", async (url: string, init?: RequestInit) => {
    const path = new URL(url).pathname;
    let result: unknown;
    if (path === "/.well-known/oauth-protected-resource/mcp")
      result = { resource: origin + "/mcp", authorization_servers: [origin] };
    else if (path === "/.well-known/oauth-authorization-server")
      result = {
        issuer: origin,
        authorization_endpoint: origin + "/oauth/mcp/authorize",
        token_endpoint: origin + "/token",
        registration_endpoint: origin + "/register",
        grant_types_supported: ["authorization_code"],
        code_challenge_methods_supported: ["S256"],
      };
    else if (path === "/register")
      result = { client_id: "fake-client" };
    else if (path === "/oauth/mcp/decision") {
      const body = JSON.parse(String(init?.body));
      const redirect = new URL(body.authorization.redirect_uri);
      redirect.searchParams.set("state", body.authorization.state);
      redirect.searchParams.set("iss", origin);
      redirect.searchParams.set("code", "fake-code-secret");
      result = { redirectTo: redirect.href };
    } else if (path === "/token")
      result = {
        access_token: "fake-bearer-secret",
        token_type: "Bearer",
        expires_in: 30 * 86_400,
        scope: mode === "retirement-unavailable" ? "orchestration:read" : "orchestration:read orchestration:operate",
      };
    else throw new Error("Unexpected authorization request");
    return Response.json(result);
  });
  const auth = new LocalAuthorization({
    endpoint: origin + "/mcp",
    runtimeMode: "full-access",
    credentialFile: join(directory, "credential.json"),
    cli,
    baseDir: directory,
  });
  return { auth, directory, calls: () => readFile(join(directory, "calls"), "utf8") };
}

test("authorization retires the issued session when discovery fails after token exchange", async (t) => {
  const f = await fixture(t, "discovery-once");
  await assert.rejects(f.auth.issue(), /grants were retired/);
  assert.equal(await f.calls(), [
    "auth pairing create",
    "auth session list",
    "auth session list",
    "auth session revoke",
    "auth pairing revoke",
    "",
  ].join("\n"));
});

test("unavailable discovery exposes the unique cleanup label without secrets", async (t) => {
  const f = await fixture(t, "discovery-unavailable");
  await assert.rejects(f.auth.issue(), (error: unknown) => {
    assert.ok(error instanceof AuthorizationCleanupError);
    assert.match(error.clientLabel, /^t3-linear-agent-/);
    assert.equal(error.pairingId, "pairing-id");
    assert.deepEqual(error.sessionIds, []);
    assert.match(error.message, /auth session list.*revoke/);
    assert.doesNotMatch(JSON.stringify(error) + error.message, /fake-.*secret/);
    return true;
  });
  assert.match(await f.calls(), /auth pairing revoke/);
});

test("scope mismatch retires grants and failed retirement exposes its session identity", async (t) => {
  const f = await fixture(t, "retirement-unavailable");
  await assert.rejects(f.auth.issue(), (error: unknown) => {
    assert.ok(error instanceof AuthorizationCleanupError);
    assert.deepEqual(error.sessionIds, ["issued-session"]);
    assert.doesNotMatch(JSON.stringify(error) + error.message, /fake-.*secret/);
    return true;
  });
  assert.match(await f.calls(), /auth session revoke\nauth pairing revoke/);
});
