import type { RepoWorkflowCheckSourceResult } from "@diagrampilot/core";

import type { Writable } from "./types.js";

export function writeLine(stream: Writable, message: string): void {
  stream.write(`${message}\n`);
}

export function textLine(message: string): string {
  return `${message}\n`;
}

export function jsonTextLine(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function helpText(version: string): string {
  return [
    `diagrampilot ${version}`,
    "",
    "Usage:",
    "  diagrampilot --version",
    "  diagrampilot --help",
    "",
    "MVP commands:",
    "  init [--docs] [--config]",
    "  validate <path> [--json]",
    "  check [path] [--json]",
    "  generate [path] [--json]",
    "  mcp",
    "  render <path> --out <path>",
    "  render <path> --format svg --out <path>",
    "  render <path> --format png --out <path>",
    "  export <path> --format mermaid [--out <path>]",
    "  export <path> --format d2 [--out <path>]",
    "  export <path> --format dot [--out <path>]",
  ].join("\n");
}

export function checkUsageText(): string {
  return "Usage: diagrampilot check [path] [--json]";
}

export function generateUsageText(): string {
  return "Usage: diagrampilot generate [path] [--json]";
}

export function exportUsageText(): string {
  return [
    "Usage:",
    "  diagrampilot export <path> --format mermaid [--out <path>]",
    "  diagrampilot export <path> --format d2 [--out <path>]",
    "  diagrampilot export <path> --format dot [--out <path>]",
  ].join("\n");
}

export function renderUsageText(): string {
  return [
    "Usage:",
    "  diagrampilot render <path> --out <path>",
    "  diagrampilot render <path> --format svg --out <path>",
    "  diagrampilot render <path> --format png --out <path>",
  ].join("\n");
}

function formatSourceCount(count: number): string {
  return `${count} DiagramPilot Source File${count === 1 ? "" : "s"}`;
}

type CheckArtifact = RepoWorkflowCheckSourceResult["artifact"] | NonNullable<
  RepoWorkflowCheckSourceResult["artifacts"]
>[number];

function sourceArtifacts(source: RepoWorkflowCheckSourceResult): CheckArtifact[] {
  return source.artifacts === undefined ? [source.artifact] : [...source.artifacts];
}

function isArtifactFailure(source: RepoWorkflowCheckSourceResult): boolean {
  return (
    source.validation.ok === false ||
    sourceArtifacts(source).some((artifact) => artifact.status !== "fresh")
  );
}

function isIssueArtifact(
  artifact: CheckArtifact,
): artifact is Exclude<
  CheckArtifact,
  { status: "fresh" }
> {
  return artifact.status !== "fresh";
}

function artifactFormat(artifact: CheckArtifact): string {
  return "format" in artifact ? artifact.format : "svg";
}

function artifactLabel(artifact: CheckArtifact): string {
  const format = artifactFormat(artifact);

  if (format === "d2" || format === "dot" || format === "png" || format === "svg") {
    return format.toUpperCase();
  }

  return format[0].toUpperCase() + format.slice(1);
}

function repairCommand(
  artifact: CheckArtifact,
  sourcePath: string,
): string | undefined {
  if (!("path" in artifact)) {
    return undefined;
  }

  const format = artifactFormat(artifact);

  if (format === "svg") {
    return `diagrampilot render ${sourcePath} --out ${artifact.path}`;
  }

  if (format === "png") {
    return `diagrampilot render ${sourcePath} --format png --out ${artifact.path}`;
  }

  if (format === "mermaid" || format === "d2" || format === "dot") {
    return `diagrampilot export ${sourcePath} --format ${format} --out ${artifact.path}`;
  }

  if (format === "markdown") {
    return `diagrampilot generate ${sourcePath}`;
  }

  return undefined;
}

function repairSentence(
  artifact: CheckArtifact,
  sourcePath: string,
): string {
  const command = repairCommand(artifact, sourcePath);

  return command === undefined ? "" : ` Run \`${command}\`.`;
}

export function formatCheckTextReport(
  sourceResults: readonly RepoWorkflowCheckSourceResult[],
): string {
  const issueSources = sourceResults.filter(isArtifactFailure);

  if (issueSources.length === 0) {
    const artifactDescription = sourceResults.some(
      (source) => source.artifacts !== undefined,
    )
      ? "artifacts"
      : "SVG artifacts";

    return `Checked ${formatSourceCount(sourceResults.length)}. All expected ${artifactDescription} are fresh.`;
  }

  const lines = [
    `Checked ${formatSourceCount(sourceResults.length)}. Found ${issueSources.length} workflow issues.`,
  ];

  for (const source of issueSources) {
    if (source.validation.ok === false) {
      lines.push(
        `Invalid source: ${source.sourcePath}. Run \`diagrampilot validate ${source.sourcePath}\`.`,
      );
      continue;
    }

    for (const artifact of sourceArtifacts(source)) {
      if (!isIssueArtifact(artifact)) {
        continue;
      }

      if (!("path" in artifact)) {
        continue;
      }

      const label = artifactLabel(artifact);

      if (artifact.status === "missing-artifact") {
        lines.push(
          `Missing ${label} artifact: ${artifact.path} for ${source.sourcePath}.${repairSentence(artifact, source.sourcePath)}`,
        );
        continue;
      }

      if (artifact.status === "stale") {
        lines.push(
          `Stale ${label} artifact: ${artifact.path} for ${source.sourcePath} (${artifact.reasons.join(", ")}).${repairSentence(artifact, source.sourcePath)}`,
        );
        continue;
      }

      if (artifact.status === "missing-provenance") {
        lines.push(
          `Missing DiagramPilot provenance: ${artifact.path} for ${source.sourcePath}.${repairSentence(artifact, source.sourcePath)}`,
        );
        continue;
      }

      if (artifact.status === "unchecked") {
        lines.push(
          `Unchecked ${label} artifact: ${artifact.path} for ${source.sourcePath}.${repairSentence(artifact, source.sourcePath)}`,
        );
        continue;
      }

      const issueLabel =
        artifact.status === "unreadable-artifact"
          ? `Unreadable ${label} artifact`
          : `Malformed ${label} artifact`;
      lines.push(
        `${issueLabel}: ${artifact.path} for ${source.sourcePath}.${repairSentence(artifact, source.sourcePath)}`,
      );
    }
  }

  return lines.join("\n");
}
