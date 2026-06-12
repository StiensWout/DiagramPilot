import type {
  DiagramSpec,
  DiagramSpecDirection,
  DiagramSpecEdge,
  DiagramSpecGroup,
  DiagramSpecMetadata,
  DiagramSpecNode,
  RepoWorkflowOutputProfile,
} from "@diagrampilot/core";
import {
  createDiagramSpecTopology,
  formatDiagramSpecTopologyLines,
} from "@diagrampilot/core";

export const EXPORT_DOT_PACKAGE_NAME = "@diagrampilot/export-dot";

export interface ExportDiagramSpecToDotOptions {
  profile?: RepoWorkflowOutputProfile;
}

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

function effectiveProfile(
  options: ExportDiagramSpecToDotOptions,
): RepoWorkflowOutputProfile {
  return options.profile ?? "clean";
}

function indent(depth: number, profile: RepoWorkflowOutputProfile): string {
  return profile === "compact" ? "" : "  ".repeat(depth);
}

function profileDepth(profile: RepoWorkflowOutputProfile): number {
  return profile === "compact" ? 0 : 1;
}

function attributeList(attributes: readonly string[]): string {
  if (attributes.length === 0) {
    return "";
  }

  return ` [${attributes.join(", ")}]`;
}

type StringMetadataAttributeKey = "external_url" | "source";

const metadataAttributeDescriptors: readonly {
  key: StringMetadataAttributeKey;
  name: string;
}[] = [
  { key: "external_url", name: "URL" },
  { key: "source", name: "tooltip" },
];

function stringMetadataAttribute(
  metadata: DiagramSpecMetadata | undefined,
  key: StringMetadataAttributeKey,
): string | undefined {
  const value = metadata?.[key];
  return typeof value === "string" ? value : undefined;
}

function metadataAttributes(
  metadata: DiagramSpecMetadata | undefined,
): string[] {
  return metadataAttributeDescriptors.flatMap(({ key, name }) => {
    const value = stringMetadataAttribute(metadata, key);
    return value === undefined ? [] : [`${name}=${quoted(value)}`];
  });
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

function edgeDefinition(
  edge: DiagramSpecEdge,
  profile: RepoWorkflowOutputProfile,
): string {
  const connection = `${quoted(edge.from)} -> ${quoted(edge.to)}`;
  const attributes =
    edge.label === undefined || profile === "overview"
      ? metadataAttributes(edge.metadata)
      : labelAttributes(edge.label, edge.metadata);

  if (edge.directed === false) {
    attributes.push("dir=none");
  }

  return `${connection}${attributeList(attributes)};`;
}

function presentationAttributeLines(
  profile: RepoWorkflowOutputProfile,
): string[] {
  if (profile !== "presentation") return [];

  const nodeAttributes = [
    "shape=box",
    'style="rounded,filled"',
    'fillcolor="#F8FAFC"',
    'color="#475569"',
    'fontname="Inter"',
  ];

  return [
    'graph [bgcolor="transparent", pad="0.35"];',
    `node [${nodeAttributes.join(", ")}];`,
    'edge [color="#475569", fontname="Inter"];',
  ];
}

export function exportDiagramSpecToDot(
  spec: DiagramSpec,
  options: ExportDiagramSpecToDotOptions = {},
): string {
  const profile = effectiveProfile(options);
  const lines = [
    `digraph ${quoted(spec.title)} {`,
    `${indent(1, profile)}label=${quoted(spec.title)};`,
    `${indent(1, profile)}labelloc=t;`,
    `${indent(1, profile)}rankdir=${dotRankDirection(spec.direction)};`,
    ...presentationAttributeLines(profile).map(
      (line) => `${indent(1, profile)}${line}`,
    ),
  ];
  const topology = createDiagramSpecTopology(spec);

  for (const attribute of metadataAttributes(spec.metadata)) {
    lines.push(`${indent(1, profile)}${attribute};`);
  }

  lines.push(
    ...formatDiagramSpecTopologyLines(topology, {
      rootDepth: profileDepth(profile),
      node: (node, depth) => `${indent(depth, profile)}${nodeDefinition(node)}`,
      enterGroup: (group, depth) => [
        `${indent(depth, profile)}${groupDefinition(group)}`,
        `${indent(depth + 1, profile)}label=${quoted(group.label)};`,
        ...metadataAttributes(group.metadata).map(
          (attribute) => `${indent(depth + 1, profile)}${attribute};`,
        ),
      ],
      exitGroup: (_group, depth) => `${indent(depth, profile)}}`,
    }),
  );

  lines.push(
    ...(spec.edges ?? []).map(
      (edge) =>
        `${indent(profileDepth(profile), profile)}${edgeDefinition(edge, profile)}`,
    ),
  );

  lines.push("}");

  return `${lines.join("\n")}\n`;
}
