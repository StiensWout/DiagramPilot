import { readFileSync } from "node:fs";

import {
  checkDiagramPilotRepoWorkflow,
  generateDiagramPilotRepoWorkflow,
  getDiagramPilotVersion,
  loadValidatedDiagramSpec,
} from "@diagrampilot/core";
import { exportDiagramSpecToD2 } from "@diagrampilot/export-d2";
import { exportDiagramSpecToDot } from "@diagrampilot/export-dot";
import { exportDiagramSpecToMermaid } from "@diagrampilot/export-mermaid";
import {
  createSvgRendererProvenance,
  rasterizeSvgToPng,
  renderDiagramSpecToSvg,
  SVG_RENDERER_NAME,
  SVG_RENDERER_VERSION,
} from "@diagrampilot/render-svg";

import { parseCheckArgs } from "./argument-parsing.js";
import {
  checkUsageText,
  exportUsageText,
  generateUsageText,
  renderUsageText,
  textLine,
} from "./cli-output.js";
import { checkResultPlan } from "./check-command-planning.js";
import type { CommandPlanningDependencies } from "./command-planning-dependencies.js";
import { planGenerate } from "./generate-command-planning.js";
import {
  initialCommandPlan,
  unknownCommandPlan,
} from "./initial-command-planning.js";
import {
  exportDiagramSpecTextArtifact,
  planExport,
  planRender,
  planValidate,
  usageFailurePlan,
} from "./source-command-planning.js";
import type { CommandPlan } from "./types.js";

export type { CommandPlan, CommandWriteIntent } from "./types.js";
export type { CommandPlanningDependencies } from "./command-planning-dependencies.js";

const defaultCommandPlanningDependencies: CommandPlanningDependencies = {
  checkDiagramPilotRepoWorkflow,
  generateDiagramPilotRepoWorkflow,
  loadValidatedDiagramSpec,
  exportDiagramSpecToMermaid,
  exportDiagramSpecToD2,
  exportDiagramSpecToDot,
  readSourceContent: (sourcePath) => readFileSync(sourcePath),
  renderDiagramSpecToSvg,
  rasterizeSvgToPng,
  createSvgRendererProvenance,
  getDiagramPilotVersion,
};

type CommandHandler = (
  args: readonly string[],
  dependencies: CommandPlanningDependencies,
) => CommandPlan | Promise<CommandPlan>;

async function planCheck(
  args: readonly string[],
  dependencies: CommandPlanningDependencies,
): Promise<CommandPlan> {
  const argsResult = parseCheckArgs(args);

  if (!argsResult.ok) {
    return usageFailurePlan(argsResult.message, checkUsageText());
  }

  const checkResult = await dependencies.checkDiagramPilotRepoWorkflow({
    scopePath: argsResult.options.scopePath,
    diagramPilotVersion: dependencies.getDiagramPilotVersion(),
    renderer: {
      name: SVG_RENDERER_NAME,
      version: SVG_RENDERER_VERSION,
    },
    exportConfiguredTextArtifact: ({ format, spec }) => {
      return exportDiagramSpecTextArtifact(dependencies, format, spec);
    },
  });

  if (!checkResult.ok) {
    return {
      exitCode: 1,
      stdout: "",
      stderr: textLine(checkResult.failure.message),
      writes: [],
    };
  }

  return checkResultPlan(checkResult, argsResult.options.json);
}

const commandHandlers: Readonly<Record<string, CommandHandler>> = {
  check: planCheck,
  export: planExport,
  generate: planGenerate,
  render: planRender,
  validate: planValidate,
};

const commandHelpText: Readonly<Record<string, () => string>> = {
  check: checkUsageText,
  export: exportUsageText,
  generate: generateUsageText,
  render: renderUsageText,
};

const commandHelpArgs = new Set(["--help", "-h"]);

function isCommandHelpArgs(args: readonly string[]): boolean {
  return args.length === 1 && commandHelpArgs.has(args[0]);
}

function commandHelpPlan(
  command: string,
  args: readonly string[],
): CommandPlan | undefined {
  if (!isCommandHelpArgs(args)) return undefined;
  const usageText = commandHelpText[command];
  if (usageText === undefined) return undefined;
  return {
    exitCode: 0,
    stdout: textLine(usageText()),
    stderr: "",
    writes: [],
  };
}

export async function planCommand(
  args: readonly string[],
  dependencies: CommandPlanningDependencies = defaultCommandPlanningDependencies,
): Promise<CommandPlan> {
  const [firstArg] = args;
  const initialPlan = initialCommandPlan(firstArg, dependencies);

  if (initialPlan !== undefined) {
    return initialPlan;
  }

  const handler = commandHandlers[firstArg];

  if (handler !== undefined) {
    const commandArgs = args.slice(1);
    const helpPlan = commandHelpPlan(firstArg, commandArgs);
    if (helpPlan !== undefined) return helpPlan;

    return await handler(commandArgs, dependencies);
  }

  return unknownCommandPlan(firstArg);
}
