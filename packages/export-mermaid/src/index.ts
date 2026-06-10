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
} from "@diagrampilot/core";

export const EXPORT_MERMAID_PACKAGE_NAME = "@diagrampilot/export-mermaid";

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

function indent(depth: number): string {
  return "  ".repeat(depth);
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

function mermaidNodeLine(node: DiagramSpecNode, depth: number): string {
  return `${indent(depth)}${nodeDefinition(node)}`;
}

function mermaidGroupStart(group: DiagramSpecGroup, depth: number): string[] {
  return [`${indent(depth)}${groupDefinition(group)}`];
}

function mermaidGroupEnd(_group: DiagramSpecGroup, depth: number): string {
  return `${indent(depth)}end`;
}

export function exportDiagramSpecToMermaid(spec: DiagramSpec): string {
  const lines = [`flowchart ${mermaidDirection(spec.direction)}`];
  const topology = createDiagramSpecTopology(spec);
  lines.push(
    ...formatDiagramSpecTopologyLines(topology, {
      rootDepth: 1,
      node: mermaidNodeLine,
      enterGroup: mermaidGroupStart,
      exitGroup: mermaidGroupEnd,
    }),
  );

  for (const edge of spec.edges ?? []) {
    lines.push(`${indent(1)}${edgeDefinition(edge)}`);
  }

  return `${lines.join("\n")}\n`;
}
