import {
  createDiagramSpecTopology,
  walkDiagramSpecTopology,
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
  const lines = [`direction: ${spec.direction ?? "right"}`, ""];
  const topology = createDiagramSpecTopology(spec);

  function emitNode(node: DiagramSpecNode, depth: number): void {
    lines.push(`${indent(depth)}${nodeDefinition(node)}`);
  }

  function enterGroup(group: DiagramSpecGroup, depth: number): void {
    lines.push(`${indent(depth)}${group.id}: {`);
    lines.push(`${indent(depth + 1)}label: ${quoted(group.label)}`);
  }

  function exitGroup(_group: DiagramSpecGroup, depth: number): void {
    lines.push(`${indent(depth)}}`);
  }

  walkDiagramSpecTopology(topology, {
    node: emitNode,
    enterGroup,
    exitGroup,
  });

  if ((spec.edges ?? []).length > 0) {
    lines.push("");
  }

  for (const edge of spec.edges ?? []) {
    lines.push(edgeDefinition(edge, topology));
  }

  return `${lines.join("\n")}\n`;
}
