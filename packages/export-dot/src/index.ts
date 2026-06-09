import type {
  DiagramSpec,
  DiagramSpecDirection,
  DiagramSpecEdge,
  DiagramSpecGroup,
  DiagramSpecMetadata,
  DiagramSpecNode,
} from "@diagrampilot/core";
import {
  createDiagramSpecTopology,
  walkDiagramSpecTopology,
} from "@diagrampilot/core";

export const EXPORT_DOT_PACKAGE_NAME = "@diagrampilot/export-dot";

const dotRankDirections: Record<DiagramSpecDirection, string> = {
  right: "LR",
  left: "RL",
  down: "TB",
  up: "BT",
};

function dotRankDirection(direction: DiagramSpecDirection | undefined): string {
  return dotRankDirections[direction ?? "right"];
}

function escapeDotQuotedText(value: string): string {
  return value.replace(/"/g, '\\"').replace(/\r\n|\r|\n/g, "\\n");
}

function quoted(value: string): string {
  return `"${escapeDotQuotedText(value)}"`;
}

function indent(depth: number): string {
  return "  ".repeat(depth);
}

function attributeList(attributes: readonly string[]): string {
  if (attributes.length === 0) {
    return "";
  }

  return ` [${attributes.join(", ")}]`;
}

function metadataAttributes(
  metadata: DiagramSpecMetadata | undefined,
): string[] {
  const attributes: string[] = [];

  if (typeof metadata?.external_url === "string") {
    attributes.push(`URL=${quoted(metadata.external_url)}`);
  }

  if (typeof metadata?.source === "string") {
    attributes.push(`tooltip=${quoted(metadata.source)}`);
  }

  return attributes;
}

function labelAttributes(
  label: string,
  metadata: DiagramSpecMetadata | undefined,
): string[] {
  return [`label=${quoted(label)}`, ...metadataAttributes(metadata)];
}

function nodeDefinition(node: DiagramSpecNode): string {
  return `${quoted(node.id)}${attributeList(
    labelAttributes(node.label, node.metadata),
  )};`;
}

function groupDefinition(group: DiagramSpecGroup): string {
  return `subgraph ${quoted(`cluster_${group.id}`)} {`;
}

function edgeDefinition(edge: DiagramSpecEdge): string {
  const connection = `${quoted(edge.from)} -> ${quoted(edge.to)}`;
  const attributes =
    edge.label === undefined
      ? metadataAttributes(edge.metadata)
      : labelAttributes(edge.label, edge.metadata);

  if (edge.directed === false) {
    attributes.push("dir=none");
  }

  return `${connection}${attributeList(attributes)};`;
}

export function exportDiagramSpecToDot(spec: DiagramSpec): string {
  const lines = [
    `digraph ${quoted(spec.title)} {`,
    `${indent(1)}label=${quoted(spec.title)};`,
    `${indent(1)}labelloc=t;`,
    `${indent(1)}rankdir=${dotRankDirection(spec.direction)};`,
  ];
  const topology = createDiagramSpecTopology(spec);

  for (const attribute of metadataAttributes(spec.metadata)) {
    lines.push(`${indent(1)}${attribute};`);
  }

  function emitNode(node: DiagramSpecNode, depth: number): void {
    lines.push(`${indent(depth)}${nodeDefinition(node)}`);
  }

  function enterGroup(group: DiagramSpecGroup, depth: number): void {
    lines.push(`${indent(depth)}${groupDefinition(group)}`);
    lines.push(`${indent(depth + 1)}label=${quoted(group.label)};`);
    for (const attribute of metadataAttributes(group.metadata)) {
      lines.push(`${indent(depth + 1)}${attribute};`);
    }
  }

  function exitGroup(_group: DiagramSpecGroup, depth: number): void {
    lines.push(`${indent(depth)}}`);
  }

  walkDiagramSpecTopology(topology, {
    rootDepth: 1,
    node: emitNode,
    enterGroup,
    exitGroup,
  });

  for (const edge of spec.edges ?? []) {
    lines.push(`${indent(1)}${edgeDefinition(edge)}`);
  }

  lines.push("}");

  return `${lines.join("\n")}\n`;
}
