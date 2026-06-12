import type { RepairableDiagnostic } from "@diagrampilot/core";

import { textLine } from "./cli-output.js";
import type { CommandPlan } from "./types.js";

export function selectionFailurePlan(
  selectionKind: "focus" | "view",
  sourcePath: string,
  diagnostic: RepairableDiagnostic,
): CommandPlan {
  return {
    exitCode: 1,
    stdout: "",
    stderr: textLine(
      [
        `DiagramSpec ${selectionKind} error in ${sourcePath}: ${diagnostic.message}`,
        `Path: ${diagnostic.path}`,
        `Expected: ${diagnostic.expected}`,
        `Suggestion: ${diagnostic.suggestion}`,
      ].join("\n"),
    ),
    writes: [],
  };
}
