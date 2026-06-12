import { fixUsageText, jsonTextLine, textLine } from "./cli-output.js";
import type { CommandPlanningDependencies } from "./command-planning-dependencies.js";
import { usageFailurePlan } from "./source-command-planning.js";
import type { CommandPlan } from "./types.js";

type FixResult = ReturnType<CommandPlanningDependencies["planDiagramPilotSourceFix"]>;
type SuccessfulFixResult = Extract<FixResult, { ok: true }>;
type FailedFixResult = Extract<FixResult, { ok: false }>;

type FixArgsResult =
  | {
      ok: true;
      options: {
        sourcePath: string;
        json: boolean;
        fallbackIcon?: string;
      };
    }
  | {
      ok: false;
      message: string;
    };

interface FixParseState {
  sourcePath?: string;
  json: boolean;
  fallbackIcon?: string;
}

type FixParseFailure = Extract<FixArgsResult, { ok: false }>;
type FixParseStepResult =
  | FixParseFailure
  | {
      ok: true;
      state: FixParseState;
      nextIndex: number;
    };
type FixPositionalParseResult =
  | FixParseFailure
  | {
      ok: true;
      state: FixParseState;
    };

function parseFixValueArg(
  args: readonly string[],
  index: number,
  state: FixParseState,
): FixParseStepResult {
  const fallbackIcon = args[index + 1];

  if (fallbackIcon === undefined) {
    return { ok: false, message: "Missing fallback icon." };
  }

  return {
    ok: true,
    state: {
      ...state,
      fallbackIcon,
    },
    nextIndex: index + 2,
  };
}

function parseFixPositionalArg(
  arg: string,
  state: FixParseState,
): FixPositionalParseResult {
  if (arg.startsWith("-")) {
    return { ok: false, message: `Unknown fix option: ${arg}` };
  }

  if (state.sourcePath !== undefined) {
    return { ok: false, message: `Unexpected fix argument: ${arg}` };
  }

  return {
    ok: true,
    state: {
      ...state,
      sourcePath: arg,
    },
  };
}

function parseFixArg(
  args: readonly string[],
  index: number,
  state: FixParseState,
): FixParseStepResult {
  const arg = args[index];

  if (arg === "--json") {
    return {
      ok: true,
      state: { ...state, json: true },
      nextIndex: index + 1,
    };
  }

  if (arg === "--fallback-icon") {
    return parseFixValueArg(args, index, state);
  }

  const result = parseFixPositionalArg(arg, state);
  if (!result.ok) return result;

  return {
    ok: true,
    state: result.state,
    nextIndex: index + 1,
  };
}

function parseFixArgs(args: readonly string[]): FixArgsResult {
  let state: FixParseState = { json: false };
  let index = 0;

  while (index < args.length) {
    const result = parseFixArg(args, index, state);
    if (!result.ok) return result;

    state = result.state;
    index = result.nextIndex;
  }

  if (state.sourcePath === undefined) {
    return { ok: false, message: "Missing source path." };
  }

  return {
    ok: true,
    options: {
      sourcePath: state.sourcePath,
      json: state.json,
      fallbackIcon: state.fallbackIcon,
    },
  };
}

function fixUsagePlan(message: string): CommandPlan {
  return usageFailurePlan(message, fixUsageText());
}

function fixJsonPlan(result: FixResult): CommandPlan {
  return {
    exitCode: result.ok ? 0 : 1,
    stdout: jsonTextLine({
      file: result.sourcePath,
      ok: result.ok,
      changed: result.changed,
      repairs: result.repairs,
      validation: result.validation,
    }),
    stderr: "",
    writes: [],
  };
}

function formatFixTextSuccess(result: SuccessfulFixResult): string {
  if (!result.changed) {
    return `No deterministic fixes needed for ${result.sourcePath}.`;
  }

  const repairCount = result.repairs.length;
  return `Fixed ${result.sourcePath} with ${repairCount} deterministic repair${
    repairCount === 1 ? "" : "s"
  }.`;
}

function formatFixFailureDiagnostic(
  error: FailedFixResult["validation"]["errors"][number],
): string {
  return `${error.path}: ${error.message} Suggestion: ${error.suggestion}`;
}

function fixTextFailurePlan(result: FailedFixResult): CommandPlan {
  return {
    exitCode: 1,
    stdout: "",
    stderr: textLine(
      [
        `Unable to fix ${result.sourcePath}.`,
        ...result.validation.errors.map(formatFixFailureDiagnostic),
      ].join("\n"),
    ),
    writes: [],
  };
}

function fixTextPlan(result: FixResult): CommandPlan {
  if (!result.ok) {
    return fixTextFailurePlan(result);
  }

  return {
    exitCode: 0,
    stdout: textLine(formatFixTextSuccess(result)),
    stderr: "",
    writes: result.changed
      ? [
          {
            path: result.sourcePath,
            content: result.content,
          },
        ]
      : [],
  };
}

export function planFix(
  args: readonly string[],
  dependencies: CommandPlanningDependencies,
): CommandPlan {
  const argsResult = parseFixArgs(args);

  if (!argsResult.ok) {
    return fixUsagePlan(argsResult.message);
  }

  const result = dependencies.planDiagramPilotSourceFix(
    argsResult.options.sourcePath,
    {
      fallbackIcon: argsResult.options.fallbackIcon,
    },
  );

  return argsResult.options.json ? fixJsonPlan(result) : fixTextPlan(result);
}
