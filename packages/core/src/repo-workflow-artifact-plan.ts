import type {
  RepoWorkflowArtifactOutput,
  RepoWorkflowConfig,
} from "./repo-workflow-config.js";
import { resolveConfiguredOutputPath } from "./repo-workflow-configured-artifact-paths.js";
import {
  createMarkdownEmbedReferences,
  type MarkdownEmbedReferencedArtifact,
} from "./repo-workflow-markdown-embed.js";
import {
  deriveDefaultArtifactDisplayPath,
  normalizePathForDisplay,
} from "./repo-workflow-paths.js";
import type { DiagramSpec } from "./diagramspec-topology.js";
import type { DiagramPilotSourceFile } from "./source-loading.js";
import { deriveExpectedSvgArtifactPath } from "./svg-artifact-freshness.js";
import { deriveConfiguredArtifactDisplayPath } from "./repo-workflow-configured-artifact-paths.js";

export interface RepoWorkflowArtifactPlanSource {
  sourcePath: string;
  sourceAbsolutePath: string;
  source: DiagramPilotSourceFile;
  spec: DiagramSpec;
  outputs: readonly RepoWorkflowArtifactOutput[];
}

export interface RepoWorkflowArtifactPlanItem {
  output: RepoWorkflowArtifactOutput;
  absolutePath: string;
  displayPath: string;
}

export interface RepoWorkflowArtifactPlan {
  source: RepoWorkflowArtifactPlanSource;
  outputs: readonly RepoWorkflowArtifactPlanItem[];
  markdownReferences: readonly MarkdownEmbedReferencedArtifact[];
}

function defaultSvgOutput(
  source: RepoWorkflowArtifactPlanSource,
): RepoWorkflowArtifactOutput {
  return {
    format: "svg",
    path: deriveExpectedSvgArtifactPath(source.sourceAbsolutePath),
  };
}

function outputsInArtifactOrder(
  outputs: readonly RepoWorkflowArtifactOutput[],
): RepoWorkflowArtifactOutput[] {
  return [
    ...outputs.filter((output) => output.format !== "markdown"),
    ...outputs.filter((output) => output.format === "markdown"),
  ];
}

function outputAbsolutePath(options: {
  config?: RepoWorkflowConfig;
  source: RepoWorkflowArtifactPlanSource;
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
  source: RepoWorkflowArtifactPlanSource;
  absolutePath: string;
  currentWorkingDirectory: string;
}): string {
  if (options.source.outputs.length > 0 && options.config !== undefined) {
    return normalizePathForDisplay(
      deriveConfiguredArtifactDisplayPath(
        options.config.directory,
        options.absolutePath,
        options.currentWorkingDirectory,
      ),
    );
  }

  return deriveDefaultArtifactDisplayPath(
    options.source.sourcePath,
    options.absolutePath,
    options.currentWorkingDirectory,
  );
}

function planOutput(options: {
  config?: RepoWorkflowConfig;
  source: RepoWorkflowArtifactPlanSource;
  output: RepoWorkflowArtifactOutput;
  currentWorkingDirectory: string;
}): RepoWorkflowArtifactPlanItem {
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
  source: RepoWorkflowArtifactPlanSource,
): MarkdownEmbedReferencedArtifact[] {
  if (config === undefined) return [];

  return createMarkdownEmbedReferences({
    outputs: source.outputs,
    resolvePath: (output) =>
      resolveConfiguredOutputPath(config, source.sourceAbsolutePath, output),
  });
}

export function createRepoWorkflowArtifactPlan(options: {
  config?: RepoWorkflowConfig;
  source: RepoWorkflowArtifactPlanSource;
  currentWorkingDirectory: string;
}): RepoWorkflowArtifactPlan {
  const outputs =
    options.source.outputs.length > 0
      ? options.source.outputs
      : [defaultSvgOutput(options.source)];

  return {
    source: options.source,
    outputs: outputsInArtifactOrder(outputs).map((output) =>
      planOutput({
        config: options.config,
        source: options.source,
        output,
        currentWorkingDirectory: options.currentWorkingDirectory,
      }),
    ),
    markdownReferences: markdownReferencesForSource(
      options.config,
      options.source,
    ),
  };
}
