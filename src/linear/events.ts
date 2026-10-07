import { z } from "zod";
import { LinearWebhookClient } from "@linear/sdk/webhooks";

// Keep the context composition needs, without copying previous comment history.
export const eventSchema = z.object({
  type: z.literal("AgentSessionEvent"),
  action: z.enum(["created", "prompted"]),
  organizationId: z.string().min(1),
  oauthClientId: z.string().min(1),
  appUserId: z.string().min(1),
  webhookTimestamp: z.number().finite(),
  agentSession: z.object({
    id: z.string().min(1), appUserId: z.string().min(1), organizationId: z.string().min(1),
    issueId: z.string().optional().nullable(),
    issue: z.record(z.string(), z.unknown()).optional().nullable(),
    url: z.string().optional().nullable(),
  }),
  promptContext: z.string().optional().nullable(),
  guidance: z.array(z.record(z.string(), z.unknown())).optional().nullable(),
  agentActivity: z.object({
    id: z.string(), agentSessionId: z.string(), content: z.record(z.string(), z.unknown()),
    signal: z.string().optional().nullable(),
  }).optional().nullable(),
});
export type AgentEvent = z.infer<typeof eventSchema>;
export function verifyEvent(raw: Buffer, signature: string, secret: string) {
  new LinearWebhookClient(secret).verify(raw, signature);
  return eventSchema.parse(JSON.parse(raw.toString("utf8")));
}
