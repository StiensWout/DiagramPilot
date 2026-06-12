import type {
  DiagramSpecLintResult,
  DiagramSpecLintWarning,
  RepoWorkflowCheckSourceResult,
  RepoWorkflowInspectResult,
  RepoWorkflowInspectSourceResult,
} from "@diagrampilot/core";
import {
  diagramPilotSourceTemplateNames,
  normalizeSvgArtifactProvenanceSourcePath,
} from "@diagrampilot/core";

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
    `  create <path> --template ${diagramPilotSourceTemplateNames.join("|")}`,
    "  validate <path> [--json]",
    "  lint <path> [--json]",
    "  format <path>",
    "  fix <path> [--json] [--fallback-icon lucide:<icon-name>]",
    "  check [path] [--json]",
    "  inspect [path] [--json]",
    "  generate [path] [--json]",
    "  watch [path]",
    "  mcp",
    "  icons list",
    "  icons search <query>",
    "  render <path> --out <path>",
    "  render <path> --view <view-id> --out <path>",
    "  render <path> --group <group-id> --out <path>",
    "  render <path> --around <node-id> --depth <n> --out <path>",
    "  render <path> --hide-edge-labels --out <path>",
    "  render <path> --format svg --out <path>",
    "  render <path> --format png --out <path>",
    "  export <path> --format mermaid [--out <path>]",
    "  export <path> --view <view-id> --format mermaid [--out <path>]",
    "  export <path> --format d2 [--out <path>]",
    "  export <path> --format dot [--out <path>]",
  ].join("\n");
}

export function checkUsageText(): string {
  return "Usage: diagrampilot check [path] [--json]";
}

export function lintUsageText(): string {
  return "Usage: diagrampilot lint <path> [--json]";
}

export function inspectUsageText(): string {
  return "Usage: diagrampilot inspect [path] [--json]";
}

export function generateUsageText(): string {
  return "Usage: diagrampilot generate [path] [--json]";
}

export function iconsUsageText(): string {
  return [
    "Usage:",
    "  diagrampilot icons list",
    "  diagrampilot icons search <query>",
  ].join("\n");
}

export function createUsageText(): string {
  return `Usage: diagrampilot create <path> --template ${diagramPilotSourceTemplateNames.join("|")}`;
}

export function watchUsageText(): string {
  return "Usage: diagrampilot watch [path]";
}

export function formatUsageText(): string {
  return "Usage: diagrampilot format <path>";
}

export function fixUsageText(): string {
  return [
    "Usage:",
    "  diagrampilot fix <path> [--json]",
    "  diagrampilot fix <path> [--fallback-icon lucide:<icon-name>]",
  ].join("\n");
}

export function exportUsageText(): string {
  return [
    "Usage:",
    "  diagrampilot export <path> --format mermaid [--out <path>]",
    "  diagrampilot export <path> --view <view-id> --format mermaid [--out <path>]",
    "  diagrampilot export <path> --format d2 [--out <path>]",
    "  diagrampilot export <path> --format dot [--out <path>]",
  ].join("\n");
}

export function renderUsageText(): string {
  return [
    "Usage:",
    "  diagrampilot render <path> --out <path>",
    "  diagrampilot render <path> --view <view-id> --out <path>",
    "  diagrampilot render <path> --group <group-id> --out <path>",
    "  diagrampilot render <path> --around <node-id> --depth <n> --out <path>",
    "  diagrampilot render <path> --hide-edge-labels --out <path>",
    "  diagrampilot render <path> --format svg --out <path>",
    "  diagrampilot render <path> --format png --out <path>",
  ].join("\n");
}

function formatSourceCount(count: number): string {
  return `${count} DiagramPilot Source File${count === 1 ? "" : "s"}`;
}

