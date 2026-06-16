import {
  repoDiscoveryPresets,
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
import {
  discoverWritePlan,
  type DiscoverCodeWriteOptions,
  type DiscoverSourceWritePlanningDependencies,
} from "./discover-source-write-planning.js";
import { usageFailurePlan } from "./source-command-planning.js";
import type { CommandPlan } from "./types.js";

export interface DiscoverCommandPlanningDependencies
  extends DiscoverSourceWritePlanningDependencies {
  discoverRepo(options: RepoDiscoveryOptions): Promise<RepoDiscoveryResult>;
}

interface DiscoverCommandOptions {
  force: boolean;
  includeFunctions: boolean;
  includeTests: boolean;
  json: boolean;
  outPath?: string;
  preset?: RepoDiscoveryPreset;
  target: RepoDiscoveryTarget;
  update: boolean;
}

type CodeDiscoverySummary = Extract<RepoDiscoverySummary, { target: "code" }>;

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
  force: boolean;
  includeFunctions: boolean;
  includeTests: boolean;
  json: boolean;
  outPath?: string;
  preset?: string;
  target?: string;
  update: boolean;
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
  "--force": (_args, _index, state) => {
    state.force = true;
    return oneTokenResult;
  },
  "--include-functions": (_args, _index, state) => {
    state.includeFunctions = true;
    return oneTokenResult;
  },
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
  "--update": (_args, _index, state) => {
    state.update = true;
    return oneTokenResult;
  },
};

function unsupportedDiscoverOption(arg: string): FlagParseResult {
  return {
    ok: false,
    message: `Unknown discover option: ${arg}`,
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
  const unsupportedOption = [
    [state.includeFunctions, "--include-functions"],
    [state.includeTests, "--include-tests"],
    [state.outPath !== undefined, "--out"],
    [state.force, "--force"],
    [state.update, "--update"],
  ].find(([enabled]) => enabled);

  if (unsupportedOption !== undefined) {
    return {
      ok: false,
      message: `Unsupported discover packages option: ${unsupportedOption[1]}`,
    };
  }

  return { ok: true };
}

function discoverWriteOptionWithoutOutput(
  state: MutableDiscoverArgs,
): string | undefined {
  return state.outPath === undefined ? enabledDiscoverWriteOptions(state)[0] : undefined;
}

function enabledDiscoverWriteOptions(state: MutableDiscoverArgs): string[] {
  return [
    state.force ? "--force" : undefined,
    state.update ? "--update" : undefined,
  ].filter((option): option is string => option !== undefined);
}

function validateDiscoverWriteOptions(
  state: MutableDiscoverArgs,
): { ok: true } | { ok: false; message: string } {
  const missingOutputOption = discoverWriteOptionWithoutOutput(state);
  if (missingOutputOption !== undefined) {
    return {
      ok: false,
      message: `Discover write option requires --out: ${missingOutputOption}`,
    };
  }

  if (state.force && state.update) {
    return {
      ok: false,
      message: "Conflicting discover write options: --update and --force",
    };
  }

  return { ok: true };
}

function validateDiscoverOutputPath(
  state: MutableDiscoverArgs,
): { ok: true } | { ok: false; message: string } {
  const writeOptions = validateDiscoverWriteOptions(state);
  if (!writeOptions.ok) return writeOptions;

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
      force: state.force,
      includeFunctions: state.includeFunctions,
      includeTests: state.includeTests,
      json: state.json,
      outPath: state.outPath,
      target: target.value,
      preset: preset.value,
      update: state.update,
    },
  };
}

function parseDiscoverArgs(args: readonly string[]): DiscoverArgsResult {
  const state: MutableDiscoverArgs = {
    force: false,
    includeFunctions: false,
    includeTests: false,
    json: false,
    update: false,
  };
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
  dependencies: DiscoverCommandPlanningDependencies,
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
    : discoverWritePlan(writeOptions, result as CodeDiscoverySummary, dependencies);
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
    includeFunctions: argsResult.options.includeFunctions,
    includeTests: argsResult.options.includeTests,
    target: argsResult.options.target,
    preset: argsResult.options.preset,
  });

  return discoverResult.ok
    ? discoverSuccessPlan(argsResult.options, discoverResult, dependencies)
    : discoverFailurePlan(discoverResult);
}
