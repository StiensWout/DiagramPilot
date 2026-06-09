import type {
  RepoWorkflowArtifactOutput,
  RepoWorkflowArtifactOutputFormat,
  RepoWorkflowConfig,
} from "./repo-workflow-config.js";
import { resolveConfiguredOutputPath } from "./repo-workflow-configured-artifacts.js";
import type { ConfiguredTextArtifactFormat } from "./repo-workflow-configured-artifact-result.js";
import {
  createMarkdownEmbedContent,
  createMarkdownEmbedReferences,
  type MarkdownEmbedReferencedArtifact,
} from "./repo-workflow-markdown-embed.js";
import {
  deriveDefaultArtifactDisplayPath,
  normalizePathForDisplay,
} from "./repo-workflow-paths.js";
import type { DiagramSpec } from "./diagramspec-topology.js";
import type {
  DiagramPilotSourceFile,
} from "./source-loading.js";
import type {
  RepoWorkflowGenerateOptions,
  RepoWorkflowGenerateWrittenArtifact,
} from "./repo-workflow-generate.js";
import { deriveConfiguredArtifactDisplayPath } from "./repo-workflow-configured-artifacts.js";
import { deriveExpectedSvgArtifactPath } from "./svg-artifact-freshness.js";

export interface ValidGenerateSource {
  sourcePath: string;
  sourceAbsolutePath: string;
  source: DiagramPilotSourceFile;
  spec: DiagramSpec;
  outputs: readonly RepoWorkflowArtifactOutput[];
}

interface PlannedOutput {
  output: RepoWorkflowArtifactOutput;
  absolutePath: string;
  displayPath: string;
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
  return options.rasterizeSvgArtifact(
    await generateSvgOutputContent(options, source),
  );
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
  if (output.format === "png") return generateRasterOutputContent(options, source);

  return generateTextOutputContent(options, source, output);
}

function defaultSvgOutput(source: ValidGenerateSource): RepoWorkflowArtifactOutput {
  return {
    format: "svg",
    path: deriveExpectedSvgArtifactPath(source.sourceAbsolutePath),
  };
}

function outputsInWriteOrder(
  outputs: readonly RepoWorkflowArtifactOutput[],
): RepoWorkflowArtifactOutput[] {
  return [
    ...outputs.filter((output) => output.format !== "markdown"),
    ...outputs.filter((output) => output.format === "markdown"),
  ];
}

function outputAbsolutePath(options: {
  config?: RepoWorkflowConfig;
  source: ValidGenerateSource;
  output: RepoWorkflowArtifactOutput;
}): string {
  return options.source.outputs.length > 0 && options.config !== undefined
    ? resolveConfiguredOutputPath(
        options.config,
        options.source.sourceAbsolutePath,
        options.output,
      )
    : options.output.path;
}

function outputDisplayPath(options: {
  config?: RepoWorkflowConfig;
  source: ValidGenerateSource;
  absolutePath: string;
  currentWorkingDirectory: string;
}): string {
  if (options.source.outputs.length === 0 || options.config === undefined) {
    return deriveDefaultArtifactDisplayPath(
      options.source.sourcePath,
      options.absolutePath,
      options.currentWorkingDirectory,
    );
  }

  return normalizePathForDisplay(
    deriveConfiguredArtifactDisplayPath(
      options.config.directory,
      options.absolutePath,
      options.currentWorkingDirectory,
    ),
  );
}

function planOutput(options: {
  config?: RepoWorkflowConfig;
  source: ValidGenerateSource;
  output: RepoWorkflowArtifactOutput;
  currentWorkingDirectory: string;
}): PlannedOutput {
  const absolutePath = outputAbsolutePath(options);

  return {
    output: options.output,
    absolutePath,
    displayPath: outputDisplayPath({
      config: options.config,
      source: options.source,
      absolutePath,
      currentWorkingDirectory: options.currentWorkingDirectory,
    }),
  };
}

function markdownReferencesForSource(
  config: RepoWorkflowConfig | undefined,
  source: ValidGenerateSource,
): readonly MarkdownEmbedReferencedArtifact[] {
  if (source.outputs.length === 0 || config === undefined) {
    return [];
  }

  return createMarkdownEmbedReferences({
    outputs: source.outputs,
    resolvePath: (output) =>
      resolveConfiguredOutputPath(
        config,
        source.sourceAbsolutePath,
        output,
      ),
  });
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
  const outputs =
    options.source.outputs.length > 0
      ? options.source.outputs
      : [defaultSvgOutput(options.source)];
  const references = markdownReferencesForSource(options.config, options.source);
  const written: RepoWorkflowGenerateWrittenArtifact[] = [];

  for (const output of outputsInWriteOrder(outputs)) {
    const plannedOutput = planOutput({
      config: options.config,
      source: options.source,
      output,
      currentWorkingDirectory: options.currentWorkingDirectory,
    });

    try {
      const content = await generateOutputContent(
        options.generateOptions,
        options.source,
        plannedOutput.output,
        plannedOutput.absolutePath,
        references,
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
