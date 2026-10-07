import { LinearClient } from "@linear/sdk";
import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { Store, type Installation } from "../store/index.ts";

type AgentActivityCreateInput = Parameters<LinearClient["createAgentActivity"]>[0];
type AgentSessionUpdateInput = Parameters<LinearClient["updateAgentSession"]>[1];

export const scopes = "read,write,app:assignable,app:mentionable";
export type OAuthConfig = { clientId: string; clientSecret: string; publicUrl: string };
const tokenSchema = z.object({ access_token: z.string().min(1), refresh_token: z.string().min(1), expires_in: z.number().positive(), scope: z.string(), token_type: z.literal("Bearer") });

export class Linear {
  private refresh?: Promise<Installation>;
  private store: Store;
  private config: OAuthConfig;
  private fetcher: typeof fetch;
  constructor(store: Store, config: OAuthConfig, fetcher: typeof fetch = fetch) { this.store = store; this.config = config; this.fetcher = fetcher; }
  start() {
    if (this.store.installation()) throw new Error("Already installed");
    const state = randomBytes(32).toString("base64url");
    const verifier = randomBytes(32).toString("base64url");
    this.store.saveState(state, verifier);
    const url = new URL("https://linear.app/oauth/authorize");
    url.search = new URLSearchParams({ client_id: this.config.clientId, redirect_uri: `${this.config.publicUrl}/oauth/callback`, response_type: "code", actor: "app", scope: scopes, state, code_challenge: createHash("sha256").update(verifier).digest("base64url"), code_challenge_method: "S256" }).toString();
    return { state, url: url.toString() };
  }
  private async token(parameters: Record<string, string>) {
    const response = await this.fetcher("https://api.linear.app/oauth/token", {
      method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: this.config.clientId, client_secret: this.config.clientSecret, ...parameters }), signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) throw new Error("Linear token exchange failed");
    const token = tokenSchema.parse(await response.json());
    const granted = new Set(token.scope.split(/[ ,]+/));
    if (scopes.split(",").some(scope => !granted.has(scope))) throw new Error("Linear scopes missing");
    return { accessToken: token.access_token, refreshToken: token.refresh_token, expiresAt: Date.now() + token.expires_in * 1000, scope: token.scope };
  }
  async callback(state: string, browserState: string, code: string) {
    if (!state || state !== browserState || !code || this.store.installation()) throw new Error("Invalid OAuth callback");
    const verifier = this.store.consumeState(state);
    const token = await this.token({ grant_type: "authorization_code", code, redirect_uri: `${this.config.publicUrl}/oauth/callback`, code_verifier: verifier });
    const client = this.sdk(token.accessToken);
    const [viewer, organization] = await Promise.all([client.viewer, client.organization]);
    if (!viewer.app || viewer.name !== "T3" || !viewer.isAssignable || !viewer.isMentionable) throw new Error("Expected assignable and mentionable T3 app actor");
    this.store.saveInstallation({ ...token, workspaceId: organization.id, appUserId: viewer.id, clientId: this.config.clientId });
  }
  private sdk(accessToken: string) {
    return new LinearClient({ accessToken, signal: AbortSignal.timeout(4000) });
  }
  async client() {
    let installation = this.store.installation();
    if (!installation || installation.clientId !== this.config.clientId) throw new Error("Linear installation required");
    if (installation.expiresAt <= Date.now() + 300_000) {
      // Serialize refresh-token rotation. Persist the replacement before allowing API use.
      const current = installation;
      this.refresh ??= this.token({ grant_type: "refresh_token", refresh_token: installation.refreshToken }).then(token => {
        const next = { ...current, ...token };
        this.store.saveInstallation(next);
        return next;
      }).finally(() => { this.refresh = undefined; });
      installation = await this.refresh;
    }
    return this.sdk(installation.accessToken);
  }
  async activity(input: AgentActivityCreateInput) {
    const result = await (await this.client()).createAgentActivity(input);
    if (!result.success) throw new Error("Linear activity failed");
  }
  async links(sessionId: string, input: Pick<AgentSessionUpdateInput, "addedExternalUrls" | "removedExternalUrls">) {
    const result = await (await this.client()).updateAgentSession(sessionId, input);
    if (!result.success) throw new Error("Linear session update failed");
  }
  async initialActivity(sessionId: string, activityId: string) {
    // Reusing the persisted UUID prevents a second activity after an uncertain response.
    try {
      await this.activity({ id: activityId, agentSessionId: sessionId, content: { type: "thought", body: "Received. T3 connection validation is in progress; coding has not started." } });
    } catch {
      const existing = await (await this.client()).agentActivity(activityId);
      const session = await existing.agentSession;
      if (session?.id !== sessionId) throw new Error("Activity session mismatch");
    }
  }
}
