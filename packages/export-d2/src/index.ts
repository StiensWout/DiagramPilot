import type {
  DiagramSpec,
  DiagramSpecEdge,
  DiagramSpecGroup,
  DiagramSpecNode,
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

function containedParentIds(groups: readonly DiagramSpecGroup[]): Map<string, string> {
  const parentIds = new Map<string, string>();

  for (const group of groups) {
    for (const containedId of group.contains) {
      parentIds.set(containedId, group.id);
    }
  }

  return parentIds;
}

function d2PathsByNodeId(spec: DiagramSpec): Map<string, string> {
  const groups = spec.groups ?? [];
  const parentIds = containedParentIds(groups);
  const paths = new Map<string, string>();

  function pathForId(id: string): string {
    const parentId = parentIds.get(id);

    if (parentId === undefined) {
      return id;
    }

    return `${pathForId(parentId)}.${id}`;
  }

  for (const node of spec.nodes) {
    paths.set(node.id, pathForId(node.id));
  }

  return paths;
}

function edgeDefinition(
  edge: DiagramSpecEdge,
  nodePaths: ReadonlyMap<string, string>,
): string {
  const connector = edge.directed === false ? "--" : "->";
  const from = nodePaths.get(edge.from) ?? edge.from;
  const to = nodePaths.get(edge.to) ?? edge.to;
  const connection = `${from} ${connector} ${to}`;

  if (edge.label === undefined) {
    return connection;
  }

  return `${connection}: ${quoted(edge.label)}`;
}

export function exportDiagramSpecToD2(spec: DiagramSpec): string {
  const lines = [`direction: ${spec.direction ?? "right"}`, ""];
  const nodesById = new Map(spec.nodes.map((node) => [node.id, node]));
  const groups = spec.groups ?? [];
  const groupsById = new Map(groups.map((group) => [group.id, group]));
  const containedIds = new Set(groups.flatMap((group) => group.contains));
  const containedGroupIds = groupParentIds(groups);
  const emittedNodes = new Set<string>();
  const emittedGroups = new Set<string>();
  const nodePaths = d2PathsByNodeId(spec);

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
    lines.push(`${indent(depth)}${group.id}: {`);
    lines.push(`${indent(depth + 1)}label: ${quoted(group.label)}`);

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

    lines.push(`${indent(depth)}}`);
  }

  for (const node of spec.nodes) {
    if (!containedIds.has(node.id)) {
      emitNode(node, 0);
    }
  }

  for (const group of groups) {
    if (!containedGroupIds.has(group.id)) {
      emitGroup(group, 0);
    }
  }

  if ((spec.edges ?? []).length > 0) {
    lines.push("");
  }

  for (const edge of spec.edges ?? []) {
    lines.push(edgeDefinition(edge, nodePaths));
  }

  return `${lines.join("\n")}\n`;
}
