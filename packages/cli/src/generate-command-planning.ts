import {
  type DiagramSpec,
  type RepoWorkflowGenerateOptions,
  type RepoWorkflowGenerateResult,
} from "@diagrampilot/core";
import type {
  CreateSvgRendererProvenanceOptions,
  SvgRendererProvenance,
} from "@diagrampilot/render-svg";
import {
  SVG_RENDERER_NAME,
  SVG_RENDERER_VERSION,
} from "@diagrampilot/render-svg";

import { parseGenerateArgs } from "./argument-parsing.js";
import { generateUsageText, jsonTextLine, textLine } from "./cli-output.js";
import type { CommandPlan } from "./types.js";

export interface GenerateCommandPlanningDependencies {
  generateDiagramPilotRepoWorkflow(
    options: RepoWorkflowGenerateOptions,
  ): Promise<RepoWorkflowGenerateResult>;
  exportDiagramSpecToMermaid(spec: DiagramSpec): string;
  exportDiagramSpecToD2(spec: DiagramSpec): string;
  exportDiagramSpecToDot(spec: DiagramSpec): string;
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

interface GenerateCommandOptions {
  json: boolean;
  scopePath?: string;
}

function formatSourceCount(count: number): string {
  return `${count} DiagramPilot Source File${count === 1 ? "" : "s"}`;
}

function formatArtifactCount(count: number): string {
  return `${count} artifact${count === 1 ? "" : "s"}`;
}

function publicGenerateResult(result: RepoWorkflowGenerateResult): unknown {
  return {
    ...result,
    written: result.written.map(({ sourcePath, format, path }) => ({
      sourcePath,
      format,
      path,
    })),
  };
}

function formatGenerateFailure(result: RepoWorkflowGenerateResult): string | undefined {
  if (result.ok) return undefined;
  if (result.failure !== undefined) return result.failure.message;
  if (result.failures.length === 0) return undefined;

  return [
    `Unable to generate artifacts for ${formatSourceCount(result.summary.checkedSourceCount)}. Found ${result.failures.length} repairable source failures.`,
    ...result.failures.map(
      (failure) =>
        `Invalid source: ${failure.sourcePath}. Run \`diagrampilot validate ${failure.sourcePath}\`.`,
    ),
  ].join("\n");
}

function formatGenerateSuccess(result: RepoWorkflowGenerateResult): string {
  if (result.summary.checkedSourceCount === 0 && result.scope !== undefined) {
    return `No DiagramPilot Source Files found in ${result.scope.path}.`;
  }

  const skipped =
    result.summary.skippedArtifactCount === 0
      ? ""
      : ` Skipped ${formatArtifactCount(result.summary.skippedArtifactCount)}.`;

  return `Generated ${formatArtifactCount(result.summary.writtenArtifactCount)} for ${formatSourceCount(result.summary.checkedSourceCount)}.${skipped}`;
}

function formatGenerateTextReport(result: RepoWorkflowGenerateResult): string {
  return formatGenerateFailure(result) ?? formatGenerateSuccess(result);
}

function generatedWrites(result: RepoWorkflowGenerateResult): CommandPlan["writes"] {
  return result.ok
    ? result.written.map(({ absolutePath, content }) => ({
        path: absolutePath,
        content,
      }))
    : [];
}

async function runGenerateCommand(
  options: GenerateCommandOptions,
  dependencies: GenerateCommandPlanningDependencies,
): Promise<RepoWorkflowGenerateResult> {
  return dependencies.generateDiagramPilotRepoWorkflow({
    scopePath: options.scopePath,
    diagramPilotVersion: dependencies.getDiagramPilotVersion(),
    renderer: {
      name: SVG_RENDERER_NAME,
      version: SVG_RENDERER_VERSION,
    },
    renderSvgArtifact: async ({ source, provenanceSourcePath, spec }) =>
      await dependencies.renderDiagramSpecToSvg(spec, {
        provenance: dependencies.createSvgRendererProvenance({
          sourcePath: provenanceSourcePath,
          sourceContent: source.content,
        }),
      }),
    rasterizeSvgArtifact: dependencies.rasterizeSvgToPng,
    exportTextArtifact: ({ format, spec }) => {
      const exporters = {
        d2: dependencies.exportDiagramSpecToD2,
        dot: dependencies.exportDiagramSpecToDot,
        mermaid: dependencies.exportDiagramSpecToMermaid,
      };

      return exporters[format](spec);
    },
  });
}

function planGenerateJsonResult(generateResult: RepoWorkflowGenerateResult): CommandPlan {
  return {
    exitCode: generateResult.ok ? 0 : 1,
    stdout: jsonTextLine(publicGenerateResult(generateResult)),
    stderr: "",
    writes: generatedWrites(generateResult),
  };
}

function planGenerateTextResult(generateResult: RepoWorkflowGenerateResult): CommandPlan {
  const textReport = textLine(formatGenerateTextReport(generateResult));

  return {
    exitCode: generateResult.ok ? 0 : 1,
    stdout: generateResult.ok ? textReport : "",
    stderr: generateResult.ok ? "" : textReport,
    writes: generatedWrites(generateResult),
  };
}

export async function planGenerate(
  args: readonly string[],
  dependencies: GenerateCommandPlanningDependencies,
): Promise<CommandPlan> {
  const argsResult = parseGenerateArgs(args);

  if (!argsResult.ok) {
    return {
      exitCode: 1,
      stdout: "",
      stderr: [argsResult.message, generateUsageText(), ""].join("\n"),
      writes: [],
    };
  }

  const generateResult = await runGenerateCommand(
    argsResult.options,
    dependencies,
  );

  return argsResult.options.json
    ? planGenerateJsonResult(generateResult)
    : planGenerateTextResult(generateResult);
}
