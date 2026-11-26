import { readFileSync } from "node:fs";
import { z } from "zod";

export const serviceConfigSchema = z.object({
  maxActiveSessions: z.number().int().positive().default(5),
});
export type ServiceConfig = z.infer<typeof serviceConfigSchema>;

export function serviceConfig(path: string) {
  return serviceConfigSchema.parse(JSON.parse(readFileSync(path, "utf8")));
}
