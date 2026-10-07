import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { z } from "zod";
import { Store, privateFile } from "./store/index.ts";
import { Linear } from "./linear/client.ts";
import { InitialActivityWorker } from "./linear/worker.ts";
import { bridgeServer } from "./http.ts";
import { T3Client } from "./t3/client.ts";
import { t3Config } from "./config.ts";
import { serviceConfig, validateConfiguration } from "./sessions/config.ts";
import { SessionService } from "./sessions/service.ts";
import type { Report } from "./sessions/types.ts";

export async function main() {
  const stateDirectory = `${homedir()}/.local/state/t3-linear-agent`;
  const store = new Store(process.env.LINEAR_STORE_FILE ?? `${stateDirectory}/bridge.sqlite`);
  const action = process.argv[2];
  if (action === "status") {
    console.log(JSON.stringify({ sessions: store.sessions().map(({ id, status, projectId, threadId, runId, problem, stopPending, inputs, question }) => ({ id, status, projectId, threadId, runId, problem, stopPending, pendingInputs: inputs.length, pendingQuestionRequestId: question?.requestId })), unresolvedIntents: store.intents().filter(item => item.status !== "confirmed").map(({ id, sessionId, tool, credentialSessionId, status }) => ({ id, sessionId, tool, credentialSessionId, status })), failedReports: store.reports().filter(item => item.status === "failed").map(({ id, sessionId, attempts }) => ({ id, sessionId, attempts })) }, null, 2));
    store.close(); return;
  }
  if (action === "retry-reports") { store.retryReports(); store.retryFailedActivities(); store.close(); console.log("Failed reporting intents are pending with their original IDs."); return; }
  if (action) { store.close(); throw new Error("Unknown service command."); }
  let t3: T3Client | undefined;
  try {
    const secretsFile = resolve(process.env.LINEAR_SECRET_FILE ?? `${stateDirectory}/linear-secrets.json`);
    if (secretsFile.startsWith(`${resolve(".")}/`)) throw new Error("Secrets must be outside the checkout.");
    privateFile(secretsFile);
    const secrets = z.object({ clientId: z.string().min(1), clientSecret: z.string().min(1), webhookSecret: z.string().min(1), setupPassword: z.string().min(24), publicUrl: z.url().refine(value => { const url = new URL(value); return url.protocol === "https:" && url.pathname === "/" && !url.search && !url.hash; }) }).parse(JSON.parse(readFileSync(secretsFile, "utf8")));
    secrets.publicUrl = secrets.publicUrl.replace(/\/$/, "");
    if (store.installation()?.clientId !== secrets.clientId) throw new Error("Complete matching Linear installation before starting the coding service.");
    if (!process.env.T3_RUNTIME_MODE) throw new Error("Select T3_RUNTIME_MODE explicitly.");
    const config = serviceConfig(process.env.SESSION_CONFIG_FILE ?? `${stateDirectory}/sessions.json`);
    const pending = store.intents().filter(item => item.status !== "confirmed");
    t3 = await T3Client.create(t3Config(), pending);
    if (!pending.length) await validateConfiguration(config, t3);
    const linear = new Linear(store, secrets);
    const sendReport = async (report: Report) => {
      try { await linear.activity({ id: report.id, agentSessionId: report.sessionId, content: { type: report.type, body: report.body } }); }
      catch {
        const activity = await (await linear.client()).agentActivity(report.id);
        if ((await activity.agentSession)?.id !== report.sessionId) throw new Error("Report reconciliation failed.");
      }
      if (report.url) await linear.links(report.sessionId, { addedExternalUrls: [{ url: report.url, label: "Pull request" }] });
    };
    const sessions = new SessionService(store, t3, {
      async issue(id) { const issue = await (await linear.client()).issue(id); return { identifier: issue.identifier, projectName: (await issue.project)?.name }; },
      report: sendReport,
    }, config, t3Config().runtimeMode);
    if (pending.length) {
      let validated = false;
      try {
        await t3.renew(async (operations, reads) => {
          await validateConfiguration(config, reads); validated = true;
          return sessions.reconcile(operations, reads);
        });
      } catch (error) {
        if (!validated) throw error;
        console.error("Restored T3 intent remains ambiguous. Receipt and reporting will continue while dispatch is paused.");
      }
    }
    const initial = new InitialActivityWorker(store, async (sessionId, activityId) => {
      await sendReport({ id: activityId, sessionId, type: "thought", body: "Received. Work is queued for T3; project selection and existing sessions are checked before coding starts.", attempts: 0, nextAt: 0, status: "pending" });
    });
    const server = bridgeServer(store, linear, secrets.webhookSecret, secrets.setupPassword);
    await new Promise<void>((accept, reject) => { server.once("error", reject); server.listen(8787, "127.0.0.1", accept); });
    initial.start(); sessions.start();
    t3.startRenewal(sessions.reconcile, () => console.error("T3 credential renewal failed. Inspect service status and local authorization.", JSON.stringify({ pendingRetirementSessionIds: t3!.status.pendingRetirementSessionIds })));
    console.log("T3 Linear service listening on 127.0.0.1:8787");
    let stopping = false;
    const stop = () => {
      if (stopping) return; stopping = true;
      server.close(() => { void Promise.all([sessions.stop(), initial.stop()]).then(() => t3!.close()).catch(() => console.error("Service shutdown could not close every transport. Durable state is retained.")).finally(() => store.close()); });
    };
    process.once("SIGINT", stop); process.once("SIGTERM", stop);
  } catch (error) { await t3?.close(); store.close(); throw error; }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(() => { console.error("T3 Linear service startup failed. Check private configuration, authorization, and persisted intent status."); process.exitCode = 1; });
}
