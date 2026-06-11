import {
  createRepairableDiagnosticReport,
  serializeDiagramPilotSourceFile,
  type DiagramSpec,
  type RepoWorkflowOutputProfile,
  type ValidatedDiagramSpecLoadResult,
} from "@diagrampilot/core";
import type { SvgRendererProvenance } from "@diagrampilot/render-svg";

import {
  parseExportArgs,
  parseRenderArgs,
  parseValidateArgs,
} from "./argument-parsing.js";
import {
  exportUsageText,
  formatUsageText,
  jsonTextLine,
  renderUsageText,
  textLine,
} from "./cli-output.js";
import type { CommandPlanningDependencies } from "./command-planning-dependencies.js";
import type { CommandPlan } from "./types.js";

type SuccessfulValidatedDiagramSpecLoadResult = Extract<
  ValidatedDiagramSpecLoadResult,
  { ok: true }
>;
type FailedValidatedDiagramSpecLoadResult = Extract<
  ValidatedDiagramSpecLoadResult,
  { ok: false }
>;
type TextExportFormat = "d2" | "dot" | "mermaid";
type RenderFormat = "svg" | "png";
type RepairableDiagnosticReport = ReturnType<
  typeof createRepairableDiagnosticReport
>;

type FormatArgsResult =
  | {
      ok: true;
      sourcePath: string;
    }
  | {
      ok: false;
      message: string;
    };

export function usageFailurePlan(
  message: string,
  usageText: string,
): CommandPlan {
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

export function exportDiagramSpecTextArtifact(
  dependencies: CommandPlanningDependencies,
  format: TextExportFormat,
  spec: DiagramSpec,
  profile?: RepoWorkflowOutputProfile,
): string {
  const exporters = {
    d2: dependencies.exportDiagramSpecToD2,
    dot: dependencies.exportDiagramSpecToDot,
    mermaid: dependencies.exportDiagramSpecToMermaid,
  };

  return exporters[format](spec, { profile });
}

function validateUsagePlan(message: string): CommandPlan {
  return usageFailurePlan(
    message,
    "Usage: diagrampilot validate <path> [--json]",
  );
}

function parseFormatArgs(args: readonly string[]): FormatArgsResult {
  const [sourcePath, unexpectedArg] = args;

  if (sourcePath === undefined) {
    return { ok: false, message: "Missing source path." };
  }

  if (sourcePath.startsWith("-")) {
    return { ok: false, message: `Unknown format option: ${sourcePath}` };
  }

  if (unexpectedArg !== undefined) {
    return {
      ok: false,
      message: `Unexpected format argument: ${unexpectedArg}`,
    };
  }

  return { ok: true, sourcePath };
}

function formatUsagePlan(message: string): CommandPlan {
  return usageFailurePlan(message, formatUsageText());
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

export function planValidate(
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

export function planExport(
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

export function planFormat(
  args: readonly string[],
  dependencies: CommandPlanningDependencies,
): CommandPlan {
  const argsResult = parseFormatArgs(args);

  if (!argsResult.ok) {
    return formatUsagePlan(argsResult.message);
  }

  const loaded = loadValidatedDiagramSpecOrPlanFailure(
    dependencies,
    argsResult.sourcePath,
  );

  if (!loaded.ok) {
    return loaded.plan;
  }

  return {
    exitCode: 0,
    stdout: "",
    stderr: "",
    writes: [
      {
        path: loaded.result.source.path,
        content: serializeDiagramPilotSourceFile(loaded.result.spec),
      },
    ],
  };
}

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

export async function planRender(
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
