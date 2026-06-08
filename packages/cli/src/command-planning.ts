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
  formatCheckTextReport,
  helpText,
  jsonTextLine,
  renderUsageText,
  textLine,
} from "./cli-output.js";
import { planGenerate } from "./generate-command-planning.js";
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
type SuccessfulRepoWorkflowCheckResult = Extract<
  RepoWorkflowCheckResult,
  { ok: true }
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

function checkResultPlan(
  checkResult: SuccessfulRepoWorkflowCheckResult,
  json: boolean,
): CommandPlan {
  const issueCount = checkResult.summary.issueCount;

  if (json) {
    return {
      exitCode: issueCount === 0 ? 0 : 1,
      stdout: jsonTextLine({
        ...checkResult,
        ok: issueCount === 0,
      }),
      stderr: "",
      writes: [],
    };
  }

  if (checkResult.sources.length === 0) {
    return {
      exitCode: 0,
      stdout: textLine(
        `No DiagramPilot Source Files found in ${checkResult.scope.path}.`,
      ),
      stderr: "",
      writes: [],
    };
  }

  const checkTextReport = textLine(formatCheckTextReport(checkResult.sources));

  return {
    exitCode: issueCount === 0 ? 0 : 1,
    stdout: issueCount === 0 ? checkTextReport : "",
    stderr: issueCount === 0 ? "" : checkTextReport,
    writes: [],
  };
}

function planValidate(
  args: readonly string[],
  dependencies: CommandPlanningDependencies,
): CommandPlan {
  const argsResult = parseValidateArgs(args);

  if (!argsResult.ok) {
    return usageFailurePlan(
      argsResult.message,
      "Usage: diagrampilot validate <path> [--json]",
    );
  }

  const { json, sourcePath } = argsResult.options;
  const result = dependencies.loadValidatedDiagramSpec(sourcePath);

  if (!result.ok) {
    const report = createRepairableDiagnosticReport(result.failure);

    if (json) {
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

    return {
      exitCode: 1,
      stdout: "",
      stderr: textLine(report.text),
      writes: [],
    };
  }

  if (json) {
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

  return {
    exitCode: 0,
    stdout: textLine(`Valid ${result.source.path}`),
    stderr: "",
    writes: [],
  };
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

async function planRender(
  args: readonly string[],
  dependencies: CommandPlanningDependencies,
): Promise<CommandPlan> {
  const argsResult = parseRenderArgs(args);

  if (!argsResult.ok) {
    return usageFailurePlan(argsResult.message, renderUsageText());
  }

  const loaded = loadValidatedDiagramSpecOrPlanFailure(
    dependencies,
    argsResult.options.sourcePath,
  );

  if (!loaded.ok) {
    return loaded.plan;
  }

  try {
    const renderedSvg = await dependencies.renderDiagramSpecToSvg(
      loaded.result.spec,
      {
        provenance: dependencies.createSvgRendererProvenance({
          sourcePath: loaded.result.source.path,
          sourceContent: dependencies.readSourceContent(
            loaded.result.source.path,
          ),
        }),
      },
    );

    const renderedContent =
      argsResult.options.format === "png"
        ? dependencies.rasterizeSvgToPng(renderedSvg)
        : renderedSvg;

    return {
      exitCode: 0,
      stdout: "",
      stderr: "",
      writes: [
        {
          path: argsResult.options.outPath,
          content: renderedContent,
        },
      ],
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to render SVG.";

    return {
      exitCode: 1,
      stdout: "",
      stderr: textLine(
        `Unable to render ${loaded.result.source.path}: ${message}`,
      ),
      writes: [],
    };
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

  if (firstArg === "--version" || firstArg === "-v") {
    return {
      exitCode: 0,
      stdout: textLine(`diagrampilot ${dependencies.getDiagramPilotVersion()}`),
      stderr: "",
      writes: [],
    };
  }

  if (firstArg === undefined || firstArg === "--help" || firstArg === "-h") {
    return {
      exitCode: 0,
      stdout: textLine(helpText(dependencies.getDiagramPilotVersion())),
      stderr: "",
      writes: [],
    };
  }

  const handler = commandHandlers[firstArg];

  if (handler !== undefined) {
    return await handler(args.slice(1), dependencies);
  }

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
