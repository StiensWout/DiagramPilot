import {
  createDiagramSpecTopology,
  formatDiagramSpecTopologyLines,
} from "@diagrampilot/core";
import type {
  DiagramSpec,
  DiagramSpecEdge,
  DiagramSpecGroup,
  DiagramSpecNode,
  DiagramSpecTopology,
} from "@diagrampilot/core";

export const EXPORT_D2_PACKAGE_NAME = "@diagrampilot/export-d2";

function escapeD2QuotedText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\r\n|\r|\n/g, "\\n");
}

function quoted(value: string): string {
  return `"${escapeD2QuotedText(value)}"`;
}

function indent(depth: number): string {
  return "  ".repeat(depth);
}

function nodeDefinition(node: DiagramSpecNode): string {
  return `${node.id}: ${quoted(node.label)}`;
}

function d2NodePath(
  topology: DiagramSpecTopology,
  nodeId: string,
): string {
  return topology.nodePathsById.get(nodeId)?.join(".") ?? nodeId;
}

function edgeDefinition(
  edge: DiagramSpecEdge,
  topology: DiagramSpecTopology,
): string {
  const connector = edge.directed === false ? "--" : "->";
  const from = d2NodePath(topology, edge.from);
  const to = d2NodePath(topology, edge.to);
  const connection = `${from} ${connector} ${to}`;

  if (edge.label === undefined) {
    return connection;
  }

  return `${connection}: ${quoted(edge.label)}`;
}

export function exportDiagramSpecToD2(spec: DiagramSpec): string {
  const topology = createDiagramSpecTopology(spec);
  const lines = [
    ...directionLines(spec),
    ...topologySectionLines(topology),
    ...edgeSectionLines(spec.edges ?? [], topology),
  ];

  return `${lines.join("\n")}\n`;
}

function directionLines(spec: DiagramSpec): string[] {
  return [`direction: ${spec.direction ?? "right"}`, ""];
}

function topologySectionLines(topology: DiagramSpecTopology): string[] {
  return formatDiagramSpecTopologyLines(topology, {
    node: (node, depth) => `${indent(depth)}${nodeDefinition(node)}`,
    enterGroup: (group, depth) => [
      `${indent(depth)}${group.id}: {`,
      `${indent(depth + 1)}label: ${quoted(group.label)}`,
    ],
    exitGroup: (_group, depth) => `${indent(depth)}}`,
  });
}

function edgeSectionLines(
  edges: readonly DiagramSpecEdge[],
  topology: DiagramSpecTopology,
): string[] {
  if (edges.length === 0) {
    return [];
  }

  return ["", ...edges.map((edge) => edgeDefinition(edge, topology))];
}
