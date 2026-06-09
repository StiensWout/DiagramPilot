import { createRepairableDiagnosticReport } from "@diagrampilot/core";
import type { ValidatedDiagramSpecLoadFailure } from "@diagrampilot/core";

import type { DiagramPilotMcpToolResult } from "./types.js";

export function toolResult(
  text: string,
  structuredContent: Record<string, unknown>,
  options: { isError?: boolean } = {},
): DiagramPilotMcpToolResult {
  return {
    content: [{ type: "text", text }],
    structuredContent,
    ...(options.isError === undefined ? {} : { isError: options.isError }),
  };
}

export function stringArgument(
  args: Record<string, unknown>,
  name: string,
  fallback?: string,
): string {
  const value = args[name];

  if (typeof value === "string" && value.length > 0) return value;
  if (fallback !== undefined) return fallback;

  throw new Error(`Missing required MCP tool argument: ${name}`);
}

export function stringArrayArgument(
  args: Record<string, unknown>,
  name: string,
): string[] {
  const value = args[name];

  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    throw new Error(`MCP tool argument must be an array: ${name}`);
  }

  return value.filter(
    (entry): entry is string => typeof entry === "string" && entry.length > 0,
  );
}

export function validationFailureResult(
  failure: ValidatedDiagramSpecLoadFailure,
): DiagramPilotMcpToolResult {
  const report = createRepairableDiagnosticReport(failure);

  return toolResult(
    report.text,
    {
      ok: false,
      errorCount: report.errors.length,
      errors: report.errors,
    },
    { isError: true },
  );
}
