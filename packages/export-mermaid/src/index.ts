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

function groupParentIds(groups: readonly DiagramSpecGroup[]): Set<string> {
  const groupIds = new Set(groups.map((group) => group.id));
  const containedGroupIds = new Set<string>();

  for (const group of groups) {
    for (const containedId of group.contains) {
      if (groupIds.has(containedId)) {
        containedGroupIds.add(containedId);
      }
    }
  }

  return containedGroupIds;
}

export function exportDiagramSpecToMermaid(spec: DiagramSpec): string {
  const lines = [`flowchart ${mermaidDirection(spec.direction)}`];
  const nodesById = new Map(spec.nodes.map((node) => [node.id, node]));
  const groups = spec.groups ?? [];
  const groupsById = new Map(groups.map((group) => [group.id, group]));
  const containedIds = new Set(groups.flatMap((group) => group.contains));
  const containedGroupIds = groupParentIds(groups);
  const emittedNodes = new Set<string>();
  const emittedGroups = new Set<string>();

  function emitNode(node: DiagramSpecNode, depth: number): void {
    if (emittedNodes.has(node.id)) {
      return;
    }

    emittedNodes.add(node.id);
    lines.push(`${indent(depth)}${nodeDefinition(node)}`);
  }

  function emitGroup(group: DiagramSpecGroup, depth: number): void {
    if (emittedGroups.has(group.id)) {
      return;
    }

    emittedGroups.add(group.id);
    lines.push(`${indent(depth)}${groupDefinition(group)}`);

    for (const containedId of group.contains) {
      const childGroup = groupsById.get(containedId);

      if (childGroup !== undefined) {
        emitGroup(childGroup, depth + 1);
        continue;
      }

      const childNode = nodesById.get(containedId);

      if (childNode !== undefined) {
        emitNode(childNode, depth + 1);
      }
    }

    lines.push(`${indent(depth)}end`);
  }

  for (const node of spec.nodes) {
    if (!containedIds.has(node.id)) {
      emitNode(node, 1);
    }
  }

  for (const group of groups) {
    if (!containedGroupIds.has(group.id)) {
      emitGroup(group, 1);
    }
  }

  for (const edge of spec.edges ?? []) {
    lines.push(`${indent(1)}${edgeDefinition(edge)}`);
  }

  return `${lines.join("\n")}\n`;
}
