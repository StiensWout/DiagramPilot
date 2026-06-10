import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";

import type { DiagramSpec } from "./diagramspec-topology.js";
import type {
  RepoWorkflowArtifactOutput,
  RepoWorkflowArtifactOutputFormat,
  RepoWorkflowConfig,
} from "./repo-workflow-config.js";
import type {
  ConfiguredTextArtifactFormat,
  RepoWorkflowCheckConfiguredArtifactResult,
} from "./repo-workflow-configured-artifact-result.js";
import {
  createMarkdownEmbedContent,
  createMarkdownEmbedReferences,
} from "./repo-workflow-markdown-embed.js";
import {
  markdownResultWithReferencedArtifactIssues,
  referencedArtifactIssue,
} from "./repo-workflow-markdown-embed-freshness.js";
import {
  deriveConfiguredArtifactDisplayPath,
  resolveConfiguredOutputPath,
} from "./repo-workflow-configured-artifact-paths.js";
import { normalizePathForDisplay } from "./repo-workflow-paths.js";
import type { DiagramPilotSourceFile } from "./source-loading.js";
import type {
  SvgArtifactFreshnessCheckResult,
  SvgArtifactRenderer,
} from "./svg-artifact-freshness.js";

export {
  configuredExplicitSourcesForScope,
  configuredOutputsForSource,
  configuredSourceDiscoveryOptions,
  deriveConfiguredArtifactDisplayPath,
  mergeDiscoveredAndConfiguredSources,
  resolveConfiguredOutputPath,
} from "./repo-workflow-configured-artifact-paths.js";

export interface CheckConfiguredArtifactsForValidatedSourceOptions {
  config: RepoWorkflowConfig;
  source: DiagramPilotSourceFile;
  sourceAbsolutePath: string;
  provenanceSourcePath: string;
  spec: DiagramSpec;
  outputs: readonly RepoWorkflowArtifactOutput[];
  currentWorkingDirectory: string;
  diagramPilotVersion?: string;
  renderer: SvgArtifactRenderer;
  checkExpectedSvgArtifactFreshnessForValidatedSource(options: {
    source: DiagramPilotSourceFile;
    artifactPath?: string;
    provenanceSourcePath: string;
    diagramPilotVersion?: string;
    renderer: SvgArtifactRenderer;
  }): Promise<SvgArtifactFreshnessCheckResult>;
  exportConfiguredTextArtifact?(options: {
    format: ConfiguredTextArtifactFormat;
    spec: DiagramSpec;
  }): string;
}

function isConfiguredTextArtifactFormat(
  format: RepoWorkflowArtifactOutputFormat,
): format is ConfiguredTextArtifactFormat {
  return format === "mermaid" || format === "d2" || format === "dot";
}

