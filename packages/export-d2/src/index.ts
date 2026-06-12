import {
  createDiagramSpecTopology,
  formatDiagramSpecTopologyLines,
  getDiagramSpecKnownEdgeKind,
} from "@diagrampilot/core";
import type {
  DiagramSpec,
  DiagramSpecEdge,
  DiagramSpecGroup,
  DiagramSpecKnownEdgeKind,
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

function edgeConnectionLine(
  edge: DiagramSpecEdge,
  topology: DiagramSpecTopology,
  profile: RepoWorkflowOutputProfile,
): string {
  const connector = edge.directed === false ? "--" : "->";
  const from = d2NodePath(topology, edge.from);
  const to = d2NodePath(topology, edge.to);
  const connection = `${from} ${connector} ${to}`;

  return edge.label === undefined || profile === "overview"
    ? connection
    : `${connection}: ${quoted(edge.label)}`;
}

function edgeKindStyleLines(kind: DiagramSpecKnownEdgeKind): string[] {
  const lines = [`style.stroke: ${quoted(kind.stroke)}`];

  if (kind.dash !== undefined) {
    lines.push(`style.stroke-dash: ${quoted(kind.dash)}`);
  }

  return lines;
}

function styledEdgeLine(
  line: string,
  kind: DiagramSpecKnownEdgeKind,
): string {
  return [
    `${line} {`,
    ...edgeKindStyleLines(kind).map((style) => `${indent(1)}${style}`),
    "}",
  ].join("\n");
}

function edgeDefinition(
  edge: DiagramSpecEdge,
  topology: DiagramSpecTopology,
  profile: RepoWorkflowOutputProfile,
): string {
  const line = edgeConnectionLine(edge, topology, profile);
  const knownKind = getDiagramSpecKnownEdgeKind(edge.kind);

  if (knownKind === undefined) return line;

  return styledEdgeLine(line, knownKind);
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

  const lines = edges.map((edge) => edgeDefinition(edge, topology, profile));

  return profile === "compact" ? lines : ["", ...lines];
}
