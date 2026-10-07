import { constants } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { access, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { z } from "zod";
import type { T3Config } from "../config.ts";
import type { Credential } from "./credentials.ts";

const exec = promisify(execFile);
async function command(cli: string, args: string[]) {
  try {
    return (await exec(cli, args, { timeout: 15_000, maxBuffer: 1024 * 1024 }))
      .stdout;
  } catch {
    throw new Error(
      "T3 authorization CLI failed. Check T3_CLI and T3_BASE_DIR locally.",
    );
  }
}
export async function discoverCli(configured?: string) {
  if (configured) {
    await access(configured, constants.X_OK);
    return configured;
  }
  for (const directory of (process.env.PATH ?? "").split(":")) {
    const candidate = join(directory, "t3");
    try {
      await access(candidate, constants.X_OK);
      return candidate;
    } catch {
      /* Try the next directory. */
    }
  }
  const root = join(homedir(), ".t3", "runtime");
  const state = z
    .object({ activeVersion: z.string().regex(/^[a-zA-Z0-9.-]+$/) })
    .parse(
      JSON.parse(await readFile(join(root, "service-state.json"), "utf8")),
    );
  const candidate = join(root, "versions", state.activeVersion, "t3");
  await access(candidate, constants.X_OK);
  return candidate;
}
async function json(url: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(15_000),
    redirect: "error",
  });
  if (!response.ok)
    throw new Error(
      `T3 authorization request failed with HTTP ${response.status}.`,
    );
  return response.json();
}
const post = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

export class AuthorizationCleanupError extends Error {
  readonly clientLabel: string;
  readonly pairingId: string | undefined;
  readonly sessionIds: readonly string[];
  constructor(
    clientLabel: string,
    pairingId: string | undefined,
    sessionIds: string[],
  ) {
    super(
      `T3 authorization failed and cleanup is incomplete. Use auth session list and auth pairing list with the configured T3_BASE_DIR to find client label ${clientLabel}; revoke its sessions and pairing grant locally.`,
    );
    this.clientLabel = clientLabel;
    this.pairingId = pairingId;
    this.sessionIds = sessionIds;
  }
}

async function sessionsForClient(cli: string, base: string[], label: string) {
  const sessions = z
    .array(z.object({
      sessionId: z.string(),
      client: z.object({ label: z.string().nullable() }),
    }))
    .parse(JSON.parse(
      await command(cli, ["auth", "session", "list", ...base, "--json"]),
    ));
  return sessions
    .filter((session) => session.client.label === label)
    .map((session) => session.sessionId);
}

