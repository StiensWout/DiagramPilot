import {
  repoDiscoveryPresets,
  serializeDiagramPilotSourceFile,
  type DiagramSpec,
  type DiagramSpecEdge,
  type DiagramSpecNode,
  type RepoDiscoveryOptions,
  type RepoDiscoveryPreset,
  type RepoDiscoveryResult,
  type RepoDiscoverySummary,
  type RepoDiscoveryTarget,
} from "@diagrampilot/core";

import {
  discoverUsageText,
  jsonTextLine,
  textLine,
} from "./cli-output.js";
import { usageFailurePlan } from "./source-command-planning.js";
import type { CommandPlan } from "./types.js";

export interface DiscoverCommandPlanningDependencies {
  discoverRepo(options: RepoDiscoveryOptions): Promise<RepoDiscoveryResult>;
}

interface DiscoverCommandOptions {
  includeTests: boolean;
  json: boolean;
  outPath?: string;
  preset?: RepoDiscoveryPreset;
  target: RepoDiscoveryTarget;
}

type DiscoverCodeWriteOptions = DiscoverCommandOptions & {
  outPath: string;
  target: "code";
};

type CodeDiscoverySummary = Extract<RepoDiscoverySummary, { target: "code" }>;
type CodeDiscoveryModule = CodeDiscoverySummary["modules"][number];
type CodeDiscoveryImportEdge = CodeDiscoverySummary["importEdges"][number];
type InternalCodeDiscoveryImportEdge = CodeDiscoveryImportEdge & {
  kind: "internal";
  to: string;
};

type DiscoverArgsResult =
  | {
      ok: true;
      options: DiscoverCommandOptions;
    }
  | {
      ok: false;
      message: string;
    };

interface MutableDiscoverArgs {
  includeTests: boolean;
  json: boolean;
  outPath?: string;
  preset?: string;
  target?: string;
}

type FlagParseResult =
  | {
      ok: true;
      consumed: number;
    }
  | {
      ok: false;
      message: string;
    };

type ParseResult<T> =
  | {
      ok: true;
      value: T;
    }
  | {
      ok: false;
      message: string;
    };
type DiscoverOptionParser = (
  args: readonly string[],
  index: number,
  state: MutableDiscoverArgs,
) => FlagParseResult;

const discoverTargets = new Set<RepoDiscoveryTarget>(["code", "packages"]);
const unsupportedWriteOptions = new Set(["--update", "--force"]);
const oneTokenResult = { ok: true, consumed: 1 } as const satisfies FlagParseResult;

function isDiscoverTarget(value: string): value is RepoDiscoveryTarget {
  return discoverTargets.has(value as RepoDiscoveryTarget);
}

function isDiscoverPreset(value: string): value is RepoDiscoveryPreset {
  return (repoDiscoveryPresets as readonly string[]).includes(value);
}

function requireFlagValue(
  args: readonly string[],
  index: number,
  missingMessage: string,
): { ok: true; value: string } | { ok: false; message: string } {
  const value = args[index + 1];

  return value === undefined
    ? { ok: false, message: missingMessage }
    : { ok: true, value };
}

function parsePresetOption(
  args: readonly string[],
  index: number,
  state: MutableDiscoverArgs,
): FlagParseResult {
  const value = requireFlagValue(args, index, "Missing discover preset.");
  if (!value.ok) return value;

  if (state.preset !== undefined && state.preset !== value.value) {
    return {
      ok: false,
      message: `Conflicting discover preset: ${value.value}`,
    };
  }

  state.preset = value.value;
  return { ok: true, consumed: 2 };
}

function parseOutOption(
  args: readonly string[],
  index: number,
  state: MutableDiscoverArgs,
): FlagParseResult {
  const value = requireFlagValue(args, index, "Missing discover output path.");
  if (!value.ok) return value;

  if (state.outPath !== undefined && state.outPath !== value.value) {
    return {
      ok: false,
      message: `Conflicting discover output path: ${value.value}`,
    };
  }

  state.outPath = value.value;
  return { ok: true, consumed: 2 };
}

const discoverOptionParsers: Readonly<Record<string, DiscoverOptionParser>> = {
  "--include-tests": (_args, _index, state) => {
    state.includeTests = true;
    return oneTokenResult;
  },
  "--json": (_args, _index, state) => {
    state.json = true;
    return oneTokenResult;
  },
  "--out": parseOutOption,
  "--preset": parsePresetOption,
};

function unsupportedDiscoverOption(arg: string): FlagParseResult {
  const optionKind = unsupportedWriteOptions.has(arg)
    ? "Unsupported discover write option"
    : "Unknown discover option";

  return {
    ok: false,
    message: `${optionKind}: ${arg}`,
  };
}

