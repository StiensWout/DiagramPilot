import {
  createDiagramSpecDiffDiagram,
  type DiagramSpecDiffResult,
  type ValidatedDiagramSpecLoadResult,
} from "@diagrampilot/core";

import { diffUsageText, jsonTextLine, textLine } from "./cli-output.js";
import type { CommandPlanningDependencies } from "./command-planning-dependencies.js";
import {
  repairableDiagnosticFailurePlan,
  usageFailurePlan,
} from "./source-command-planning.js";
import type { CommandPlan } from "./types.js";

type SuccessfulValidatedDiagramSpecLoadResult = Extract<
  ValidatedDiagramSpecLoadResult,
  { ok: true }
>;
type LoadedDiagramSpecOrPlan =
  | {
      ok: true;
      result: SuccessfulValidatedDiagramSpecLoadResult;
    }
  | {
      ok: false;
      plan: CommandPlan;
    };

interface DiffParseState {
  json: boolean;
  outPath?: string;
  positional: string[];
}

interface DiffParseProgress {
  nextIndex: number;
  state: DiffParseState;
}

type DiffParseProgressResult =
  | {
      ok: true;
      progress: DiffParseProgress;
    }
  | {
      ok: false;
      message: string;
    };

interface DiffCommandOptions {
  afterPath: string;
  beforePath: string;
  json: boolean;
  outPath?: string;
}

type DiffArgsResult =
  | {
      ok: true;
      options: DiffCommandOptions;
    }
  | {
      ok: false;
      message: string;
    };

function parseDiffOutArg(
  args: readonly string[],
  index: number,
  state: DiffParseState,
): DiffParseProgressResult {
  const value = args[index + 1];
  if (value === undefined) {
    return { ok: false, message: "Missing diff output path." };
  }

  return {
    ok: true,
    progress: {
      nextIndex: index + 1,
      state: { ...state, outPath: value },
    },
  };
}

function parseDiffArg(
  args: readonly string[],
  index: number,
  state: DiffParseState,
): DiffParseProgressResult {
  const arg = args[index];

  if (arg === "--json") {
    return {
      ok: true,
      progress: {
        nextIndex: index,
        state: { ...state, json: true },
      },
    };
  }

  if (arg === "--out") {
    return parseDiffOutArg(args, index, state);
  }

  if (arg.startsWith("-")) {
    return { ok: false, message: `Unknown diff option: ${arg}` };
  }

  return {
    ok: true,
    progress: {
      nextIndex: index,
      state: {
        ...state,
        positional: [...state.positional, arg],
      },
    },
  };
}

function diffOptionsFromState(state: DiffParseState): DiffArgsResult {
  const [beforePath, afterPath, unexpectedArg] = state.positional;

  if (beforePath === undefined) {
    return { ok: false, message: "Missing before path." };
  }

  if (afterPath === undefined) {
    return { ok: false, message: "Missing after path." };
  }

  if (unexpectedArg !== undefined) {
    return {
      ok: false,
      message: `Unexpected diff argument: ${unexpectedArg}`,
    };
  }

  return {
    ok: true,
    options: {
      afterPath,
      beforePath,
      json: state.json,
      outPath: state.outPath,
    },
  };
}

function parseDiffArgs(args: readonly string[]): DiffArgsResult {
  let state: DiffParseState = { json: false, positional: [] };

  for (let index = 0; index < args.length; index += 1) {
    const result = parseDiffArg(args, index, state);
    if (!result.ok) return result;

    index = result.progress.nextIndex;
    state = result.progress.state;
  }

  return diffOptionsFromState(state);
}

function diffUsagePlan(message: string): CommandPlan {
  return usageFailurePlan(message, diffUsageText());
}

function loadValidatedDiagramSpecOrPlanFailure(
  dependencies: CommandPlanningDependencies,
  sourcePath: string,
): LoadedDiagramSpecOrPlan {
  const result = dependencies.loadValidatedDiagramSpec(sourcePath);

  if (!result.ok) {
    return {
      ok: false,
      plan: repairableDiagnosticFailurePlan(result.failure),
    };
  }

  return {
    ok: true,
    result,
  };
}

