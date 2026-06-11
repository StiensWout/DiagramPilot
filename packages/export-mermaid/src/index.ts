import {
  createDiagramSpecTopology,
  formatDiagramSpecTopologyLines,
} from "@diagrampilot/core";
import type {
  DiagramSpec,
  DiagramSpecDirection,
  DiagramSpecEdge,
  DiagramSpecGroup,
  DiagramSpecNode,
  RepoWorkflowOutputProfile,
} from "@diagrampilot/core";

export const EXPORT_MERMAID_PACKAGE_NAME = "@diagrampilot/export-mermaid";

export interface ExportDiagramSpecToMermaidOptions {
  profile?: RepoWorkflowOutputProfile;
}

const mermaidDirections: Record<DiagramSpecDirection, string> = {
  right: "LR",
  left: "RL",
  down: "TB",
  up: "BT",
};

function mermaidDirection(direction: DiagramSpecDirection | undefined): string {
  return mermaidDirections[direction ?? "right"];
}

function escapeMermaidQuotedText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\r\n|\r|\n/g, "<br/>");
}

function escapeMermaidEdgeLabel(value: string): string {
  return value.replace(/\|/g, "&#124;").replace(/\r\n|\r|\n/g, "<br/>");
}

function mermaidIndent(
  profile: RepoWorkflowOutputProfile,
  depth: number,
): string {
  if (profile === "compact") return "";

  return "  ".repeat(depth);
}

function mermaidProfileDepth(profile: RepoWorkflowOutputProfile): number {
  return profile === "compact" ? 0 : 1;
}

function nodeDefinition(node: DiagramSpecNode): string {
  return `${node.id}["${escapeMermaidQuotedText(node.label)}"]`;
}

function groupDefinition(group: DiagramSpecGroup): string {
  return `subgraph ${group.id}["${escapeMermaidQuotedText(group.label)}"]`;
}

function edgeDefinition(edge: DiagramSpecEdge): string {
  const connector = edge.directed === false ? "---" : "-->";

  if (edge.label === undefined) {
    return `${edge.from} ${connector} ${edge.to}`;
  }

  return `${edge.from} ${connector}|${escapeMermaidEdgeLabel(edge.label)}| ${edge.to}`;
}

function mermaidNodeLine(
  node: DiagramSpecNode,
  depth: number,
  profile: RepoWorkflowOutputProfile,
): string {
  return `${mermaidIndent(profile, depth)}${nodeDefinition(node)}`;
}

function mermaidGroupStart(
  group: DiagramSpecGroup,
  depth: number,
  profile: RepoWorkflowOutputProfile,
): string[] {
  return [`${mermaidIndent(profile, depth)}${groupDefinition(group)}`];
}

function mermaidGroupEnd(
  _group: DiagramSpecGroup,
  depth: number,
  profile: RepoWorkflowOutputProfile,
): string {
  return `${mermaidIndent(profile, depth)}end`;
}

function presentationLines(profile: RepoWorkflowOutputProfile): string[] {
  return profile === "presentation"
    ? ['%%{init: {"theme":"base"}}%%']
    : [];
}

export function exportDiagramSpecToMermaid(
  spec: DiagramSpec,
  options: ExportDiagramSpecToMermaidOptions = {},
): string {
  const profile = options.profile ?? "clean";
  const lines = [
    ...presentationLines(profile),
    `flowchart ${mermaidDirection(spec.direction)}`,
  ];
  const topology = createDiagramSpecTopology(spec);
  lines.push(
    ...formatDiagramSpecTopologyLines(topology, {
      rootDepth: mermaidProfileDepth(profile),
      node: (node, depth) => mermaidNodeLine(node, depth, profile),
      enterGroup: (group, depth) => mermaidGroupStart(group, depth, profile),
      exitGroup: (group, depth) => mermaidGroupEnd(group, depth, profile),
    }),
  );

  for (const edge of spec.edges ?? []) {
    const line = `${mermaidIndent(
      profile,
      mermaidProfileDepth(profile),
    )}${edgeDefinition(edge)}`;
    lines.push(line);
  }

  return `${lines.join("\n")}\n`;
}
