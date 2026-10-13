import type { UncertainOperation } from "../t3/client.ts";
import type { ModelSelection } from "./routing.ts";

export type Session = {
  id: string;
  issueId?: string;
  order: number;
  status: "queued" | "clarification" | "active" | "completed" | "failed" | "stopped" | "paused";
  projectId?: string;
  modelSelection?: ModelSelection;
  threadId?: string;
  runId?: string;
  title: string;
  branch: string;
  inputs: Array<{ key: string; text: string }>;
  seen: string[];
  cursor: number;
  question?: { requestId: string; questions: Array<{ id: string; question: string; options: Array<{ label: string; value?: string | null }> }> };
  lastReportAt: number;
  problem?: string;
  stopPending?: boolean;
};
export type Intent = UncertainOperation & {
  sessionId: string;
  status: "pending" | "confirmed" | "paused";
  result?: { threadId?: string; messageId?: string; runId?: string; sequence?: number };
};
export type Report = {
  id: string;
  sessionId: string;
  type: "thought" | "elicitation" | "response" | "error";
  body: string;
  url?: string;
  attempts: number;
  nextAt: number;
  status: "pending" | "sent" | "failed";
};
export type IssueContext = { identifier: string; projectName?: string; labels?: string[] };