function parseDiscoverOption(
  args: readonly string[],
  index: number,
  state: MutableDiscoverArgs,
): FlagParseResult {
  const arg = args[index];
  const parser = discoverOptionParsers[arg];

  return parser === undefined
    ? unsupportedDiscoverOption(arg)
    : parser(args, index, state);
}

function parseDiscoverTarget(
  arg: string,
  state: MutableDiscoverArgs,
): FlagParseResult {
  if (state.target !== undefined) {
    return {
      ok: false,
      message: `Unexpected discover argument: ${arg}`,
    };
  }

  state.target = arg;
  return { ok: true, consumed: 1 };
}

function parseDiscoverToken(
  args: readonly string[],
  index: number,
  state: MutableDiscoverArgs,
): FlagParseResult {
  const arg = args[index];

  return arg.startsWith("-")
    ? parseDiscoverOption(args, index, state)
    : parseDiscoverTarget(arg, state);
}

function parseDiscoverTokens(
  args: readonly string[],
  state: MutableDiscoverArgs,
): { ok: true } | { ok: false; message: string } {
  let index = 0;
  while (index < args.length) {
    const result = parseDiscoverToken(args, index, state);
    if (!result.ok) return result;
    index += result.consumed;
  }

  return { ok: true };
}

function requireDiscoverTarget(
  state: MutableDiscoverArgs,
): ParseResult<RepoDiscoveryTarget> {
  if (state.target === undefined) {
    return { ok: false, message: "Missing discover target." };
  }

  return isDiscoverTarget(state.target)
    ? { ok: true, value: state.target }
    : {
        ok: false,
        message: `Unsupported discover target: ${state.target}`,
      };
}

function parseOptionalDiscoverPreset(
  state: MutableDiscoverArgs,
): ParseResult<RepoDiscoveryPreset | undefined> {
  if (state.preset === undefined) {
    return { ok: true, value: undefined };
  }

  return isDiscoverPreset(state.preset)
    ? { ok: true, value: state.preset }
    : {
        ok: false,
        message: `Unsupported discover preset: ${state.preset}`,
      };
}

function validateTargetSpecificDiscoverOptions(
  target: RepoDiscoveryTarget,
  state: MutableDiscoverArgs,
): { ok: true } | { ok: false; message: string } {
  const packageOptions =
    target === "packages" ? validateDiscoverPackagesOptions(state) : undefined;

  return packageOptions?.ok === false
    ? packageOptions
    : validateDiscoverOutputPath(state);
}

function validateDiscoverPackagesOptions(
  state: MutableDiscoverArgs,
): { ok: true } | { ok: false; message: string } {
  if (state.includeTests) {
    return {
      ok: false,
      message: "Unsupported discover packages option: --include-tests",
    };
  }

  if (state.outPath !== undefined) {
    return {
      ok: false,
      message: "Unsupported discover packages option: --out",
    };
  }

  return { ok: true };
}

function validateDiscoverOutputPath(
  state: MutableDiscoverArgs,
): { ok: true } | { ok: false; message: string } {
  if (state.outPath !== undefined && !state.outPath.endsWith(".dp.yaml")) {
    return {
      ok: false,
      message: "Discover output path must end with .dp.yaml.",
    };
  }

  return { ok: true };
}

function completeDiscoverOptions(
  state: MutableDiscoverArgs,
): DiscoverArgsResult {
  const target = requireDiscoverTarget(state);
  if (!target.ok) return target;

  const preset = parseOptionalDiscoverPreset(state);
  if (!preset.ok) return preset;

  const targetOptions = validateTargetSpecificDiscoverOptions(target.value, state);
  if (!targetOptions.ok) return targetOptions;

  return {
    ok: true,
    options: {
      includeTests: state.includeTests,
      json: state.json,
      outPath: state.outPath,
      target: target.value,
      preset: preset.value,
    },
  };
}

function parseDiscoverArgs(args: readonly string[]): DiscoverArgsResult {
  const state: MutableDiscoverArgs = { includeTests: false, json: false };
  const result = parseDiscoverTokens(args, state);

  return result.ok ? completeDiscoverOptions(state) : result;
}

function formatDiscoverTextReport(result: RepoDiscoverySummary): string {
  return [
    `Discovery ${result.target} preset: ${result.preset}`,
    `Includes: ${result.include.join(", ")}`,
    `Excludes: ${result.exclude.join(", ")}`,
    "Read-only: no files written",
  ].join("\n");
}

function stableIdToken(value: string): string {
  const token = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "_")
    .replace(/^_+|_+$/gu, "");

  return token === "" ? "unknown" : token;
}

function codeModuleNodeId(modulePath: string): string {
  return `file_${stableIdToken(modulePath)}`;
}

function codeModuleNode(module: CodeDiscoveryModule): DiagramSpecNode {
  return {
    id: codeModuleNodeId(module.path),
    label: module.path,
    kind: "module",
    metadata: {
      source: module.path,
    },
  };
}

