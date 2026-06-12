import {
  createRepairableDiagnosticReport,
  type ValidatedDiagramSpecLoadResult,
} from "@diagrampilot/core";

import { parseLintArgs } from "./argument-parsing.js";
import {
  formatLintTextReport,
  jsonTextLine,
  lintUsageText,
  textLine,
} from "./cli-output.js";
import type { CommandPlanningDependencies } from "./command-planning-dependencies.js";
import { usageFailurePlan } from "./source-command-planning.js";
import type { CommandPlan } from "./types.js";

type FailedValidatedDiagramSpecLoadResult = Extract<
  ValidatedDiagramSpecLoadResult,
  { ok: false }
>;
type DiagramSpecLintResult = ReturnType<
  CommandPlanningDependencies["lintDiagramSpec"]
>;

function lintTextPlan(
  sourcePath: string,
  lintResult: DiagramSpecLintResult,
): CommandPlan {
  const report = textLine(formatLintTextReport(sourcePath, lintResult));

  return {
    exitCode: lintResult.ok ? 0 : 1,
    stdout: lintResult.ok ? report : "",
    stderr: lintResult.ok ? "" : report,
    writes: [],
  };
}

function lintJsonPlan(
  sourcePath: string,
  lintResult: DiagramSpecLintResult,
): CommandPlan {
  return {
    exitCode: lintResult.ok ? 0 : 1,
    stdout: jsonTextLine({
      file: sourcePath,
      ok: lintResult.ok,
      errors: [],
      summary: lintResult.summary,
      warnings: lintResult.warnings,
    }),
    stderr: "",
    writes: [],
  };
}

function lintJsonSourceFailurePlan(
  failure: FailedValidatedDiagramSpecLoadResult["failure"],
): CommandPlan {
  const report = createRepairableDiagnosticReport(failure);

  return {
    exitCode: 1,
    stdout: jsonTextLine({
      file: report.file,
      ok: false,
      errors: report.errors,
      summary: {
        warningCount: 0,
      },
      warnings: [],
    }),
    stderr: "",
    writes: [],
  };
}

function lintTextSourceFailurePlan(
  failure: FailedValidatedDiagramSpecLoadResult["failure"],
): CommandPlan {
  const report = createRepairableDiagnosticReport(failure);

  return {
    exitCode: 1,
    stdout: "",
    stderr: textLine(report.text),
    writes: [],
  };
}

function lintSourceFailurePlan(
  failure: FailedValidatedDiagramSpecLoadResult["failure"],
  json: boolean,
): CommandPlan {
  return json
    ? lintJsonSourceFailurePlan(failure)
    : lintTextSourceFailurePlan(failure);
}

function lintUsagePlan(message: string): CommandPlan {
  return usageFailurePlan(message, lintUsageText());
}

export function planLint(
  args: readonly string[],
  dependencies: CommandPlanningDependencies,
): CommandPlan {
  const argsResult = parseLintArgs(args);

  if (!argsResult.ok) {
    return lintUsagePlan(argsResult.message);
  }

  const { json, sourcePath } = argsResult.options;
  const loaded = dependencies.loadValidatedDiagramSpec(sourcePath);

  if (!loaded.ok) return lintSourceFailurePlan(loaded.failure, json);

  const lintResult = dependencies.lintDiagramSpec(loaded.spec);

  return json
    ? lintJsonPlan(loaded.source.path, lintResult)
    : lintTextPlan(loaded.source.path, lintResult);
}
