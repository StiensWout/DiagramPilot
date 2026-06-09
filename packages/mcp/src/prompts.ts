import { DIAGRAMPILOT_MCP_PROMPTS } from "./registry.js";
import type { DiagramPilotMcpPromptResult } from "./types.js";

function createOrUpdatePrompt(args: Record<string, string>): string {
  const scopePath = args.scope_path ?? ".";
  const sourcePath = args.source_path ?? "docs/architecture.dp.yaml";

  return [
    `Goal: ${args.goal ?? "Create or update a DiagramPilot Source File."}`,
    "",
    `Inspect ${scopePath} for repo context, then create or update ${sourcePath}.`,
    "Use DiagramSpec stable IDs, preserve YAML as the source of truth, and run:",
    "",
    `diagrampilot validate ${sourcePath}`,
    `diagrampilot check ${scopePath}`,
    "",
  ].join("\n");
}

function repairValidationPrompt(args: Record<string, string>): string {
  const sourcePath = args.source_path ?? "docs/architecture.dp.yaml";

  return [
    `Repair DiagramPilot validation errors in ${sourcePath}.`,
    "",
    "Use these repairable errors as the source of truth:",
    "",
    args.validation_errors ?? "<paste validation errors>",
    "",
    `After editing, run diagrampilot validate ${sourcePath}.`,
    "",
  ].join("\n");
}

function refreshArtifactsPrompt(args: Record<string, string>): string {
  const scopePath = args.scope_path ?? ".";

  return [
    `Refresh DiagramPilot Derived Artifacts under ${scopePath}.`,
    "",
    `First run diagrampilot check ${scopePath}.`,
    `Then run diagrampilot generate ${scopePath} for stale or missing generated artifacts.`,
    "Do not hand-edit generated artifacts.",
    "",
  ].join("\n");
}

const promptTextHandlers: Record<string, (args: Record<string, string>) => string> = {
  create_or_update_diagrampilot_source: createOrUpdatePrompt,
  repair_diagrampilot_validation_errors: repairValidationPrompt,
  refresh_diagrampilot_artifacts: refreshArtifactsPrompt,
};

export function getDiagramPilotMcpPrompt(
  name: string,
  args: Record<string, string> = {},
): DiagramPilotMcpPromptResult {
  const prompt = DIAGRAMPILOT_MCP_PROMPTS.find((entry) => entry.name === name);
  const promptText = promptTextHandlers[name];

  if (prompt === undefined || promptText === undefined) {
    throw new Error(`Unknown DiagramPilot MCP prompt: ${name}`);
  }

  return {
    description: prompt.title,
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: promptText(args),
        },
      },
    ],
  };
}
