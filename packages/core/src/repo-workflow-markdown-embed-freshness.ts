import type {
  MarkdownEmbedReferencedArtifactIssue,
  MarkdownEmbedStaleReason,
  RepoWorkflowCheckConfiguredArtifactResult,
} from "./repo-workflow-configured-artifact-result.js";

export function referencedArtifactIssue(
  artifact: RepoWorkflowCheckConfiguredArtifactResult,
): MarkdownEmbedReferencedArtifactIssue | undefined {
  if (artifact.format === "markdown" || artifact.status === "fresh") {
    return undefined;
  }

  return {
    format: artifact.format,
    path: artifact.path,
    status: artifact.status,
  };
}

function referencedArtifactStaleReason(
  issue: MarkdownEmbedReferencedArtifactIssue,
): MarkdownEmbedStaleReason {
  if (issue.status === "missing-artifact") {
    return "referenced-artifact-missing";
  }

  if (issue.status === "unreadable-artifact") {
    return "referenced-artifact-unreadable";
  }

  if (issue.status === "unchecked") {
    return "referenced-artifact-unchecked";
  }

  return "referenced-artifact-stale";
}

function uniqueMarkdownStaleReasons(
  reasons: readonly MarkdownEmbedStaleReason[],
): MarkdownEmbedStaleReason[] {
  return [...new Set(reasons)];
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function expectedContentHashValue(
  result: RepoWorkflowCheckConfiguredArtifactResult,
): string | undefined {
  if ("expectedSha256" in result) {
    return optionalString(result.expectedSha256);
  }

  return undefined;
}

function actualContentHashValue(
  result: RepoWorkflowCheckConfiguredArtifactResult,
): string | undefined {
  if ("actualSha256" in result) {
    return optionalString(result.actualSha256);
  }

  return undefined;
}

function contentHashValue(
  result: RepoWorkflowCheckConfiguredArtifactResult,
  key: "actualSha256" | "expectedSha256",
): string | undefined {
  return key === "expectedSha256"
    ? expectedContentHashValue(result)
    : actualContentHashValue(result);
}

function completeContentMismatchHashes(hashes: {
  expectedSha256: string | undefined;
  actualSha256: string | undefined;
}): { expectedSha256: string; actualSha256: string } | undefined {
  if (hashes.expectedSha256 === undefined) {
    return undefined;
  }

  if (hashes.actualSha256 === undefined) {
    return undefined;
  }

  return {
    expectedSha256: hashes.expectedSha256,
    actualSha256: hashes.actualSha256,
  };
}

function contentMismatchHashes(
  result: RepoWorkflowCheckConfiguredArtifactResult,
): { expectedSha256: string; actualSha256: string } | undefined {
  if (result.status !== "stale") {
    return undefined;
  }

  return completeContentMismatchHashes({
    expectedSha256: contentHashValue(result, "expectedSha256"),
    actualSha256: contentHashValue(result, "actualSha256"),
  });
}

function markdownContentStaleReasons(
  result: RepoWorkflowCheckConfiguredArtifactResult,
): MarkdownEmbedStaleReason[] {
  return contentMismatchHashes(result) === undefined ? [] : ["content-mismatch"];
}

function acceptsReferencedArtifactIssues(
  result: RepoWorkflowCheckConfiguredArtifactResult,
): boolean {
  return (
    result.format === "markdown" &&
    result.status !== "missing-artifact" &&
    result.status !== "unreadable-artifact"
  );
}

export function markdownResultWithReferencedArtifactIssues(
  contentResult: RepoWorkflowCheckConfiguredArtifactResult,
  referenceIssues: readonly MarkdownEmbedReferencedArtifactIssue[],
): RepoWorkflowCheckConfiguredArtifactResult {
  if (
    referenceIssues.length === 0 ||
    !acceptsReferencedArtifactIssues(contentResult)
  ) {
    return contentResult;
  }

  const reasons = uniqueMarkdownStaleReasons([
    ...markdownContentStaleReasons(contentResult),
    ...referenceIssues.map(referencedArtifactStaleReason),
  ]);

  if (reasons.length === 0) {
    return contentResult;
  }

  return {
    format: "markdown",
    status: "stale",
    path: contentResult.path,
    reasons,
    ...contentMismatchHashes(contentResult),
    references: referenceIssues,
  };
}
