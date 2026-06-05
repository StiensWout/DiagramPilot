import { readFileSync } from "node:fs";

import {
  checkDiagramPilotRepoWorkflow,
  createRepairableDiagnosticReport,
  getDiagramPilotVersion,
  loadValidatedDiagramSpec,
  type DiagramSpec,
  type RepoWorkflowCheckOptions,
  type RepoWorkflowCheckResult,
  type ValidatedDiagramSpecLoadResult,
} from "@diagrampilot/core";
import { exportDiagramSpecToD2 } from "@diagrampilot/export-d2";
import { exportDiagramSpecToMermaid } from "@diagrampilot/export-mermaid";
import {
  createSvgRendererProvenance,
  type CreateSvgRendererProvenanceOptions,
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
  textLine,
} from "./cli-output.js";
import type { CommandPlan } from "./types.js";

export type { CommandPlan, CommandWriteIntent } from "./types.js";

export interface CommandPlanningDependencies {
  checkDiagramPilotRepoWorkflow(
    options: RepoWorkflowCheckOptions,
  ): Promise<RepoWorkflowCheckResult>;
  loadValidatedDiagramSpec(path: string): ValidatedDiagramSpecLoadResult;
  exportDiagramSpecToMermaid(spec: DiagramSpec): string;
  exportDiagramSpecToD2(spec: DiagramSpec): string;
  readSourceContent(path: string): string | Uint8Array;
  renderDiagramSpecToSvg(
    spec: DiagramSpec,
    options: { provenance?: SvgRendererProvenance },
  ): Promise<string>;
  createSvgRendererProvenance(
    options: CreateSvgRendererProvenanceOptions,
  ): SvgRendererProvenance;
  getDiagramPilotVersion(): string;
}

const defaultCommandPlanningDependencies: CommandPlanningDependencies = {
  checkDiagramPilotRepoWorkflow,
  loadValidatedDiagramSpec,
  exportDiagramSpecToMermaid,
  exportDiagramSpecToD2,
  readSourceContent: (sourcePath) => readFileSync(sourcePath),
  renderDiagramSpecToSvg,
  createSvgRendererProvenance,
  getDiagramPilotVersion,
};

function planValidate(
  args: readonly string[],
  dependencies: CommandPlanningDependencies,
): CommandPlan {
  const argsResult = parseValidateArgs(args);

  if (!argsResult.ok) {
    return {
      exitCode: 1,
      stdout: "",
      stderr: [
        argsResult.message,
        "Usage: diagrampilot validate <path> [--json]",
        "",
      ].join("\n"),
      writes: [],
    };
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
    return {
      exitCode: 1,
      stdout: "",
      stderr: [argsResult.message, exportUsageText(), ""].join("\n"),
      writes: [],
    };
  }

  const result = dependencies.loadValidatedDiagramSpec(
    argsResult.options.sourcePath,
  );

  if (!result.ok) {
    const report = createRepairableDiagnosticReport(result.failure);

    return {
      exitCode: 1,
      stdout: "",
      stderr: textLine(report.text),
      writes: [],
    };
  }

  const exportedText =
    argsResult.options.format === "mermaid"
      ? dependencies.exportDiagramSpecToMermaid(result.spec)
      : dependencies.exportDiagramSpecToD2(result.spec);

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
    return {
      exitCode: 1,
      stdout: "",
      stderr: [
        argsResult.message,
        "Usage: diagrampilot render <path> --out <path>",
        "",
      ].join("\n"),
      writes: [],
    };
  }

  const result = dependencies.loadValidatedDiagramSpec(
    argsResult.options.sourcePath,
  );

  if (!result.ok) {
    const report = createRepairableDiagnosticReport(result.failure);

    return {
      exitCode: 1,
      stdout: "",
      stderr: textLine(report.text),
      writes: [],
    };
  }

  try {
    const renderedSvg = await dependencies.renderDiagramSpecToSvg(result.spec, {
      provenance: dependencies.createSvgRendererProvenance({
        sourcePath: result.source.path,
        sourceContent: dependencies.readSourceContent(result.source.path),
      }),
    });

    return {
      exitCode: 0,
      stdout: "",
      stderr: "",
      writes: [
        {
          path: argsResult.options.outPath,
          content: renderedSvg,
        },
      ],
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to render SVG.";

    return {
      exitCode: 1,
      stdout: "",
      stderr: textLine(`Unable to render ${result.source.path}: ${message}`),
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
    return {
      exitCode: 1,
      stdout: "",
      stderr: [argsResult.message, checkUsageText(), ""].join("\n"),
      writes: [],
    };
  }

  const checkResult = await dependencies.checkDiagramPilotRepoWorkflow({
    scopePath: argsResult.options.scopePath,
    diagramPilotVersion: dependencies.getDiagramPilotVersion(),
    renderer: {
      name: SVG_RENDERER_NAME,
      version: SVG_RENDERER_VERSION,
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

  if (checkResult.sources.length === 0) {
    if (argsResult.options.json) {
      return {
        exitCode: 0,
        stdout: jsonTextLine(checkResult),
        stderr: "",
        writes: [],
      };
    }

    return {
      exitCode: 0,
      stdout: textLine(
        `No DiagramPilot Source Files found in ${checkResult.scope.path}.`,
      ),
      stderr: "",
      writes: [],
    };
  }

  const sourceResults = checkResult.sources;
  const issueCount = checkResult.summary.issueCount;

  if (argsResult.options.json) {
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

  const checkTextReport = textLine(formatCheckTextReport(sourceResults));

  return {
    exitCode: issueCount === 0 ? 0 : 1,
    stdout: issueCount === 0 ? checkTextReport : "",
    stderr: issueCount === 0 ? "" : checkTextReport,
    writes: [],
  };
}

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

  if (firstArg === "validate") {
    return planValidate(args.slice(1), dependencies);
  }

  if (firstArg === "export") {
    return planExport(args.slice(1), dependencies);
  }

  if (firstArg === "render") {
    return await planRender(args.slice(1), dependencies);
  }

  if (firstArg === "check") {
    return await planCheck(args.slice(1), dependencies);
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
