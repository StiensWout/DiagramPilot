import {
  applyDiscoverSourceUpdate,
  createCodeDiscoveryDiagramSpec,
  serializeDiagramPilotSourceFile,
  type DiscoverSourceUpdateChangeSummary,
  type RepoDiscoveryPreset,
  type RepoDiscoverySummary,
  type ValidatedDiagramSpecLoadResult,
} from "@diagrampilot/core";

import { jsonTextLine } from "./cli-output.js";
import { commandFailurePlan } from "./source-command-planning.js";
import type { CommandPlan } from "./types.js";

export interface DiscoverCodeWriteOptions {
  force: boolean;
  includeFunctions: boolean;
  includeTests: boolean;
  json: boolean;
  outPath: string;
  preset?: RepoDiscoveryPreset;
  target: "code";
  update: boolean;
}

export interface DiscoverSourceWritePlanningDependencies {
  loadValidatedDiagramSpec?(path: string): ValidatedDiagramSpecLoadResult;
  pathExists?(path: string): boolean;
}

type CodeDiscoverySummary = Extract<RepoDiscoverySummary, { target: "code" }>;

function formatDiscoverUpdateChanges(
  changes: DiscoverSourceUpdateChangeSummary,
): string {
  return [
    `added ${changes.added}`,
    `removed ${changes.removed}`,
    `changed ${changes.changed}`,
    `unmatched ${changes.unmatched}`,
  ].join(", ");
}

function discoverWriteTextOutput(
  options: DiscoverCodeWriteOptions,
  existingOutput: boolean,
  changes?: DiscoverSourceUpdateChangeSummary,
): string {
  if (options.update && changes !== undefined) {
    return discoverUpdateTextOutput(options, changes);
  }

  return options.force
    ? discoverForceTextOutput(options, existingOutput)
    : discoverCreateTextOutput(options);
}

function discoverUpdateTextOutput(
  options: DiscoverCodeWriteOptions,
  changes: DiscoverSourceUpdateChangeSummary,
): string {
  return [
    `Updated ${options.outPath}.`,
    `Changes: ${formatDiscoverUpdateChanges(changes)}.`,
    "Stable IDs preserved where existing generated elements matched discovered sources.",
    `Next: diagrampilot validate ${options.outPath}`,
    `Inspect: diagrampilot inspect ${options.outPath} --json`,
    "",
  ].join("\n");
}

function discoverForceTextOutput(
  options: DiscoverCodeWriteOptions,
  existingOutput: boolean,
): string {
  return [
    existingOutput
      ? `Replaced ${options.outPath} with newly discovered source.`
      : `Force wrote ${options.outPath}; existing output would be replaced when present.`,
    `Next: diagrampilot validate ${options.outPath}`,
    `Inspect: diagrampilot inspect ${options.outPath} --json`,
    "",
  ].join("\n");
}

function discoverCreateTextOutput(options: DiscoverCodeWriteOptions): string {
  return [
    `Wrote ${options.outPath}.`,
    `Next: diagrampilot validate ${options.outPath}`,
    `Inspect: diagrampilot inspect ${options.outPath} --json`,
    "",
  ].join("\n");
}

function discoverWriteFailurePlan(message: string, json: boolean): CommandPlan {
  return commandFailurePlan(message, json);
}

function discoverOverwriteFailurePlan(
  options: DiscoverCodeWriteOptions,
): CommandPlan {
  return discoverWriteFailurePlan(
    [
      `DiagramPilot discovery output already exists: ${options.outPath}`,
      "Suggestion: choose a new output path or rerun discover with --update or --force.",
    ].join("\n"),
    options.json,
  );
}

function discoverWriteJsonOutput(
  options: DiscoverCodeWriteOptions,
  result: CodeDiscoverySummary,
  existingOutput: boolean,
  changes?: DiscoverSourceUpdateChangeSummary,
): string {
  return jsonTextLine({
    ok: true,
    command: "discover",
    target: "code",
    mode: "source",
    output: options.outPath,
    readOnly: false,
    ...(options.force
      ? {
          writeMode: "force",
          replaced: existingOutput,
        }
      : {}),
    ...(options.update
      ? {
          writeMode: "update",
          changes,
        }
      : {}),
    files: result.files,
    nodes: discoverWriteNodeCount(options, result),
    edges: discoverWriteEdgeCount(options, result),
  });
}

function discoverMissingUpdateTargetPlan(
  options: DiscoverCodeWriteOptions,
): CommandPlan {
  return discoverWriteFailurePlan(
    [
      `DiagramPilot discovery output does not exist: ${options.outPath}`,
      "Suggestion: run discover without --update to create it first.",
    ].join("\n"),
    options.json,
  );
}

