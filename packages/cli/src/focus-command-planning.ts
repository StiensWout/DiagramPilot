import {
  selectFocusedDiagramSpec,
  type DiagramSpec,
  type DiagramSpecFocusOptions,
  type ValidatedDiagramSpecLoadResult,
} from "@diagrampilot/core";

import { selectionFailurePlan } from "./selection-command-planning.js";
import type { CommandPlan } from "./types.js";

type SuccessfulValidatedDiagramSpecLoadResult = Extract<
  ValidatedDiagramSpecLoadResult,
  { ok: true }
>;

export type FocusSelectionResult =
  | { ok: true; spec: DiagramSpec }
  | { ok: false; plan: CommandPlan };

function hasFocusOptions(options: DiagramSpecFocusOptions): boolean {
  return (
    options.aroundNodeId !== undefined ||
    options.groupId !== undefined ||
    options.hideEdgeLabels === true
  );
}

export function selectOptionalFocusOrPlanFailure(
  result: SuccessfulValidatedDiagramSpecLoadResult,
  spec: DiagramSpec,
  options: DiagramSpecFocusOptions,
): FocusSelectionResult {
  if (!hasFocusOptions(options)) {
    return {
      ok: true,
      spec,
    };
  }

  const selected = selectFocusedDiagramSpec(spec, options);

  if (!selected.ok) {
    return {
      ok: false,
      plan: selectionFailurePlan("focus", result.source.path, selected.error),
    };
  }

  return {
    ok: true,
    spec: selected.spec,
  };
}
