import { readFileSync } from "node:fs";

import {
  checkDiagramPilotRepoWorkflow,
  createRepairableDiagnosticReport,
  generateDiagramPilotRepoWorkflow,
  getDiagramPilotVersion,
  loadValidatedDiagramSpec,
  type DiagramSpec,
  type RepoWorkflowCheckOptions,
  type RepoWorkflowCheckResult,
  type RepoWorkflowGenerateOptions,
  type RepoWorkflowGenerateResult,
  type ValidatedDiagramSpecLoadResult,
} from "@diagrampilot/core";
import { exportDiagramSpecToD2 } from "@diagrampilot/export-d2";
import { exportDiagramSpecToDot } from "@diagrampilot/export-dot";
import { exportDiagramSpecToMermaid } from "@diagrampilot/export-mermaid";
import {
  createSvgRendererProvenance,
  type CreateSvgRendererProvenanceOptions,
  rasterizeSvgToPng,
  renderDiagramSpecToSvg,
  SVG_RENDERER_NAME,
  SVG_RENDERER_VERSION,
  type SvgRendererProvenance,
} from "@diagrampilot/render-svg";

import {
  parseCheckArgs,
  parseExportArgs,
  parseRenderArgs,
  parseValidateArgs,
} from "./argument-parsing.js";
import {
  checkUsageText,
  exportUsageText,
  jsonTextLine,
  renderUsageText,
  textLine,
} from "./cli-output.js";
import { checkResultPlan } from "./check-command-planning.js";
import { planGenerate } from "./generate-command-planning.js";
import {
  initialCommandPlan,
  unknownCommandPlan,
} from "./initial-command-planning.js";
import type { CommandPlan } from "./types.js";

export type { CommandPlan, CommandWriteIntent } from "./types.js";

export interface CommandPlanningDependencies {
  checkDiagramPilotRepoWorkflow(
    options: RepoWorkflowCheckOptions,
  ): Promise<RepoWorkflowCheckResult>;
  generateDiagramPilotRepoWorkflow(
    options: RepoWorkflowGenerateOptions,
  ): Promise<RepoWorkflowGenerateResult>;
  loadValidatedDiagramSpec(path: string): ValidatedDiagramSpecLoadResult;
  exportDiagramSpecToMermaid(spec: DiagramSpec): string;
  exportDiagramSpecToD2(spec: DiagramSpec): string;
  exportDiagramSpecToDot(spec: DiagramSpec): string;
  readSourceContent(path: string): string | Uint8Array;
  renderDiagramSpecToSvg(
    spec: DiagramSpec,
    options: { provenance?: SvgRendererProvenance },
  ): Promise<string>;
  rasterizeSvgToPng(svg: string): Uint8Array;
  createSvgRendererProvenance(
    options: CreateSvgRendererProvenanceOptions,
  ): SvgRendererProvenance;
  getDiagramPilotVersion(): string;
}

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

type SuccessfulValidatedDiagramSpecLoadResult = Extract<
  ValidatedDiagramSpecLoadResult,
  { ok: true }
>;
type FailedValidatedDiagramSpecLoadResult = Extract<
  ValidatedDiagramSpecLoadResult,
  { ok: false }
>;
type CommandHandler = (
  args: readonly string[],
  dependencies: CommandPlanningDependencies,
) => CommandPlan | Promise<CommandPlan>;
type TextExportFormat = "d2" | "dot" | "mermaid";

function usageFailurePlan(message: string, usageText: string): CommandPlan {
  return {
    exitCode: 1,
    stdout: "",
    stderr: [message, usageText, ""].join("\n"),
    writes: [],
  };
}