function discoverUpdateLoadFailurePlan(
  options: DiscoverCodeWriteOptions,
  result: Extract<ValidatedDiagramSpecLoadResult, { ok: false }>,
): CommandPlan {
  const message =
    "message" in result.failure
      ? result.failure.message
      : `${result.failure.errors.length} validation error(s).`;

  return discoverWriteFailurePlan(
    [
      `Unable to update existing discovery output: ${options.outPath}`,
      message,
    ].join("\n"),
    options.json,
  );
}

function discoverWriteNodeCount(
  options: DiscoverCodeWriteOptions,
  result: CodeDiscoverySummary,
): number {
  return options.includeFunctions
    ? (result.functions ?? []).length
    : result.modules.length;
}

function discoverWriteEdgeCount(
  options: DiscoverCodeWriteOptions,
  result: CodeDiscoverySummary,
): number {
  return options.includeFunctions
    ? (result.functionCallEdges ?? []).length
    : result.importEdges.filter((edge) => edge.kind === "internal").length;
}

function updateWritePlan(options: {
  existingSpec: Extract<ValidatedDiagramSpecLoadResult, { ok: true }>;
  existingOutput: boolean;
  options: DiscoverCodeWriteOptions;
  result: CodeDiscoverySummary;
}): CommandPlan {
  const update = applyDiscoverSourceUpdate(
    options.existingSpec.spec,
    createCodeDiscoveryDiagramSpec(options.options, options.result),
  );
  const content = serializeDiagramPilotSourceFile(update.spec);

  return {
    exitCode: 0,
    stdout: options.options.json
      ? discoverWriteJsonOutput(
          options.options,
          options.result,
          options.existingOutput,
          update.changes,
        )
      : discoverWriteTextOutput(
          options.options,
          options.existingOutput,
          update.changes,
        ),
    stderr: "",
    writes: [
      {
        path: options.options.outPath,
        content,
      },
    ],
  };
}

function updateWritePreflightPlan(
  options: DiscoverCodeWriteOptions,
  dependencies: DiscoverSourceWritePlanningDependencies,
  existingOutput: boolean,
  result: CodeDiscoverySummary,
): CommandPlan {
  if (!existingOutput) return discoverMissingUpdateTargetPlan(options);

  const existingSpec = loadExistingUpdateSpec(options, dependencies);
  if (!existingSpec.ok) return existingSpec.plan;

  return updateWritePlan({
    existingSpec: existingSpec.result,
    existingOutput,
    options,
    result,
  });
}

function loadExistingUpdateSpec(
  options: DiscoverCodeWriteOptions,
  dependencies: DiscoverSourceWritePlanningDependencies,
):
  | {
      ok: true;
      result: Extract<ValidatedDiagramSpecLoadResult, { ok: true }>;
    }
  | {
      ok: false;
      plan: CommandPlan;
    } {
  const result = dependencies.loadValidatedDiagramSpec?.(options.outPath);

  if (result === undefined) {
    return {
      ok: false,
      plan: discoverWriteFailurePlan(
        "Unable to update existing discovery output: no source loader is available.",
        options.json,
      ),
    };
  }

  return result.ok
    ? { ok: true, result }
    : { ok: false, plan: discoverUpdateLoadFailurePlan(options, result) };
}

function createWritePlan(
  options: DiscoverCodeWriteOptions,
  result: CodeDiscoverySummary,
  existingOutput: boolean,
): CommandPlan {
  const content = serializeDiagramPilotSourceFile(
    createCodeDiscoveryDiagramSpec(options, result),
  );

  return {
    exitCode: 0,
    stdout: options.json
      ? discoverWriteJsonOutput(options, result, existingOutput)
      : discoverWriteTextOutput(options, existingOutput),
    stderr: "",
    writes: [
      {
        path: options.outPath,
        content,
      },
    ],
  };
}

export function discoverWritePlan(
  options: DiscoverCodeWriteOptions,
  result: CodeDiscoverySummary,
  dependencies: DiscoverSourceWritePlanningDependencies,
): CommandPlan {
  const existingOutput = dependencies.pathExists?.(options.outPath) === true;

  if (options.update) {
    return updateWritePreflightPlan(options, dependencies, existingOutput, result);
  }

  return shouldRefuseDiscoverWrite(options, existingOutput)
    ? discoverOverwriteFailurePlan(options)
    : createWritePlan(options, result, existingOutput);
}

function shouldRefuseDiscoverWrite(
  options: DiscoverCodeWriteOptions,
  existingOutput: boolean,
): boolean {
  return existingOutput && !options.force;
}
