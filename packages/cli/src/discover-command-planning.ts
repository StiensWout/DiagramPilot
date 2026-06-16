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
import { usageFailurePlan } from "./source-command-planning.js";
import type { CommandPlan } from "./types.js";

export interface DiscoverCommandPlanningDependencies {
  discoverRepo(options: RepoDiscoveryOptions): Promise<RepoDiscoveryResult>;
}

interface DiscoverCommandOptions {
  json: boolean;
  preset?: RepoDiscoveryPreset;
  target: RepoDiscoveryTarget;
}

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
  json: boolean;
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

const discoverTargets = new Set<RepoDiscoveryTarget>(["code", "packages"]);
const unsupportedWriteOptions = new Set(["--out", "--update", "--force"]);

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

  if (arg === "--json") {
    state.json = true;
    return { ok: true, consumed: 1 };
  }

  return arg === "--preset"
    ? parsePresetOption(args, index, state)
    : unsupportedDiscoverOption(arg);
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

function completeDiscoverOptions(
  state: MutableDiscoverArgs,
): DiscoverArgsResult {
  const target = requireDiscoverTarget(state);
  if (!target.ok) return target;

  const preset = parseOptionalDiscoverPreset(state);
  if (!preset.ok) return preset;

  return {
    ok: true,
    options: {
      json: state.json,
      target: target.value,
      preset: preset.value,
    },
  };
}

function parseDiscoverArgs(args: readonly string[]): DiscoverArgsResult {
  const state: MutableDiscoverArgs = { json: false };
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

export async function planDiscover(
  args: readonly string[],
  dependencies: DiscoverCommandPlanningDependencies,
): Promise<CommandPlan> {
  const argsResult = parseDiscoverArgs(args);

  if (!argsResult.ok) {
    return usageFailurePlan(argsResult.message, discoverUsageText());
  }

  const discoverResult = await dependencies.discoverRepo({
    target: argsResult.options.target,
    preset: argsResult.options.preset,
  });

  if (!discoverResult.ok) {
    return {
      exitCode: 1,
      stdout: "",
      stderr: textLine(discoverResult.failure.message),
      writes: [],
    };
  }

  return {
    exitCode: 0,
    stdout: argsResult.options.json
      ? jsonTextLine(discoverResult)
      : textLine(formatDiscoverTextReport(discoverResult)),
    stderr: "",
    writes: [],
  };
}
