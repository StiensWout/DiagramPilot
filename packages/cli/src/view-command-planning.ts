import {
  selectDiagramSpecView,
  type DiagramSpec,
  type RepairableDiagnostic,
  type ValidatedDiagramSpecLoadResult,
} from "@diagrampilot/core";

import { textLine } from "./cli-output.js";
import type { CommandPlan } from "./types.js";

type SuccessfulValidatedDiagramSpecLoadResult = Extract<
  ValidatedDiagramSpecLoadResult,
  { ok: true }
>;

export type ViewSelectionResult =
  | { ok: true; spec: DiagramSpec }
  | { ok: false; plan: CommandPlan };

function viewFailurePlan(
  sourcePath: string,
  diagnostic: RepairableDiagnostic,
): CommandPlan {
  return {
    exitCode: 1,
    stdout: "",
    stderr: textLine(
      [
        `DiagramSpec view error in ${sourcePath}: ${diagnostic.message}`,
        `Path: ${diagnostic.path}`,
        `Expected: ${diagnostic.expected}`,
        `Suggestion: ${diagnostic.suggestion}`,
      ].join("\n"),
    ),
    writes: [],
  };
}

export function selectOptionalViewOrPlanFailure(
  result: SuccessfulValidatedDiagramSpecLoadResult,
  viewId: string | undefined,
): ViewSelectionResult {
  if (viewId === undefined) {
    return {
      ok: true,
      spec: result.spec,
    };
  }

  const selected = selectDiagramSpecView(result.spec, viewId);

  if (!selected.ok) {
    return {
      ok: false,
      plan: viewFailurePlan(result.source.path, selected.error),
    };
  }

  return {
    ok: true,
    spec: selected.spec,
  };
}
