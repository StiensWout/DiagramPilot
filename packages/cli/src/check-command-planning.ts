import type { RepoWorkflowCheckResult } from "@diagrampilot/core";

import {
  formatCheckTextReport,
  jsonTextLine,
  textLine,
} from "./cli-output.js";
import type { CommandPlan } from "./types.js";

type SuccessfulRepoWorkflowCheckResult = Extract<
  RepoWorkflowCheckResult,
  { ok: true }
>;

function issueExitCode(issueCount: number): 0 | 1 {
  return issueCount === 0 ? 0 : 1;
}

function checkJsonResultPlan(
  checkResult: SuccessfulRepoWorkflowCheckResult,
  issueCount: number,
): CommandPlan {
  return {
    exitCode: issueExitCode(issueCount),
    stdout: jsonTextLine({ ...checkResult, ok: issueCount === 0 }),
    stderr: "",
    writes: [],
  };
}

function noSourceCheckResultPlan(
  checkResult: SuccessfulRepoWorkflowCheckResult,
): CommandPlan {
  return {
    exitCode: 0,
    stdout: textLine(
      `No DiagramPilot Source Files found in ${checkResult.scope.path}.`,
    ),
    stderr: "",
    writes: [],
  };
}

function checkTextResultPlan(
  checkResult: SuccessfulRepoWorkflowCheckResult,
  issueCount: number,
): CommandPlan {
  const checkTextReport = textLine(formatCheckTextReport(checkResult.sources));

  return {
    exitCode: issueExitCode(issueCount),
    stdout: issueCount === 0 ? checkTextReport : "",
    stderr: issueCount === 0 ? "" : checkTextReport,
    writes: [],
  };
}

export function checkResultPlan(
  checkResult: SuccessfulRepoWorkflowCheckResult,
  json: boolean,
): CommandPlan {
  const issueCount = checkResult.summary.issueCount;

  if (json) {
    return checkJsonResultPlan(checkResult, issueCount);
  }

  if (checkResult.sources.length === 0) {
    return noSourceCheckResultPlan(checkResult);
  }

  return checkTextResultPlan(checkResult, issueCount);
}
