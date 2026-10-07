import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { homedir } from "node:os";
import { z } from "zod";
import { pathToFileURL } from "node:url";
import { Store, privateFile } from "../store/index.ts";
import { Linear } from "./client.ts";
import { InitialActivityWorker } from "./worker.ts";
import { bridgeServer } from "../http.ts";

export async function main() {
  const file = process.env.LINEAR_SECRET_FILE ?? `${homedir()}/.local/state/t3-linear-agent/linear-secrets.json`;
  if (resolve(file).startsWith(`${resolve(".")}/`)) throw new Error("Secrets must be outside the checkout");
  privateFile(file);
  const config = z.object({ clientId: z.string().min(1), clientSecret: z.string().min(1), webhookSecret: z.string().min(1), setupPassword: z.string().min(24), publicUrl: z.url().refine(url => new URL(url).protocol === "https:" && new URL(url).pathname === "/" && !new URL(url).search && !new URL(url).hash) }).parse(JSON.parse(readFileSync(file, "utf8")));
  config.publicUrl = config.publicUrl.replace(/\/$/, "");
  const store = new Store(process.env.LINEAR_STORE_FILE ?? `${homedir()}/.local/state/t3-linear-agent/bridge.sqlite`);
  const linear = new Linear(store, config);
  const worker = new InitialActivityWorker(store, (session, activity) => linear.initialActivity(session, activity));
  const server = bridgeServer(store, linear, config.webhookSecret, config.setupPassword);
  server.listen(8787, "127.0.0.1", () => console.log("Linear validation bridge listening on 127.0.0.1:8787"));
  worker.start();
  const stop = () => { server.close(() => { void worker.stop().then(() => store.close()); }); };
  process.once("SIGINT", stop); process.once("SIGTERM", stop);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(() => { console.error("Linear bridge startup failed. Check private configuration and store permissions."); process.exitCode = 1; });
}