export class LocalAuthorization {
  readonly config: T3Config;
  constructor(config: T3Config) {
    this.config = config;
  }
  async cliArgs() {
    return {
      cli: await discoverCli(this.config.cli),
      base: this.config.baseDir ? ["--base-dir", this.config.baseDir] : [],
    };
  }
  async issue(previous?: Credential): Promise<Credential> {
    const endpoint = new URL(this.config.endpoint);
    const resource = z
      .object({
        resource: z.string(),
        authorization_servers: z.array(z.url()).min(1),
      })
      .parse(
        await json(
          new URL(
            `/.well-known/oauth-protected-resource${endpoint.pathname}`,
            endpoint,
          ).href,
        ),
      );
    if (resource.resource !== endpoint.href)
      throw new Error(
        "T3 OAuth resource does not match the configured MCP endpoint.",
      );
    const issuer = resource.authorization_servers[0]!;
    const metadata = z
      .object({
        issuer: z.string(),
        authorization_endpoint: z.url(),
        token_endpoint: z.url(),
        registration_endpoint: z.url(),
        grant_types_supported: z.array(z.string()),
        code_challenge_methods_supported: z.array(z.string()),
      })
      .parse(
        await json(
          new URL("/.well-known/oauth-authorization-server", issuer).href,
        ),
      );
    if (
      metadata.issuer !== issuer ||
      !metadata.grant_types_supported.includes("authorization_code") ||
      !metadata.code_challenge_methods_supported.includes("S256")
    )
      throw new Error(
        "T3 does not advertise the required PKCE authorization flow.",
      );
    for (const url of [
      issuer,
      metadata.authorization_endpoint,
      metadata.token_endpoint,
      metadata.registration_endpoint,
    ]) {
      if (new URL(url).origin !== endpoint.origin)
        throw new Error("T3 OAuth metadata crossed the configured origin.");
    }
    const scopes = previous?.scopes ?? [
      "orchestration:read",
      "orchestration:operate",
    ];
    const runtimeMode = previous?.runtimeMode ?? this.config.runtimeMode;
    const label = `t3-linear-agent-${randomUUID()}`;
    const redirect = "http://127.0.0.1:49152/callback";
    const client = z.object({ client_id: z.string() }).parse(
      await json(
        metadata.registration_endpoint,
        post({
          client_name: label,
          redirect_uris: [redirect],
          token_endpoint_auth_method: "none",
        }),
      ),
    );
    const { cli, base } = await this.cliArgs();
    let pairingId: string | undefined;
    let sessionIds: string[] = [];
    let exchangeStarted = false;
    try {
      const pairing = z
        .object({ id: z.string(), credential: z.string() })
        .parse(
          JSON.parse(
            await command(cli, [
              "auth",
              "pairing",
              "create",
              ...base,
              ...scopes.flatMap((scope) => ["--scope", scope]),
              "--ttl",
              "5m",
              "--label",
              label,
              "--json",
            ]),
          ),
        );
      pairingId = pairing.id;
      const verifier = randomBytes(32).toString("base64url");
      const state = randomBytes(24).toString("base64url");
      const decision = z.object({ redirectTo: z.url() }).parse(
        await json(
          new URL("decision", metadata.authorization_endpoint).href,
          post({
            authorization: {
              response_type: "code",
              client_id: client.client_id,
              redirect_uri: redirect,
              code_challenge: createHash("sha256")
                .update(verifier)
                .digest("base64url"),
              code_challenge_method: "S256",
              state,
              resource: resource.resource,
            },
            decision: {
              _tag: "pairing-code",
              code: pairing.credential,
              access: runtimeMode,
            },
          }),
        ),
      );
      const callback = new URL(decision.redirectTo);
      if (
        callback.origin + callback.pathname !== redirect ||
        callback.searchParams.get("state") !== state ||
        callback.searchParams.get("iss") !== issuer ||
        !callback.searchParams.get("code")
      )
        throw new Error("T3 authorization returned an invalid callback.");
      exchangeStarted = true;
      const token = z
        .object({
          access_token: z.string(),
          token_type: z.literal("Bearer"),
          expires_in: z.number().positive(),
          scope: z.string(),
        })
        .parse(
          await json(metadata.token_endpoint, {
            method: "POST",
            headers: { "content-type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              grant_type: "authorization_code",
              code: callback.searchParams.get("code")!,
              redirect_uri: redirect,
              client_id: client.client_id,
              code_verifier: verifier,
              resource: resource.resource,
            }),
          }),
        );
      sessionIds = await sessionsForClient(cli, base, label);
      const sessionId = sessionIds[0];
      if (!sessionId)
        throw new Error(
          "Cannot identify the new T3 session for credential retirement.",
        );
      if (
        token.scope.split(" ").sort().join(" ") !== [...scopes].sort().join(" ")
      )
        throw new Error("T3 renewal changed the original scopes.");
      return {
        version: 1,
        endpoint: endpoint.href,
        token: token.access_token,
        sessionId,
        expiresAt: Date.now() + token.expires_in * 1000,
        scopes: [...scopes],
        runtimeMode,
      };
    } catch {
      let cleanupFailed = !pairingId;
      // The exchange or decision response may be lost after T3 creates the session.
      // Retry discovery by our unique label, never by a bearer token.
      if (!sessionIds.length) {
        try {
          sessionIds = await sessionsForClient(cli, base, label);
        } catch {
          cleanupFailed = true;
        }
      }
      if (exchangeStarted && !sessionIds.length) cleanupFailed = true;
      for (const id of sessionIds) {
        await command(cli, ["auth", "session", "revoke", ...base, id]).catch(() => {
          cleanupFailed = true;
        });
      }
      if (pairingId) {
        await command(cli, ["auth", "pairing", "revoke", ...base, pairingId]).catch(() => {
          cleanupFailed = true;
        });
      }
      if (cleanupFailed)
        throw new AuthorizationCleanupError(label, pairingId, sessionIds);
      throw new Error(
        "T3 authorization failed. Temporary pairing and session grants were retired; pair locally again.",
      );
    }
  }
  async revoke(credential: Credential) {
    const { cli, base } = await this.cliArgs();
    await command(cli, [
      "auth",
      "session",
      "revoke",
      ...base,
      credential.sessionId,
    ]);
  }
}
