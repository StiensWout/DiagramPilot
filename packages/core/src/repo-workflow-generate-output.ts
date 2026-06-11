import { createRepoWorkflowArtifactPlan } from "./repo-workflow-artifact-plan.js";
import type {
  RepoWorkflowArtifactOutput,
  RepoWorkflowArtifactOutputFormat,
  RepoWorkflowConfig,
} from "./repo-workflow-config.js";
import type { ConfiguredTextArtifactFormat } from "./repo-workflow-configured-artifact-result.js";
import {
  createMarkdownEmbedContent,
  type MarkdownEmbedReferencedArtifact,
} from "./repo-workflow-markdown-embed.js";
import type { DiagramSpec } from "./diagramspec-topology.js";
import type { RepoWorkflowGenerateOptions } from "./repo-workflow-generate.js";
import type { RepoWorkflowGenerateWrittenArtifact } from "./repo-workflow-generate.js";
import type { DiagramPilotSourceFile } from "./source-loading.js";

export interface ValidGenerateSource {
  sourcePath: string;
  sourceAbsolutePath: string;
  source: DiagramPilotSourceFile;
  spec: DiagramSpec;
  outputs: readonly RepoWorkflowArtifactOutput[];
}

function isConfiguredTextArtifactFormat(
  format: RepoWorkflowArtifactOutputFormat,
): format is ConfiguredTextArtifactFormat {
  return format === "mermaid" || format === "d2" || format === "dot";
}

async function generateSvgOutputContent(
  options: RepoWorkflowGenerateOptions,
  source: ValidGenerateSource,
): Promise<string> {
  return options.renderSvgArtifact({
    source: source.source,
    provenanceSourcePath: source.sourcePath,
    spec: source.spec,
    diagramPilotVersion: options.diagramPilotVersion,
    renderer: options.renderer,
  });
}

async function generateRasterOutputContent(
  options: RepoWorkflowGenerateOptions,
  source: ValidGenerateSource,
): Promise<Uint8Array> {
  const svg = await generateSvgOutputContent(options, source);
  return options.rasterizeSvgArtifact(svg);
}

function generateTextOutputContent(
  options: RepoWorkflowGenerateOptions,
  source: ValidGenerateSource,
  output: RepoWorkflowArtifactOutput,
): string {
  if (!isConfiguredTextArtifactFormat(output.format)) {
    throw new Error(`Unsupported configured output format: ${output.format}`);
  }

  return options.exportTextArtifact({
    format: output.format,
    spec: source.spec,
  });
}

async function generateOutputContent(
  options: RepoWorkflowGenerateOptions,
  source: ValidGenerateSource,
  output: RepoWorkflowArtifactOutput,
  absolutePath: string,
  references: readonly MarkdownEmbedReferencedArtifact[],
): Promise<string | Uint8Array> {
  if (output.format === "markdown") {
    return createMarkdownEmbedContent({
      spec: source.spec,
      embedPath: absolutePath,
      references,
    });
  }

  if (output.format === "svg") return generateSvgOutputContent(options, source);
  if (output.format === "png")
    return generateRasterOutputContent(options, source);

  return generateTextOutputContent(options, source, output);
}

export async function generateWrittenArtifactsForSource(options: {
  generateOptions: RepoWorkflowGenerateOptions;
  config?: RepoWorkflowConfig;
  source: ValidGenerateSource;
  currentWorkingDirectory: string;
}): Promise<
  | {
      ok: true;
      written: RepoWorkflowGenerateWrittenArtifact[];
    }
  | {
      ok: false;
      displayPath: string;
      error: unknown;
    }
> {
  const plan = createRepoWorkflowArtifactPlan({
    config: options.config,
    source: options.source,
    currentWorkingDirectory: options.currentWorkingDirectory,
  });
  const written: RepoWorkflowGenerateWrittenArtifact[] = [];

  for (const plannedOutput of plan.outputs) {
    try {
      const content = await generateOutputContent(
        options.generateOptions,
        options.source,
        plannedOutput.output,
        plannedOutput.absolutePath,
        plan.markdownReferences,
      );

      written.push({
        sourcePath: options.source.sourcePath,
        format: plannedOutput.output.format,
        path: plannedOutput.displayPath,
        absolutePath: plannedOutput.absolutePath,
        content,
      });
    } catch (error) {
      return {
        ok: false,
        displayPath: plannedOutput.displayPath,
        error,
      };
    }
  }

  return {
    ok: true,
    written,
  };
}