function repairableDiagnosticFailurePlan(
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

function loadValidatedDiagramSpecOrPlanFailure(
  dependencies: CommandPlanningDependencies,
  sourcePath: string,
):
  | {
      ok: true;
      result: SuccessfulValidatedDiagramSpecLoadResult;
    }
  | {
      ok: false;
      plan: CommandPlan;
    } {
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

function exportDiagramSpecTextArtifact(
  dependencies: CommandPlanningDependencies,
  format: TextExportFormat,
  spec: DiagramSpec,
): string {
  const exporters = {
    d2: dependencies.exportDiagramSpecToD2,
    dot: dependencies.exportDiagramSpecToDot,
    mermaid: dependencies.exportDiagramSpecToMermaid,
  };

  return exporters[format](spec);
}

type RepairableDiagnosticReport = ReturnType<
  typeof createRepairableDiagnosticReport
>;

function validateUsagePlan(message: string): CommandPlan {
  return usageFailurePlan(
    message,
    "Usage: diagrampilot validate <path> [--json]",
  );
}

function validateJsonFailurePlan(
  report: RepairableDiagnosticReport,
): CommandPlan {
  return {
    exitCode: 1,
    stdout: jsonTextLine({
      file: report.file,
      ok: false,
      errors: report.errors,
    }),
    stderr: "",
    writes: [],
  };
}

function validateTextFailurePlan(
  report: RepairableDiagnosticReport,
): CommandPlan {
  return {
    exitCode: 1,
    stdout: "",
    stderr: textLine(report.text),
    writes: [],
  };
}

function validateFailurePlan(
  failure: FailedValidatedDiagramSpecLoadResult["failure"],
  json: boolean,
): CommandPlan {
  const report = createRepairableDiagnosticReport(failure);
  return json ? validateJsonFailurePlan(report) : validateTextFailurePlan(report);
}

function validateJsonSuccessPlan(
  result: SuccessfulValidatedDiagramSpecLoadResult,
): CommandPlan {
  return {
    exitCode: 0,
    stdout: jsonTextLine({
      file: result.source.path,
      ok: true,
      errors: [],
    }),
    stderr: "",
    writes: [],
  };
}

function validateTextSuccessPlan(
  result: SuccessfulValidatedDiagramSpecLoadResult,
): CommandPlan {
  return {
    exitCode: 0,
    stdout: textLine(`Valid ${result.source.path}`),
    stderr: "",
    writes: [],
  };
}

function planValidate(
  args: readonly string[],
  dependencies: CommandPlanningDependencies,
): CommandPlan {
  const argsResult = parseValidateArgs(args);

  if (!argsResult.ok) {
    return validateUsagePlan(argsResult.message);
  }

  const { json, sourcePath } = argsResult.options;
  const result = dependencies.loadValidatedDiagramSpec(sourcePath);

  if (!result.ok) {
    return validateFailurePlan(result.failure, json);
  }

  return json ? validateJsonSuccessPlan(result) : validateTextSuccessPlan(result);
}

function planExport(
  args: readonly string[],
  dependencies: CommandPlanningDependencies,
): CommandPlan {
  const argsResult = parseExportArgs(args);

  if (!argsResult.ok) {
    return usageFailurePlan(argsResult.message, exportUsageText());
  }

  const loaded = loadValidatedDiagramSpecOrPlanFailure(
    dependencies,
    argsResult.options.sourcePath,
  );

  if (!loaded.ok) {
    return loaded.plan;
  }

  const exportedText = exportDiagramSpecTextArtifact(
    dependencies,
    argsResult.options.format,
    loaded.result.spec,
  );

  if (argsResult.options.outPath !== undefined) {
    return {
      exitCode: 0,
      stdout: "",
      stderr: "",
      writes: [
        {
          path: argsResult.options.outPath,
          content: exportedText,
        },
      ],
    };
  }

  return {
    exitCode: 0,
    stdout: exportedText,
    stderr: "",
    writes: [],
  };
}

type RenderFormat = "svg" | "png";

function renderUsagePlan(message: string): CommandPlan {
  return usageFailurePlan(message, renderUsageText());
}

function renderProvenance(
  dependencies: CommandPlanningDependencies,
  result: SuccessfulValidatedDiagramSpecLoadResult,
): SvgRendererProvenance {
  return dependencies.createSvgRendererProvenance({
    sourcePath: result.source.path,
    sourceContent: dependencies.readSourceContent(result.source.path),
  });
}

async function renderValidatedDiagramSpecToSvg(
  dependencies: CommandPlanningDependencies,
  result: SuccessfulValidatedDiagramSpecLoadResult,
): Promise<string> {
  return dependencies.renderDiagramSpecToSvg(result.spec, {
    provenance: renderProvenance(dependencies, result),
  });
}

function renderContentForFormat(
  dependencies: CommandPlanningDependencies,
  format: RenderFormat,
  renderedSvg: string,
): string | Uint8Array {
  return format === "png"
    ? dependencies.rasterizeSvgToPng(renderedSvg)
    : renderedSvg;
}

function renderWritePlan(
  outPath: string,
  renderedContent: string | Uint8Array,
): CommandPlan {
  return {
    exitCode: 0,
    stdout: "",
    stderr: "",
    writes: [
      {
        path: outPath,
        content: renderedContent,
      },
    ],
  };
}

function renderErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unable to render SVG.";
}

function renderFailurePlan(sourcePath: string, error: unknown): CommandPlan {
  return {
    exitCode: 1,
    stdout: "",
    stderr: textLine(
      `Unable to render ${sourcePath}: ${renderErrorMessage(error)}`,
    ),
    writes: [],
  };
}

async function planRender(
  args: readonly string[],
  dependencies: CommandPlanningDependencies,
): Promise<CommandPlan> {
  const argsResult = parseRenderArgs(args);

  if (!argsResult.ok) {
    return renderUsagePlan(argsResult.message);
  }

  const loaded = loadValidatedDiagramSpecOrPlanFailure(
    dependencies,
    argsResult.options.sourcePath,
  );

  if (!loaded.ok) {
    return loaded.plan;
  }

  try {
    const renderedSvg = await renderValidatedDiagramSpecToSvg(
      dependencies,
      loaded.result,
    );
    const renderedContent = renderContentForFormat(
      dependencies,
      argsResult.options.format,
      renderedSvg,
    );

    return renderWritePlan(argsResult.options.outPath, renderedContent);
  } catch (error) {
    return renderFailurePlan(loaded.result.source.path, error);
  }
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
    return await handler(args.slice(1), dependencies);
  }

  return unknownCommandPlan(firstArg);
}
