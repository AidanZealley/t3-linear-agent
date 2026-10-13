import { readFileSync, realpathSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { z } from "zod";
import type { T3Client } from "../t3/client.ts";

const git = promisify(execFile);
export const serviceConfigSchema = z.object({
  providerInstanceId: z.string().min(1),
  model: z.string().min(1),
  maxActiveSessions: z.number().int().positive().default(5),
  projects: z.record(z.string(), z.object({ repository: z.string().min(1), baseRef: z.string().min(1) })),
});
export type ServiceConfig = z.infer<typeof serviceConfigSchema>;
export function serviceConfig(path: string) {
  return serviceConfigSchema.parse(JSON.parse(readFileSync(path, "utf8")));
}
export async function validateConfiguration(config: ServiceConfig, t3: Pick<T3Client, "capabilities">) {
  const catalog = await t3.capabilities();
  const provider = catalog.providers.find(item => item.providerInstanceId === config.providerInstanceId);
  if (!provider?.models.some(item => item.id === config.model)) throw new Error("Configured T3 provider/model is unavailable.");
  if (!Object.keys(config.projects).length) throw new Error("Configure at least one T3 project repository and base branch.");
  for (const project of Object.values(config.projects)) {
    const { stdout } = await git("git", ["-C", project.repository, "rev-parse", "--show-toplevel"]);
    if (realpathSync(stdout.trim()) !== realpathSync(project.repository)) throw new Error("Configured repository must be a Git repository root.");
    await git("git", ["-C", project.repository, "check-ref-format", "--branch", project.baseRef]);
    await git("git", ["-C", project.repository, "rev-parse", "--verify", `refs/heads/${project.baseRef}^{commit}`]);
  }
}