function sha256(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

function unreadableArtifactMessage(
  artifactPath: string,
  error: unknown,
): string {
  return error instanceof Error
    ? error.message
    : `Unable to read ${artifactPath}`;
}

function missingArtifactResult(options: {
  format: RepoWorkflowArtifactOutputFormat;
  displayPath: string;
}): RepoWorkflowCheckConfiguredArtifactResult {
  return {
    format: options.format,
    status: "missing-artifact",
    path: options.displayPath,
  };
}

function unreadableArtifactResult(options: {
  format: RepoWorkflowArtifactOutputFormat;
  artifactPath: string;
  displayPath: string;
  error: unknown;
}): RepoWorkflowCheckConfiguredArtifactResult {
  return {
    format: options.format,
    status: "unreadable-artifact",
    path: options.displayPath,
    message: unreadableArtifactMessage(options.artifactPath, options.error),
  };
}

function artifactReadFailureResult(options: {
  format: RepoWorkflowArtifactOutputFormat;
  artifactPath: string;
  displayPath: string;
  error: unknown;
}): RepoWorkflowCheckConfiguredArtifactResult {
  if ((options.error as NodeJS.ErrnoException).code === "ENOENT") {
    return missingArtifactResult(options);
  }

  return unreadableArtifactResult(options);
}

function checkConfiguredPresenceOnlyArtifact(options: {
  format: RepoWorkflowArtifactOutputFormat;
  artifactPath: string;
  displayPath: string;
}): RepoWorkflowCheckConfiguredArtifactResult {
  try {
    const stat = statSync(options.artifactPath);

    if (!stat.isFile()) {
      return {
        format: options.format,
        status: "unreadable-artifact",
        path: options.displayPath,
        message: "Expected a file artifact.",
      };
    }
  } catch (error) {
    return artifactReadFailureResult({ ...options, error });
  }

  return {
    format: options.format,
    status: "fresh",
    path: options.displayPath,
    freshness: "presence-only",
  };
}

function checkConfiguredTextArtifact(options: {
  format: ConfiguredTextArtifactFormat | "markdown";
  artifactPath: string;
  displayPath: string;
  expectedContent: string;
}): RepoWorkflowCheckConfiguredArtifactResult {
  let actualContent: string;

  try {
    actualContent = readFileSync(options.artifactPath, "utf8");
  } catch (error) {
    return artifactReadFailureResult({ ...options, error });
  }

  if (actualContent !== options.expectedContent) {
    return {
      format: options.format,
      status: "stale",
      path: options.displayPath,
      reasons: ["content-mismatch"],
      expectedSha256: sha256(options.expectedContent),
      actualSha256: sha256(actualContent),
    };
  }

  return {
    format: options.format,
    status: "fresh",
    path: options.displayPath,
    freshness: "content",
  };
}

function outputsInCheckOrder(
  outputs: readonly RepoWorkflowArtifactOutput[],
): RepoWorkflowArtifactOutput[] {
  return [
    ...outputs.filter((output) => output.format !== "markdown"),
    ...outputs.filter((output) => output.format === "markdown"),
  ];
}

function mapFreshConfiguredSvgArtifactResult(
  artifact: Extract<SvgArtifactFreshnessCheckResult, { status: "fresh" }>,
  displayPath: string,
): RepoWorkflowCheckConfiguredArtifactResult {
  return {
    format: "svg",
    status: "fresh",
    path: displayPath,
    provenance: artifact.provenance,
  };
}

function mapNonFreshConfiguredSvgArtifactResult(
  artifact: Exclude<SvgArtifactFreshnessCheckResult, { status: "fresh" }>,
  displayPath: string,
): RepoWorkflowCheckConfiguredArtifactResult {
  if (artifact.status === "stale") {
    return {
      format: "svg",
      status: "stale",
      path: displayPath,
      reasons: artifact.reasons,
      expected: artifact.expected,
      actual: artifact.actual,
    };
  }

  if (isMessageConfiguredSvgArtifactResult(artifact)) {
    return {
      format: "svg",
      status: artifact.status,
      path: displayPath,
      message: artifact.message,
    };
  }

  if (artifact.status === "unchecked") {
    return {
      format: "svg",
      status: "unchecked",
      path: displayPath,
      message: "Configured SVG artifact freshness was not checked.",
    };
  }

  return {
    format: "svg",
    status: artifact.status,
    path: displayPath,
  };
}

function isMessageConfiguredSvgArtifactResult(
  artifact: Exclude<SvgArtifactFreshnessCheckResult, { status: "fresh" }>,
): artifact is Extract<
  SvgArtifactFreshnessCheckResult,
  { status: "unreadable-artifact" | "malformed-artifact" }
> {
  return (
    artifact.status === "unreadable-artifact" ||
    artifact.status === "malformed-artifact"
  );
}

function mapConfiguredSvgArtifactResult(
  artifact: SvgArtifactFreshnessCheckResult,
  displayPath: string,
): RepoWorkflowCheckConfiguredArtifactResult {
  if (artifact.status === "fresh") {
    return mapFreshConfiguredSvgArtifactResult(artifact, displayPath);
  }

  return mapNonFreshConfiguredSvgArtifactResult(artifact, displayPath);
}

function configuredOutputPaths(
  options: CheckConfiguredArtifactsForValidatedSourceOptions,
  output: RepoWorkflowArtifactOutput,
): { artifactPath: string; displayPath: string } {
  const artifactPath = resolveConfiguredOutputPath(
    options.config,
    options.sourceAbsolutePath,
    output,
  );
  const displayPath = normalizePathForDisplay(
    deriveConfiguredArtifactDisplayPath(
      options.config.directory,
      artifactPath,
      options.currentWorkingDirectory,
    ),
  );

  return {
    artifactPath,
    displayPath,
  };
}

async function checkConfiguredSvgOutput(options: {
  workflow: CheckConfiguredArtifactsForValidatedSourceOptions;
  artifactPath: string;
  displayPath: string;
}): Promise<RepoWorkflowCheckConfiguredArtifactResult> {
  const artifact =
    await options.workflow.checkExpectedSvgArtifactFreshnessForValidatedSource({
      source: options.workflow.source,
      artifactPath: options.artifactPath,
      provenanceSourcePath: options.workflow.provenanceSourcePath,
      diagramPilotVersion: options.workflow.diagramPilotVersion,
      renderer: options.workflow.renderer,
    });

  return mapConfiguredSvgArtifactResult(artifact, options.displayPath);
}

function checkConfiguredTextOutput(options: {
  workflow: CheckConfiguredArtifactsForValidatedSourceOptions;
  format: ConfiguredTextArtifactFormat;
  artifactPath: string;
  displayPath: string;
}): RepoWorkflowCheckConfiguredArtifactResult {
  if (options.workflow.exportConfiguredTextArtifact === undefined) {
    return {
      format: options.format,
      status: "unchecked",
      path: options.displayPath,
      message: "Configured text artifact freshness requires an exporter.",
    };
  }

  return checkConfiguredTextArtifact({
    format: options.format,
    artifactPath: options.artifactPath,
    displayPath: options.displayPath,
    expectedContent: options.workflow.exportConfiguredTextArtifact({
      format: options.format,
      spec: options.workflow.spec,
    }),
  });
}

function checkConfiguredMarkdownOutput(options: {
  workflow: CheckConfiguredArtifactsForValidatedSourceOptions;
  artifactPath: string;
  displayPath: string;
  previousResults: readonly RepoWorkflowCheckConfiguredArtifactResult[];
}): RepoWorkflowCheckConfiguredArtifactResult {
  const contentResult = checkConfiguredTextArtifact({
    format: "markdown",
    artifactPath: options.artifactPath,
    displayPath: options.displayPath,
    expectedContent: createMarkdownEmbedContent({
      spec: options.workflow.spec,
      embedPath: options.artifactPath,
      references: createMarkdownEmbedReferences({
        outputs: options.workflow.outputs,
        resolvePath: (referencedOutput) =>
          resolveConfiguredOutputPath(
            options.workflow.config,
            options.workflow.sourceAbsolutePath,
            referencedOutput,
          ),
      }),
    }),
  });
  const referenceIssues = options.previousResults
    .map(referencedArtifactIssue)
    .filter((issue) => issue !== undefined);

  return markdownResultWithReferencedArtifactIssues(
    contentResult,
    referenceIssues,
  );
}

async function checkConfiguredOutput(options: {
  workflow: CheckConfiguredArtifactsForValidatedSourceOptions;
  output: RepoWorkflowArtifactOutput;
  previousResults: readonly RepoWorkflowCheckConfiguredArtifactResult[];
}): Promise<RepoWorkflowCheckConfiguredArtifactResult> {
  const { artifactPath, displayPath } = configuredOutputPaths(
    options.workflow,
    options.output,
  );

  if (options.output.format === "svg") {
    return await checkConfiguredSvgOutput({
      workflow: options.workflow,
      artifactPath,
      displayPath,
    });
  }

  if (isConfiguredTextArtifactFormat(options.output.format)) {
    return checkConfiguredTextOutput({
      workflow: options.workflow,
      format: options.output.format,
      artifactPath,
      displayPath,
    });
  }

  if (options.output.format === "markdown") {
    return checkConfiguredMarkdownOutput({
      workflow: options.workflow,
      artifactPath,
      displayPath,
      previousResults: options.previousResults,
    });
  }

  return checkConfiguredPresenceOnlyArtifact({
    format: options.output.format,
    artifactPath,
    displayPath,
  });
}

export async function checkConfiguredArtifactsForValidatedSource(
  options: CheckConfiguredArtifactsForValidatedSourceOptions,
): Promise<RepoWorkflowCheckConfiguredArtifactResult[]> {
  const results: RepoWorkflowCheckConfiguredArtifactResult[] = [];

  for (const output of outputsInCheckOrder(options.outputs)) {
    results.push(
      await checkConfiguredOutput({
        workflow: options,
        output,
        previousResults: results,
      }),
    );
  }

  return results;
}
