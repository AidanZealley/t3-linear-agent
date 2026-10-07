import { createServer, type IncomingMessage } from "node:http";
import { timingSafeEqual } from "node:crypto";
import { verifyEvent } from "./linear/events.ts";
import type { Linear } from "./linear/client.ts";
import type { Store } from "./store/index.ts";

async function body(request: IncomingMessage) {
  const parts: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 1024 * 1024) throw new Error("Body too large");
    parts.push(Buffer.from(chunk));
  }
  return Buffer.concat(parts);
}
export function bridgeServer(store: Store, linear: Linear, secret: string, setupPassword: string) {
  const expectedAuth = Buffer.from(`Basic ${Buffer.from(`aidan:${setupPassword}`).toString("base64")}`);
  const server = createServer(async (request, response) => {
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("Referrer-Policy", "no-referrer");
    try {
      const url = URL.parse(request.url ?? "/", "http://localhost");
      if (!url) {
        response.writeHead(400).end("Invalid request target"); return;
      }
      if (request.method === "GET" && url.pathname === "/oauth/start") {
        const auth = Buffer.from(request.headers.authorization ?? "");
        if (auth.length !== expectedAuth.length || !timingSafeEqual(auth, expectedAuth)) {
          response.writeHead(401, { "WWW-Authenticate": 'Basic realm="T3 installation"' }).end("Owner authorization required"); return;
        }
        const { state, url: location } = linear.start();
        response.writeHead(302, { Location: location, "Set-Cookie": `linear_state=${state}; Secure; HttpOnly; SameSite=Lax; Path=/oauth; Max-Age=600` }).end(); return;
      }
      if (request.method === "GET" && url.pathname === "/oauth/callback") {
        const cookie = request.headers.cookie?.split("; ").find(value => value.startsWith("linear_state="))?.slice(13) ?? "";
        await linear.callback(url.searchParams.get("state") ?? "", cookie, url.searchParams.get("code") ?? "");
        response.setHeader("Set-Cookie", "linear_state=; Secure; HttpOnly; SameSite=Lax; Path=/oauth; Max-Age=0");
        response.writeHead(200).end("T3 installed. This validation bridge acknowledges sessions without starting coding work."); return;
      }
      if (request.method === "POST" && url.pathname === "/webhooks/linear") {
        // Node checks requestTimeout periodically. Enforce the webhook deadline directly.
        const deadline = setTimeout(() => {
          response.writeHead(408).end("Webhook deadline exceeded", () => request.destroy());
        }, 4000);
        response.once("finish", () => clearTimeout(deadline));
        response.once("close", () => clearTimeout(deadline));
        const signature = request.headers["linear-signature"];
        const delivery = request.headers["linear-delivery"];
        if (typeof signature !== "string" || typeof delivery !== "string" || !/^[0-9a-f-]{36}$/i.test(delivery)) {
          response.writeHead(400).end("Invalid webhook headers"); return;
        }
        let event;
        try { event = verifyEvent(await body(request), signature, secret); }
        catch { if (!response.writableEnded) response.writeHead(400).end("Invalid webhook"); return; }
        const installation = store.installation();
        if (!installation || event.organizationId !== installation.workspaceId || event.oauthClientId !== installation.clientId || event.appUserId !== installation.appUserId || event.agentSession.appUserId !== installation.appUserId || event.agentSession.organizationId !== installation.workspaceId || (event.agentActivity && event.agentActivity.agentSessionId !== event.agentSession.id)) {
          response.writeHead(403).end("Unrelated installation"); return;
        }
        store.receive(delivery, event);
        response.writeHead(200).end("OK"); return;
      }
      response.writeHead(404).end();
    } catch { if (!response.writableEnded) response.writeHead(500).end("Bridge request failed"); }
  });
  server.requestTimeout = 4000;
  server.headersTimeout = 4000;
  return server;
}
