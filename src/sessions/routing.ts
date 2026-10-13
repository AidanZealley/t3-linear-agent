import type { ServiceConfig } from "./config.ts";
import type { T3Tools } from "../t3/contracts.ts";

export type ModelSelection = { instanceId: string; model: string; options?: Record<string, string> };
type Harness = "claude-code" | "codex";
type Difficulty = "low" | "medium" | "high";

export function selectModel(labels: string[], config: ServiceConfig): ModelSelection {
  const harnesses = [...new Set(labels.filter(label => label.startsWith("harness:")))];
  const difficulties = [...new Set(labels.filter(label => label.startsWith("difficulty:")))];
  if (harnesses.length > 1 || difficulties.length > 1) throw new Error("Use at most one harness label and one difficulty label, then reply here.");
  const harnessLabel = harnesses[0]?.slice("harness:".length);
  const difficultyLabel = difficulties[0]?.slice("difficulty:".length);
  if (harnessLabel && !["claude-code", "codex"].includes(harnessLabel)) throw new Error("Use harness:claude-code or harness:codex, then reply here.");
  if (difficultyLabel && !["low", "medium", "high"].includes(difficultyLabel)) throw new Error("Use difficulty:low, difficulty:medium or difficulty:high, then reply here.");
  if ((harnesses.length && !harnessLabel) || (difficulties.length && !difficultyLabel)) throw new Error("Routing labels need a harness or difficulty value, then reply here.");
  const defaultHarness = config.providerInstanceId === "claudeAgent" ? "claude-code" : config.providerInstanceId === "codex" ? "codex" : undefined;
  const harness = (harnessLabel ?? defaultHarness) as Harness | undefined;
  const difficulty = (difficultyLabel ?? "medium") as Difficulty;
  if (!harness) {
    if (difficultyLabel) throw new Error("Add harness:claude-code or harness:codex to select a difficulty, then reply here.");
    return { instanceId: config.providerInstanceId, model: config.model };
  }
  if (harness === "claude-code") return {
    instanceId: "claudeAgent", model: difficulty === "low" ? "claude-sonnet-5-5" : "claude-opus-5-5",
    options: { effort: difficulty },
  };
  return {
    instanceId: "codex", model: difficulty === "low" ? "gpt-6-luna" : "gpt-6.1-sol",
    options: { reasoningEffort: difficulty === "high" ? "high" : "low" },
  };
}

export function modelAvailable(selection: ModelSelection, catalog: T3Tools["orchestrator_capabilities"]["output"]) {
  const provider = catalog.providers.find(item => item.providerInstanceId === selection.instanceId);
  const model = provider?.models.find(item => item.id === selection.model);
  return !!model && !provider!.constraints.length && Object.entries(selection.options ?? {}).every(([key, value]) => {
    const option = model.options?.find(item => item.id === key);
    return option?.type === "select" && option.options.some(item => item.id === value);
  });
}
