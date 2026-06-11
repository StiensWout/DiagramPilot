import type { RepoWorkflowInspectResult } from "@diagrampilot/core";

import {
  formatInspectTextReport,
  jsonTextLine,
  textLine,
} from "./cli-output.js";
import type { CommandPlan } from "./types.js";

type SuccessfulRepoWorkflowInspectResult = Extract<
  RepoWorkflowInspectResult,
  { ok: true }
>;

function inspectJsonResultPlan(
  inspectResult: SuccessfulRepoWorkflowInspectResult,
): CommandPlan {
  return {
    exitCode: 0,
    stdout: jsonTextLine(inspectResult),
    stderr: "",
    writes: [],
  };
}

function inspectTextResultPlan(
  inspectResult: SuccessfulRepoWorkflowInspectResult,
): CommandPlan {
  return {
    exitCode: 0,
    stdout: textLine(formatInspectTextReport(inspectResult)),
    stderr: "",
    writes: [],
  };
}

export function inspectResultPlan(
  inspectResult: SuccessfulRepoWorkflowInspectResult,
  json: boolean,
): CommandPlan {
  return json
    ? inspectJsonResultPlan(inspectResult)
    : inspectTextResultPlan(inspectResult);
}
