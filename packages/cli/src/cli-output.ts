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

function isArtifactFailure(source: RepoWorkflowCheckSourceResult): boolean {
  return source.validation.ok === false || source.artifact.status !== "fresh";
}

function isIssueArtifact(
  artifact: RepoWorkflowCheckSourceResult["artifact"],
): artifact is Exclude<
  RepoWorkflowCheckSourceResult["artifact"],
  { status: "fresh" } | { status: "unchecked" }
> {
  return artifact.status !== "fresh" && artifact.status !== "unchecked";
}

export function formatCheckTextReport(
  sourceResults: readonly RepoWorkflowCheckSourceResult[],
): string {
  const issueSources = sourceResults.filter(isArtifactFailure);

  if (issueSources.length === 0) {
    return `Checked ${formatSourceCount(sourceResults.length)}. All expected SVG artifacts are fresh.`;
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

    if (!isIssueArtifact(source.artifact)) {
      continue;
    }

    if (source.artifact.status === "missing-artifact") {
      lines.push(
        `Missing SVG artifact: ${source.artifact.path} for ${source.sourcePath}. Run \`diagrampilot render ${source.sourcePath} --out ${source.artifact.path}\`.`,
      );
      continue;
    }

    if (source.artifact.status === "stale") {
      lines.push(
        `Stale SVG artifact: ${source.artifact.path} for ${source.sourcePath} (${source.artifact.reasons.join(", ")}). Run \`diagrampilot render ${source.sourcePath} --out ${source.artifact.path}\`.`,
      );
      continue;
    }

    if (source.artifact.status === "missing-provenance") {
      lines.push(
        `Missing DiagramPilot provenance: ${source.artifact.path} for ${source.sourcePath}. Run \`diagrampilot render ${source.sourcePath} --out ${source.artifact.path}\`.`,
      );
      continue;
    }

    const artifactLabel =
      source.artifact.status === "unreadable-artifact"
        ? "Unreadable SVG artifact"
        : "Malformed SVG artifact";
    lines.push(
      `${artifactLabel}: ${source.artifact.path} for ${source.sourcePath}. Run \`diagrampilot render ${source.sourcePath} --out ${source.artifact.path}\`.`,
    );
  }

  return lines.join("\n");
}
