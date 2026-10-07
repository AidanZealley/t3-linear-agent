import { homedir } from "node:os";
import { resolve } from "node:path";
import { z } from "zod";

export function t3Config(env = process.env) {
  return z
    .object({
      endpoint: z.url(),
      credentialFile: z.string(),
      runtimeMode: z.enum([
        "approval-required",
        "auto-accept-edits",
        "auto",
        "full-access",
      ]),
      cli: z.string().optional(),
      baseDir: z.string().optional(),
    })
    .parse({
      endpoint: env.T3_MCP_ENDPOINT ?? "http://127.0.0.1:3773/mcp",
      credentialFile: resolve(
        env.T3_CREDENTIAL_FILE ??
          `${homedir()}/.local/state/t3-linear-agent/t3.json`,
      ),
      runtimeMode: env.T3_RUNTIME_MODE ?? "approval-required",
      ...(env.T3_CLI ? { cli: env.T3_CLI } : {}),
      ...(env.T3_BASE_DIR ? { baseDir: env.T3_BASE_DIR } : {}),
    });
}
export type T3Config = ReturnType<typeof t3Config>;
