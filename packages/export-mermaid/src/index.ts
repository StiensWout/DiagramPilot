import { createDiagramSpecTopology } from "@diagrampilot/core";
import type {
  DiagramSpec,
  DiagramSpecDirection,
  DiagramSpecEdge,
  DiagramSpecGroup,
  DiagramSpecNode,
  DiagramSpecTopologyEntry,
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

export function exportDiagramSpecToMermaid(spec: DiagramSpec): string {
  const lines = [`flowchart ${mermaidDirection(spec.direction)}`];
  const topology = createDiagramSpecTopology(spec);

  function emitNode(node: DiagramSpecNode, depth: number): void {
    lines.push(`${indent(depth)}${nodeDefinition(node)}`);
  }

  function emitTopologyEntry(
    entry: DiagramSpecTopologyEntry,
    depth: number,
  ): void {
    if (entry.objectType === "node") {
      emitNode(entry.node, depth);
      return;
    }

    emitGroup(entry.group, depth);
  }

  function emitGroup(group: DiagramSpecGroup, depth: number): void {
    lines.push(`${indent(depth)}${groupDefinition(group)}`);

    for (const entry of topology.containedObjectsByGroupId.get(group.id) ?? []) {
      emitTopologyEntry(entry, depth + 1);
    }

    lines.push(`${indent(depth)}end`);
  }

  for (const node of topology.rootNodes) {
    emitNode(node, 1);
  }

  for (const group of topology.rootGroups) {
    emitGroup(group, 1);
  }

  for (const edge of spec.edges ?? []) {
    lines.push(`${indent(1)}${edgeDefinition(edge)}`);
  }

  return `${lines.join("\n")}\n`;
}
