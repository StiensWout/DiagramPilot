import { existsSync, readFileSync } from "node:fs";

import {
  checkDiagramPilotRepoWorkflow,
  generateDiagramPilotRepoWorkflow,
  getDiagramPilotVersion,
  inspectDiagramPilotRepoWorkflow,
  loadValidatedDiagramSpec,
} from "@diagrampilot/core";
import type {
  ConfiguredTextArtifactFormat,
  DiagramSpec,
  RepoWorkflowOutputProfile,
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

import { parseCheckArgs, parseInspectArgs } from "./argument-parsing.js";
import {
  checkUsageText,
  createUsageText,
  exportUsageText,
  formatUsageText,
  generateUsageText,
  inspectUsageText,
  renderUsageText,
  textLine,
} from "./cli-output.js";
import { checkResultPlan } from "./check-command-planning.js";
import type { CommandPlanningDependencies } from "./command-planning-dependencies.js";
import { planCreate } from "./create-command-planning.js";
import { planGenerate } from "./generate-command-planning.js";
import { inspectResultPlan } from "./inspect-command-planning.js";
import {
  initialCommandPlan,
  unknownCommandPlan,
} from "./initial-command-planning.js";
import {
  exportDiagramSpecTextArtifact,
  planExport,
  planFormat,
  planRender,
  planValidate,
  usageFailurePlan,
} from "./source-command-planning.js";
import type { CommandPlan } from "./types.js";

export type { CommandPlan, CommandWriteIntent } from "./types.js";
export type { CommandPlanningDependencies } from "./command-planning-dependencies.js";

const defaultCommandPlanningDependencies: CommandPlanningDependencies = {
  checkDiagramPilotRepoWorkflow,
  inspectDiagramPilotRepoWorkflow,
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
  pathExists: existsSync,
};

type CommandHandler = (
  args: readonly string[],
  dependencies: CommandPlanningDependencies,
) => CommandPlan | Promise<CommandPlan>;

function repoWorkflowCommandOptions(dependencies: CommandPlanningDependencies) {
  return {
    diagramPilotVersion: dependencies.getDiagramPilotVersion(),
    renderer: {
      name: SVG_RENDERER_NAME,
      version: SVG_RENDERER_VERSION,
    },
    exportConfiguredTextArtifact: ({
      format,
      profile,
      spec,
    }: {
      format: ConfiguredTextArtifactFormat;
      profile?: RepoWorkflowOutputProfile;
      spec: DiagramSpec;
    }) => {
      return exportDiagramSpecTextArtifact(dependencies, format, spec, profile);
    },
  };
}

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
    ...repoWorkflowCommandOptions(dependencies),
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

async function planInspect(
  args: readonly string[],
  dependencies: CommandPlanningDependencies,
): Promise<CommandPlan> {
  const argsResult = parseInspectArgs(args);

  if (!argsResult.ok) {
    return usageFailurePlan(argsResult.message, inspectUsageText());
  }

  const inspectResult = await dependencies.inspectDiagramPilotRepoWorkflow({
    scopePath: argsResult.options.scopePath,
    ...repoWorkflowCommandOptions(dependencies),
  });

  if (!inspectResult.ok) {
    return {
      exitCode: 1,
      stdout: "",
      stderr: textLine(inspectResult.failure.message),
      writes: [],
    };
  }

  return inspectResultPlan(inspectResult, argsResult.options.json);
}

const commandHandlers: Readonly<Record<string, CommandHandler>> = {
  check: planCheck,
  create: planCreate,
  export: planExport,
  format: planFormat,
  generate: planGenerate,
  inspect: planInspect,
  render: planRender,
  validate: planValidate,
};

const commandHelpText: Readonly<Record<string, () => string>> = {
  check: checkUsageText,
  create: createUsageText,
  export: exportUsageText,
  format: formatUsageText,
  generate: generateUsageText,
  inspect: inspectUsageText,
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
