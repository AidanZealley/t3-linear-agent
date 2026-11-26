import type { T3Tools } from "../t3/contracts.ts";

export type ModelSelection = { instanceId: string; model: string; options?: Record<string, string> };
type Harness = "claude-code" | "codex";
type Difficulty = "low" | "medium" | "high";

type Catalog = T3Tools["orchestrator_capabilities"]["output"];

export function hasModelOverride(labels: string[]) {
  return labels.some(label => label.startsWith("harness:") || label.startsWith("difficulty:"));
}

export function selectModel(labels: string[], catalog: Pick<Catalog, "providers">, defaultInstance?: unknown): ModelSelection | undefined {
  if (!hasModelOverride(labels)) return;
  const harnesses = [...new Set(labels.filter(label => label.startsWith("harness:")))];
  const difficulties = [...new Set(labels.filter(label => label.startsWith("difficulty:")))];
  if (harnesses.length > 1 || difficulties.length > 1) throw new Error("Use at most one harness label and one difficulty label, then reply here.");
  const harnessLabel = harnesses[0]?.slice("harness:".length);
  const difficultyLabel = difficulties[0]?.slice("difficulty:".length);
  if (harnessLabel && !["claude-code", "codex"].includes(harnessLabel)) throw new Error("Use harness:claude-code or harness:codex, then reply here.");
  if (difficultyLabel && !["low", "medium", "high"].includes(difficultyLabel)) throw new Error("Use difficulty:low, difficulty:medium or difficulty:high, then reply here.");
  if ((harnesses.length && !harnessLabel) || (difficulties.length && !difficultyLabel)) throw new Error("Routing labels need a harness or difficulty value, then reply here.");
  const defaultHarness = defaultInstance === "claudeAgent" ? "claude-code" : defaultInstance === "codex" ? "codex" : undefined;
  const harness = (harnessLabel ?? defaultHarness) as Harness | undefined;
  if (!harness) throw new Error("Add harness:claude-code or harness:codex to select a difficulty, then reply here.");

  const difficulty = (difficultyLabel ?? "medium") as Difficulty;
  const instanceId = harness === "claude-code" ? "claudeAgent" : "codex";
  const family = harness === "claude-code"
    ? difficulty === "low" ? /^claude-sonnet-(\d+(?:-\d+)*)$/ : /^claude-opus-(\d+(?:-\d+)*)$/
    : difficulty === "low" ? /^gpt-(\d+(?:\.\d+)*)-luna$/ : /^gpt-(\d+(?:\.\d+)*)-sol$/;
  const options: Record<string, string> | undefined = !difficultyLabel ? undefined : harness === "claude-code"
    ? { effort: difficulty }
    : { reasoningEffort: difficulty === "high" ? "high" : "low" };
  const candidates = (catalog.providers.find(item => item.providerInstanceId === instanceId)?.models ?? [])
    .flatMap(({ id }) => {
      const version = family.exec(id)?.[1];
      const selection = { instanceId, model: id, ...(options ? { options } : {}) };
      return version && modelAvailable(selection, catalog) ? [{ version, selection }] : [];
    })
    .sort((a, b) => b.version.localeCompare(a.version, "en", { numeric: true }));
  if (!candidates.length) throw new Error("T3 has no available model in the requested family with that reasoning setting. Update the labels or T3 model settings, then reply here.");
  return candidates[0]!.selection;
}

export function modelAvailable(selection: ModelSelection, catalog: Pick<Catalog, "providers">) {
  const provider = catalog.providers.find(item => item.providerInstanceId === selection.instanceId);
  const model = provider?.models.find(item => item.id === selection.model);
  return !!model && !provider!.constraints.length && Object.entries(selection.options ?? {}).every(([key, value]) => {
    const option = model.options?.find(item => item.id === key);
    if (Array.isArray(option?.values)) return option.values.includes(value);
    return option?.type === "select" && option.options.some(item => item.id === value);
  });
}
