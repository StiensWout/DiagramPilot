import type { RepoWorkflowCheckSourceResult } from "./repo-workflow-check.js";
import { deriveDefaultArtifactDisplayPath } from "./repo-workflow-paths.js";
import type {
  SvgArtifactFreshnessCheckResult,
} from "./svg-artifact-freshness.js";

function isWorkflowIssue(source: RepoWorkflowCheckSourceResult): boolean {
  if (source.artifacts !== undefined) {
    return (
      source.validation.ok === false ||
      source.artifacts.some((artifact) => artifact.status !== "fresh")
    );
  }

  return source.validation.ok === false || source.artifact.status !== "fresh";
}

function isFreshSource(source: RepoWorkflowCheckSourceResult): boolean {
  if (source.validation.ok === false) {
    return false;
  }

  if (source.artifacts !== undefined) {
    return source.artifacts.every((artifact) => artifact.status === "fresh");
  }

  return source.artifact.status === "fresh";
}

export function summarizeSources(
  sources: readonly RepoWorkflowCheckSourceResult[],
) {
  return {
    checkedSourceCount: sources.length,
    freshSourceCount: sources.filter(isFreshSource).length,
    issueCount: sources.filter(isWorkflowIssue).length,
  };
}

export function mapArtifactResult(
  sourcePath: string,
  artifact: SvgArtifactFreshnessCheckResult,
  currentWorkingDirectory: string,
): RepoWorkflowCheckSourceResult["artifact"] {
  if (artifact.status === "unchecked") {
    return {
      status: "unchecked",
    };
  }

  const artifactPath = deriveDefaultArtifactDisplayPath(
    sourcePath,
    artifact.artifactPath,
    currentWorkingDirectory,
  );

  return mapCheckedArtifactResult(artifact, artifactPath);
}

function mapCheckedArtifactResult(
  artifact: Exclude<SvgArtifactFreshnessCheckResult, { status: "unchecked" }>,
  artifactPath: string,
): RepoWorkflowCheckSourceResult["artifact"] {
  if (artifact.status === "fresh") {
    return {
      status: "fresh",
      path: artifactPath,
      provenance: artifact.provenance,
    };
  }

  if (artifact.status === "stale") {
    return {
      status: "stale",
      path: artifactPath,
      reasons: artifact.reasons,
      expected: artifact.expected,
      actual: artifact.actual,
    };
  }

  if (isMessageArtifactResult(artifact)) {
    return {
      status: artifact.status,
      path: artifactPath,
      message: artifact.message,
    };
  }

  return {
    status: artifact.status,
    path: artifactPath,
  };
}

function isMessageArtifactResult(
  artifact: Exclude<SvgArtifactFreshnessCheckResult, { status: "unchecked" }>,
): artifact is Extract<
  SvgArtifactFreshnessCheckResult,
  { status: "unreadable-artifact" | "malformed-artifact" }
> {
  return (
    artifact.status === "unreadable-artifact" ||
    artifact.status === "malformed-artifact"
  );
}
