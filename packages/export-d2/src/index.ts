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
  RepoWorkflowOutputProfile,
} from "@diagrampilot/core";

export const EXPORT_D2_PACKAGE_NAME = "@diagrampilot/export-d2";

export interface ExportDiagramSpecToD2Options {
  profile?: RepoWorkflowOutputProfile;
}

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

function effectiveProfile(
  options: ExportDiagramSpecToD2Options,
): RepoWorkflowOutputProfile {
  return options.profile ?? "clean";
}

export function exportDiagramSpecToD2(
  spec: DiagramSpec,
  options: ExportDiagramSpecToD2Options = {},
): string {
  const profile = effectiveProfile(options);
  const topology = createDiagramSpecTopology(spec);
  const lines = [
    ...profileConfigLines(profile),
    ...directionLines(spec, profile),
    ...topologySectionLines(topology),
    ...edgeSectionLines(spec.edges ?? [], topology, profile),
  ];

  return `${lines.join("\n")}\n`;
}

function profileConfigLines(profile: RepoWorkflowOutputProfile): string[] {
  if (profile !== "presentation") return [];

  return [
    "vars: {",
    "  d2-config: {",
    "    theme-id: 4",
    "    sketch: true",
    "  }",
    "}",
    "",
  ];
}

function directionLines(
  spec: DiagramSpec,
  profile: RepoWorkflowOutputProfile,
): string[] {
  const lines = [`direction: ${spec.direction ?? "right"}`];

  if (profile !== "compact") lines.push("");

  return lines;
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
  profile: RepoWorkflowOutputProfile,
): string[] {
  if (edges.length === 0) {
    return [];
  }

  const lines = edges.map((edge) => edgeDefinition(edge, topology));

  return profile === "compact" ? lines : ["", ...lines];
}