function uniqueStableId(
  baseId: string,
  seenIds: Map<string, number>,
): string {
  const seenCount = seenIds.get(baseId) ?? 0;
  seenIds.set(baseId, seenCount + 1);

  return seenCount === 0 ? baseId : `${baseId}_${seenCount + 1}`;
}

function internalImportEdges(
  result: CodeDiscoverySummary,
): readonly InternalCodeDiscoveryImportEdge[] {
  return result.importEdges.filter(
    (edge): edge is InternalCodeDiscoveryImportEdge =>
      edge.kind === "internal" && edge.to !== null,
  );
}

function codeImportEdges(result: CodeDiscoverySummary): DiagramSpecEdge[] {
  const seenIds = new Map<string, number>();

  return internalImportEdges(result).map((edge) => {
    const fromId = codeModuleNodeId(edge.from);
    const toId = codeModuleNodeId(edge.to);

    return {
      id: uniqueStableId(`import_${fromId}_to_${toId}`, seenIds),
      from: fromId,
      to: toId,
      label: edge.specifier,
      kind: "dependency",
      metadata: {
        source: edge.from,
        importSpecifier: edge.specifier,
      },
    };
  });
}

function createCodeDiscoveryDiagramSpec(result: CodeDiscoverySummary): DiagramSpec {
  return {
    version: 1,
    title: "Codebase Map",
    direction: "right",
    nodes: result.modules.map(codeModuleNode),
    edges: codeImportEdges(result),
    metadata: {
      source: "**/*.{js,jsx,ts,tsx,mts,cts}",
      generatedBy: "diagrampilot discover code",
    },
  };
}

function serializeCodeDiscoverySourceFile(result: CodeDiscoverySummary): string {
  return serializeDiagramPilotSourceFile(createCodeDiscoveryDiagramSpec(result));
}

function discoverWriteTextOutput(options: DiscoverCodeWriteOptions): string {
  const outPath = options.outPath;
  return [
    `Wrote ${outPath}.`,
    `Next: diagrampilot validate ${outPath}`,
    `Inspect: diagrampilot inspect ${outPath} --json`,
    "",
  ].join("\n");
}

function discoverWriteJsonOutput(
  options: DiscoverCodeWriteOptions,
  result: CodeDiscoverySummary,
): string {
  return jsonTextLine({
    ok: true,
    command: "discover",
    target: "code",
    mode: "source",
    output: options.outPath,
    readOnly: false,
    files: result.files,
    nodes: result.modules.length,
    edges: result.importEdges.filter((edge) => edge.kind === "internal").length,
  });
}

function discoverWritePlan(
  options: DiscoverCodeWriteOptions,
  result: CodeDiscoverySummary,
): CommandPlan {
  const content = serializeCodeDiscoverySourceFile(result);

  return {
    exitCode: 0,
    stdout: options.json
      ? discoverWriteJsonOutput(options, result)
      : discoverWriteTextOutput(options),
    stderr: "",
    writes: [
      {
        path: options.outPath,
        content,
      },
    ],
  };
}

function discoverFailurePlan(
  result: Extract<RepoDiscoveryResult, { ok: false }>,
): CommandPlan {
  return {
    exitCode: 1,
    stdout: "",
    stderr: textLine(result.failure.message),
    writes: [],
  };
}

function createDiscoverCodeWriteOptions(
  options: DiscoverCommandOptions,
  result: RepoDiscoverySummary,
): DiscoverCodeWriteOptions | undefined {
  return options.outPath !== undefined &&
    options.target === "code" &&
    result.target === "code"
    ? {
        ...options,
        outPath: options.outPath,
        target: "code",
      }
    : undefined;
}

function discoverSuccessPlan(
  options: DiscoverCommandOptions,
  result: RepoDiscoverySummary,
): CommandPlan {
  const writeOptions = createDiscoverCodeWriteOptions(options, result);

  return writeOptions === undefined
    ? {
        exitCode: 0,
        stdout: options.json
          ? jsonTextLine(result)
          : textLine(formatDiscoverTextReport(result)),
        stderr: "",
        writes: [],
      }
    : discoverWritePlan(writeOptions, result as CodeDiscoverySummary);
}

export async function planDiscover(
  args: readonly string[],
  dependencies: DiscoverCommandPlanningDependencies,
): Promise<CommandPlan> {
  const argsResult = parseDiscoverArgs(args);

  if (!argsResult.ok) {
    return usageFailurePlan(argsResult.message, discoverUsageText());
  }

  const discoverResult = await dependencies.discoverRepo({
    includeTests: argsResult.options.includeTests,
    target: argsResult.options.target,
    preset: argsResult.options.preset,
  });

  return discoverResult.ok
    ? discoverSuccessPlan(argsResult.options, discoverResult)
    : discoverFailurePlan(discoverResult);
}
