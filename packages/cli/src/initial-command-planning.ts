import { helpText, textLine } from "./cli-output.js";
import type { CommandPlan } from "./types.js";

interface InitialCommandPlanningDependencies {
  getDiagramPilotVersion(): string;
}

const versionArgs = new Set(["--version", "-v"]);
const helpArgs = new Set<string | undefined>([undefined, "--help", "-h"]);

function versionPlan(
  dependencies: InitialCommandPlanningDependencies,
): CommandPlan {
  return {
    exitCode: 0,
    stdout: textLine(`diagrampilot ${dependencies.getDiagramPilotVersion()}`),
    stderr: "",
    writes: [],
  };
}

function helpPlan(dependencies: InitialCommandPlanningDependencies): CommandPlan {
  return {
    exitCode: 0,
    stdout: textLine(helpText(dependencies.getDiagramPilotVersion())),
    stderr: "",
    writes: [],
  };
}

export function initialCommandPlan(
  firstArg: string | undefined,
  dependencies: InitialCommandPlanningDependencies,
): CommandPlan | undefined {
  if (firstArg !== undefined && versionArgs.has(firstArg)) {
    return versionPlan(dependencies);
  }

  if (helpArgs.has(firstArg)) {
    return helpPlan(dependencies);
  }

  return undefined;
}

export function unknownCommandPlan(firstArg: string | undefined): CommandPlan {
  return {
    exitCode: 1,
    stdout: "",
    stderr: [
      `Unknown command or option: ${firstArg}`,
      "Run `diagrampilot --help` for usage.",
      "",
    ].join("\n"),
    writes: [],
  };
}
