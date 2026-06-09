import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  loadValidatedDiagramSpec,
  serializeDiagramPilotSourceFile,
  type DiagramSpec,
  validateDiagramSpec,
} from "@diagrampilot/core";

import type {
  DiagramPilotMcpToolDependencies,
  DiagramPilotMcpToolResult,
} from "./types.js";
import {
  stringArgument,
  stringArrayArgument,
  toolResult,
  validationFailureResult,
} from "./tool-helpers.js";

function diagramArgument(args: Record<string, unknown>, name: string): DiagramSpec {
  const value = args[name];

  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    return value as DiagramSpec;
  }

  throw new Error(`Missing required MCP tool argument: ${name}`);
}

function sourceFileExists(sourcePath: string): boolean {
  try {
    readFileSync(sourcePath, "utf8");
    return true;
  } catch {
    return false;
  }
}

function itemCount(items: readonly unknown[] | undefined): number {
  return items === undefined ? 0 : items.length;
}

function diagramSummary(spec: DiagramSpec): Record<string, unknown> {
  return {
    exists: true,
    valid: true,
    nodeCount: spec.nodes.length,
    edgeCount: itemCount(spec.edges),
    groupCount: itemCount(spec.groups),
  };
}

function sourceCreationErrorResult(
  structuredContent: Record<string, unknown>,
): DiagramPilotMcpToolResult {
  return toolResult(
    `${JSON.stringify(structuredContent, null, 2)}\n`,
    structuredContent,
    { isError: true },
  );
}

function stableIdBase(label: string): string {
  const parts = label.toLowerCase().match(/[a-z0-9]+/gu) ?? [];
  const base = parts.join("_");

  if (base.length === 0) return "diagram_item";
  if (/^[a-z]/u.test(base)) return base;

  return `id_${base}`;
}

function nextStableId(base: string, usedIds: Set<string>): string {
  if (!usedIds.has(base)) {
    usedIds.add(base);
    return base;
  }

  for (let index = 2; ; index += 1) {
    const candidate = `${base}_${index}`;
    if (!usedIds.has(candidate)) {
      usedIds.add(candidate);
      return candidate;
    }
  }
}

function sourcePathErrorContent(
  sourcePath: string,
  before: Record<string, boolean>,
): Record<string, unknown> | undefined {
  if (/\.dp\.yaml$/iu.test(sourcePath)) return undefined;

  return {
    ok: false,
    sourcePath,
    writtenPaths: [],
    before,
    errors: [
      {
        path: "source_path",
        message: "source_path must be a *.dp.yaml DiagramPilot Source File.",
        badValue: sourcePath,
        expected: "*.dp.yaml DiagramPilot Source File path.",
        suggestion: "Use a path such as docs/architecture.dp.yaml.",
      },
    ],
  };
}

function diagramValidationErrorContent(
  sourcePath: string,
  before: Record<string, boolean>,
  spec: DiagramSpec,
): Record<string, unknown> | undefined {
  const validation = validateDiagramSpec(spec);
  if (validation.ok) return undefined;

  return {
    ok: false,
    sourcePath,
    writtenPaths: [],
    before,
    errors: validation.errors,
  };
}

function preWriteSourceCreationError(
  sourcePath: string,
  before: Record<string, boolean>,
  spec: DiagramSpec,
): DiagramPilotMcpToolResult | undefined {
  const errorContent =
    sourcePathErrorContent(sourcePath, before) ??
    diagramValidationErrorContent(sourcePath, before, spec);

  return errorContent === undefined
    ? undefined
    : sourceCreationErrorResult(errorContent);
}

export async function createSourceTool(
  args: Record<string, unknown>,
  dependencies: DiagramPilotMcpToolDependencies,
): Promise<DiagramPilotMcpToolResult> {
  const sourcePath = stringArgument(args, "source_path");
  const spec = diagramArgument(args, "diagram");
  const before = { exists: sourceFileExists(sourcePath) };
  const preWriteError = preWriteSourceCreationError(sourcePath, before, spec);
  if (preWriteError !== undefined) return preWriteError;

  const content = serializeDiagramPilotSourceFile(spec);
  mkdirSync(path.dirname(sourcePath), { recursive: true });
  const write = dependencies.writeFile ?? writeFileSync;
  write(sourcePath, content);

  const loaded = loadValidatedDiagramSpec(sourcePath);
  if (!loaded.ok) return validationFailureResult(loaded.failure);

  const structuredContent = {
    ok: true,
    sourcePath,
    writtenPaths: [sourcePath],
    before,
    after: diagramSummary(loaded.spec),
  };

  return toolResult(
    `${JSON.stringify(structuredContent, null, 2)}\n`,
    structuredContent,
  );
}

export async function suggestStableIdsTool(
  args: Record<string, unknown>,
): Promise<DiagramPilotMcpToolResult> {
  const labels = stringArrayArgument(args, "labels");
  const usedIds = new Set(stringArrayArgument(args, "existing_ids"));
  const suggestions = labels.map((label) => ({
    label,
    id: nextStableId(stableIdBase(label), usedIds),
  }));
  const structuredContent = { ok: true, suggestions };

  return toolResult(
    `${JSON.stringify(structuredContent, null, 2)}\n`,
    structuredContent,
  );
}
