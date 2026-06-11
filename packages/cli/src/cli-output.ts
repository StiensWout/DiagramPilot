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
    "  format <path>",
    "  check [path] [--json]",
    "  generate [path] [--json]",
    "  watch [path]",
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

export function watchUsageText(): string {
  return "Usage: diagrampilot watch [path]";
}

export function formatUsageText(): string {
  return "Usage: diagrampilot format <path>";
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

const uppercaseArtifactFormats = new Set(["d2", "dot", "png", "svg"]);

function artifactLabel(artifact: CheckArtifact): string {
  const format = artifactFormat(artifact);

  if (uppercaseArtifactFormats.has(format)) {
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
  const outputPath = artifact.path;
  const commands: Record<string, string> = {
    svg: `diagrampilot render ${sourcePath} --out ${outputPath}`,
    png: `diagrampilot render ${sourcePath} --format png --out ${outputPath}`,
    mermaid: `diagrampilot export ${sourcePath} --format mermaid --out ${outputPath}`,
    d2: `diagrampilot export ${sourcePath} --format d2 --out ${outputPath}`,
    dot: `diagrampilot export ${sourcePath} --format dot --out ${outputPath}`,
    markdown: `diagrampilot generate ${sourcePath}`,
  };

  return commands[format];
}

function repairSentence(
  artifact: CheckArtifact,
  sourcePath: string,
): string {
  const command = repairCommand(artifact, sourcePath);

  return command === undefined ? "" : ` Run \`${command}\`.`;
}

function freshCheckText(sourceResults: readonly RepoWorkflowCheckSourceResult[]): string {
  const artifactDescription = sourceResults.some(
    (source) => source.artifacts !== undefined,
  )
    ? "artifacts"
    : "SVG artifacts";

  return `Checked ${formatSourceCount(sourceResults.length)}. All expected ${artifactDescription} are fresh.`;
}

function invalidSourceLine(source: RepoWorkflowCheckSourceResult): string {
  return `Invalid source: ${source.sourcePath}. Run \`diagrampilot validate ${source.sourcePath}\`.`;
}

function artifactIssuePrefix(artifact: Exclude<CheckArtifact, { status: "fresh" }>): string {
  const label = artifactLabel(artifact);
  const labels = {
    "missing-artifact": `Missing ${label} artifact`,
    stale: `Stale ${label} artifact`,
    "missing-provenance": "Missing DiagramPilot provenance",
    unchecked: `Unchecked ${label} artifact`,
    "unreadable-artifact": `Unreadable ${label} artifact`,
    "malformed-artifact": `Malformed ${label} artifact`,
  };

  return labels[artifact.status];
}

function artifactIssueLine(
  source: RepoWorkflowCheckSourceResult,
  artifact: Exclude<CheckArtifact, { status: "fresh" }>,
): string | undefined {
  if (!("path" in artifact)) return undefined;

  const reason =
    artifact.status === "stale" ? ` (${artifact.reasons.join(", ")})` : "";

  return `${artifactIssuePrefix(artifact)}: ${artifact.path} for ${source.sourcePath}${reason}.${repairSentence(artifact, source.sourcePath)}`;
}

function issueLinesForSource(source: RepoWorkflowCheckSourceResult): string[] {
  if (source.validation.ok === false) return [invalidSourceLine(source)];

  return sourceArtifacts(source)
    .filter(isIssueArtifact)
    .map((artifact) => artifactIssueLine(source, artifact))
    .filter((line): line is string => line !== undefined);
}

export function formatCheckTextReport(
  sourceResults: readonly RepoWorkflowCheckSourceResult[],
): string {
  const issueSources = sourceResults.filter(isArtifactFailure);

  if (issueSources.length === 0) {
    return freshCheckText(sourceResults);
  }

  const lines = [
    `Checked ${formatSourceCount(sourceResults.length)}. Found ${issueSources.length} workflow issues.`,
  ];

  for (const source of issueSources) {
    lines.push(...issueLinesForSource(source));
  }

  return lines.join("\n");
}