function loadDiffInputsOrPlanFailure(
  dependencies: CommandPlanningDependencies,
  options: DiffCommandOptions,
):
  | {
      ok: true;
      before: SuccessfulValidatedDiagramSpecLoadResult;
      after: SuccessfulValidatedDiagramSpecLoadResult;
    }
  | {
      ok: false;
      plan: CommandPlan;
    } {
  const before = loadValidatedDiagramSpecOrPlanFailure(
    dependencies,
    options.beforePath,
  );
  if (!before.ok) return before;

  const after = loadValidatedDiagramSpecOrPlanFailure(
    dependencies,
    options.afterPath,
  );
  if (!after.ok) return after;

  return {
    ok: true,
    before: before.result,
    after: after.result,
  };
}

function diffJsonPlan(
  beforePath: string,
  afterPath: string,
  diff: DiagramSpecDiffResult,
): CommandPlan {
  return {
    exitCode: 0,
    stdout: jsonTextLine({
      beforePath,
      afterPath,
      diff,
    }),
    stderr: "",
    writes: [],
  };
}

function formatCount(count: number, label: string): string {
  return `${count} ${label}${count === 1 ? "" : "s"}`;
}

function diffTextPlan(
  beforePath: string,
  afterPath: string,
  diff: DiagramSpecDiffResult,
): CommandPlan {
  const { summary } = diff;

  return {
    exitCode: 0,
    stdout: textLine(
      [
        `Diff ${beforePath} -> ${afterPath}`,
        `added: ${formatCount(summary.added.nodes, "node")}, ${formatCount(summary.added.edges, "edge")}, ${formatCount(summary.added.groups, "group")}`,
        `removed: ${formatCount(summary.removed.nodes, "node")}, ${formatCount(summary.removed.edges, "edge")}, ${formatCount(summary.removed.groups, "group")}`,
        `changed: ${formatCount(summary.changed.nodes, "node")}, ${formatCount(summary.changed.edges, "edge")}, ${formatCount(summary.changed.groups, "group")}`,
      ].join("\n"),
    ),
    stderr: "",
    writes: [],
  };
}

async function diffSvgPlan(
  dependencies: CommandPlanningDependencies,
  beforePath: string,
  afterPath: string,
  outPath: string,
  diff: DiagramSpecDiffResult,
): Promise<CommandPlan> {
  const diffSpec = createDiagramSpecDiffDiagram(diff, { beforePath, afterPath });
  const renderedSvg = await dependencies.renderDiagramSpecToSvg(diffSpec, {});

  return {
    exitCode: 0,
    stdout: "",
    stderr: "",
    writes: [
      {
        path: outPath,
        content: renderedSvg,
      },
    ],
  };
}

function diffReportPlan(
  options: DiffCommandOptions,
  diff: DiagramSpecDiffResult,
): CommandPlan {
  return options.json
    ? diffJsonPlan(options.beforePath, options.afterPath, diff)
    : diffTextPlan(options.beforePath, options.afterPath, diff);
}

async function diffOutputPlan(
  dependencies: CommandPlanningDependencies,
  options: DiffCommandOptions,
  diff: DiagramSpecDiffResult,
): Promise<CommandPlan> {
  if (options.outPath === undefined) {
    return diffReportPlan(options, diff);
  }

  return diffSvgPlan(
    dependencies,
    options.beforePath,
    options.afterPath,
    options.outPath,
    diff,
  );
}

async function planValidatedDiff(
  options: DiffCommandOptions,
  dependencies: CommandPlanningDependencies,
): Promise<CommandPlan> {
  const loaded = loadDiffInputsOrPlanFailure(dependencies, options);
  if (!loaded.ok) return loaded.plan;

  const diff = dependencies.diffDiagramSpecs(
    loaded.before.spec,
    loaded.after.spec,
  );

  return diffOutputPlan(dependencies, options, diff);
}

export async function planDiff(
  args: readonly string[],
  dependencies: CommandPlanningDependencies,
): Promise<CommandPlan> {
  const argsResult = parseDiffArgs(args);

  return argsResult.ok
    ? planValidatedDiff(argsResult.options, dependencies)
    : diffUsagePlan(argsResult.message);
}
