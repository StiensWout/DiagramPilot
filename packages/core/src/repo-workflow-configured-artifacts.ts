import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";

import type { DiagramSpec } from "./diagramspec-topology.js";
import type {
  RepoWorkflowArtifactOutput,
  RepoWorkflowArtifactOutputFormat,
  RepoWorkflowConfig,
} from "./repo-workflow-config.js";
import {
  createRepoWorkflowArtifactPlan,
  type RepoWorkflowArtifactPlanItem,
} from "./repo-workflow-artifact-plan.js";
import type {
  ConfiguredTextArtifactFormat,
  RepoWorkflowCheckConfiguredArtifactResult,
} from "./repo-workflow-configured-artifact-result.js";
import {
  createMarkdownEmbedContent,
  type MarkdownEmbedReferencedArtifact,
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
  mergeDiscoveredAndConfiguredSources,
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
    outputProfile?: RepoWorkflowArtifactOutput["profile"];
  }): Promise<SvgArtifactFreshnessCheckResult>;
  exportConfiguredTextArtifact?(options: {
    format: ConfiguredTextArtifactFormat;
    profile?: RepoWorkflowArtifactOutput["profile"];
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


async function checkConfiguredSvgOutput(options: {
  workflow: CheckConfiguredArtifactsForValidatedSourceOptions;
  output: RepoWorkflowArtifactOutput;
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
      outputProfile: options.output.profile,
    });

  return mapConfiguredSvgArtifactResult(artifact, options.displayPath);
}

function checkConfiguredTextOutput(options: {
  workflow: CheckConfiguredArtifactsForValidatedSourceOptions;
  output: RepoWorkflowArtifactOutput & { format: ConfiguredTextArtifactFormat };
  artifactPath: string;
  displayPath: string;
}): RepoWorkflowCheckConfiguredArtifactResult {
  if (options.workflow.exportConfiguredTextArtifact === undefined) {
    return {
      format: options.output.format,
      status: "unchecked",
      path: options.displayPath,
      message: "Configured text artifact freshness requires an exporter.",
    };
  }

  return checkConfiguredTextArtifact({
    format: options.output.format,
    artifactPath: options.artifactPath,
    displayPath: options.displayPath,
    expectedContent: options.workflow.exportConfiguredTextArtifact({
      format: options.output.format,
      profile: options.output.profile,
      spec: options.workflow.spec,
    }),
  });
}

function checkConfiguredMarkdownOutput(options: {
  workflow: CheckConfiguredArtifactsForValidatedSourceOptions;
  artifactPath: string;
  displayPath: string;
  references: readonly MarkdownEmbedReferencedArtifact[];
  previousResults: readonly RepoWorkflowCheckConfiguredArtifactResult[];
}): RepoWorkflowCheckConfiguredArtifactResult {
  const contentResult = checkConfiguredTextArtifact({
    format: "markdown",
    artifactPath: options.artifactPath,
    displayPath: options.displayPath,
    expectedContent: createMarkdownEmbedContent({
      spec: options.workflow.spec,
      embedPath: options.artifactPath,
      references: options.references,
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
  plannedOutput: RepoWorkflowArtifactPlanItem;
  markdownReferences: readonly MarkdownEmbedReferencedArtifact[];
  previousResults: readonly RepoWorkflowCheckConfiguredArtifactResult[];
}): Promise<RepoWorkflowCheckConfiguredArtifactResult> {
  const { output, absolutePath, displayPath } = options.plannedOutput;

  if (output.format === "svg") {
    return await checkConfiguredSvgOutput({
      workflow: options.workflow,
      output,
      artifactPath: absolutePath,
      displayPath,
    });
  }

  if (isConfiguredTextArtifactFormat(output.format)) {
    return checkConfiguredTextOutput({
      workflow: options.workflow,
      output: output as RepoWorkflowArtifactOutput & {
        format: ConfiguredTextArtifactFormat;
      },
      artifactPath: absolutePath,
      displayPath,
    });
  }

  if (output.format === "markdown") {
    return checkConfiguredMarkdownOutput({
      workflow: options.workflow,
      artifactPath: absolutePath,
      displayPath,
      references: options.markdownReferences,
      previousResults: options.previousResults,
    });
  }

  return checkConfiguredPresenceOnlyArtifact({
    format: output.format,
    artifactPath: absolutePath,
    displayPath,
  });
}

export async function checkConfiguredArtifactsForValidatedSource(
  options: CheckConfiguredArtifactsForValidatedSourceOptions,
): Promise<RepoWorkflowCheckConfiguredArtifactResult[]> {
  const results: RepoWorkflowCheckConfiguredArtifactResult[] = [];
  const plan = createRepoWorkflowArtifactPlan({
    config: options.config,
    source: {
      sourcePath: options.provenanceSourcePath,
      sourceAbsolutePath: options.sourceAbsolutePath,
      source: options.source,
      spec: options.spec,
      outputs: options.outputs,
    },
    currentWorkingDirectory: options.currentWorkingDirectory,
  });

  for (const plannedOutput of plan.outputs) {
    results.push(
      await checkConfiguredOutput({
        workflow: options,
        plannedOutput,
        markdownReferences: plan.markdownReferences,
        previousResults: results,
      }),
    );
  }

  return results;
}