function plural(count: number, singular: string, pluralLabel = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : pluralLabel}`;
}

function formatLintWarning(warning: DiagramSpecLintWarning): string {
  return `${warning.path} ${warning.ruleId} ${warning.severity}: ${warning.message} Suggestion: ${warning.suggestion}`;
}

export function formatLintTextReport(
  sourcePath: string,
  lintResult: DiagramSpecLintResult,
): string {
  if (lintResult.warnings.length === 0) {
    return `No lint warnings in ${sourcePath}.`;
  }

  return [
    `Lint found ${plural(lintResult.summary.warningCount, "warning")} in ${sourcePath}.`,
    ...lintResult.warnings.map(formatLintWarning),
  ].join("\n");
}

function formatValueList(values: readonly string[]): string {
  return values.length === 0 ? "none" : values.join(", ");
}

function formatInspectSummary(
  inspectResult: Extract<RepoWorkflowInspectResult, { ok: true }>,
): string {
  const invalidSources = inspectResult.summary.invalidSourceCount;
  const artifactIssues = inspectResult.summary.artifactIssueCount;
  const issueClauses = [
    invalidSources === 0 ? undefined : plural(invalidSources, "invalid source"),
    artifactIssues === 0 ? undefined : plural(artifactIssues, "artifact issue"),
  ].filter((clause): clause is string => clause !== undefined);
  const suffix =
    issueClauses.length === 0 ? "" : ` ${issueClauses.join(", ")}.`;

  return `Found ${formatSourceCount(
    inspectResult.summary.discoveredSourceCount,
  )} in ${inspectResult.scope.path}.${suffix}`;
}

function formatInspectObjectCounts(
  diagram: NonNullable<RepoWorkflowInspectSourceResult["diagram"]>,
): string {
  return formatInspectCounts(diagram.counts);
}

function formatInspectCounts(counts: {
  nodes: number;
  edges: number;
  groups: number;
}): string {
  return [
    plural(counts.nodes, "node"),
    plural(counts.edges, "edge"),
    plural(counts.groups, "group"),
  ].join(", ");
}

function formatInspectViews(
  diagram: NonNullable<RepoWorkflowInspectSourceResult["diagram"]>,
): string | undefined {
  const views = diagram.views ?? [];

  if (views.length === 0) {
    return undefined;
  }

  return `views: ${views
    .map((view) => `${view.id} (${formatInspectCounts(view.counts)})`)
    .join("; ")}`;
}

function formatInspectStableIds(
  diagram: NonNullable<RepoWorkflowInspectSourceResult["diagram"]>,
): string {
  return [
    `nodes=${formatValueList(diagram.stableIds.nodes)}`,
    `edges=${formatValueList(diagram.stableIds.edges)}`,
    `groups=${formatValueList(diagram.stableIds.groups)}`,
  ].join("; ");
}

function formatInspectTopology(
  diagram: NonNullable<RepoWorkflowInspectSourceResult["diagram"]>,
): string {
  return [
    `root nodes=${formatValueList(diagram.topology.rootNodeIds)}`,
    `root groups=${formatValueList(diagram.topology.rootGroupIds)}`,
    `max depth=${diagram.topology.maxDepth}`,
    `contains=${diagram.topology.containmentReferenceCount}`,
  ].join("; ");
}

function formatInspectArtifacts(source: RepoWorkflowInspectSourceResult): string {
  if (source.artifacts.length === 0) {
    return "none";
  }

  return source.artifacts
    .map((artifact) => `${artifact.format} ${artifact.path} ${artifact.status}`)
    .join("; ");
}

function formatInvalidInspectSource(source: RepoWorkflowInspectSourceResult): string[] {
  return [
    source.sourcePath,
    `  invalid: ${plural(source.validation.errors.length, "diagnostic")}`,
    "  diagnostics:",
    ...source.validation.errors.map(
      (error) => `    - ${error.path}: ${error.message} Suggestion: ${error.suggestion}`,
    ),
  ];
}

function formatValidInspectSource(source: RepoWorkflowInspectSourceResult): string[] {
  if (source.diagram === undefined) {
    return [source.sourcePath, "  diagram: unavailable"];
  }

  return [
    source.sourcePath,
    `  title: ${source.diagram.title}`,
    `  direction: ${source.diagram.direction ?? "unspecified"}`,
    `  objects: ${formatInspectObjectCounts(source.diagram)}`,
    `  Stable IDs: ${formatInspectStableIds(source.diagram)}`,
    `  topology: ${formatInspectTopology(source.diagram)}`,
    ...(formatInspectViews(source.diagram) === undefined
      ? []
      : [`  ${formatInspectViews(source.diagram)}`]),
    `  artifacts: ${formatInspectArtifacts(source)}`,
  ];
}

function formatInspectSource(source: RepoWorkflowInspectSourceResult): string[] {
  return source.validation.ok
    ? formatValidInspectSource(source)
    : formatInvalidInspectSource(source);
}

export function formatInspectTextReport(
  inspectResult: Extract<RepoWorkflowInspectResult, { ok: true }>,
): string {
  if (inspectResult.sources.length === 0) {
    return `No DiagramPilot Source Files found in ${inspectResult.scope.path}.`;
  }

  return [
    formatInspectSummary(inspectResult),
    ...inspectResult.sources.flatMap(formatInspectSource),
  ].join("\n");
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

type StaleArtifactWithProvenance = Extract<
  CheckArtifact,
  { status: "stale"; expected: unknown; actual: unknown }
>;

function hasStaleProvenance(
  artifact: Exclude<CheckArtifact, { status: "fresh" }>,
): artifact is StaleArtifactWithProvenance {
  return (
    artifact.status === "stale" &&
    "expected" in artifact &&
    "actual" in artifact
  );
}

function hasEquivalentProvenanceSourcePaths(
  artifact: StaleArtifactWithProvenance,
): boolean {
  const expected = normalizeSvgArtifactProvenanceSourcePath(
    artifact.expected.sourcePath,
  );
  const actual = normalizeSvgArtifactProvenanceSourcePath(
    artifact.actual.sourcePath,
  );

  return expected === actual;
}

function sourcePathMismatchHint(
  artifact: Exclude<CheckArtifact, { status: "fresh" }>,
): string {
  if (!hasStaleProvenance(artifact)) {
    return "";
  }

  const isSourcePathMismatch =
    artifact.reasons.includes("source-path-mismatch");

  return isSourcePathMismatch && hasEquivalentProvenanceSourcePaths(artifact)
    ? " Path differs only by separator style; rerun render with forward-slash paths."
    : "";
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

  return `${artifactIssuePrefix(artifact)}: ${artifact.path} for ${source.sourcePath}${reason}.${sourcePathMismatchHint(artifact)}${repairSentence(artifact, source.sourcePath)}`;
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
