import { allowedDirections } from "./diagramspec-constants.js";

export type DiagramSpecDirection = (typeof allowedDirections)[number];

export interface DiagramSpecMetadata {
  [key: string]: unknown;
}

export interface DiagramSpecNode {
  id: string;
  label: string;
  kind?: string;
  description?: string;
  icon?: string;
  metadata?: DiagramSpecMetadata;
}

export interface DiagramSpecEdge {
  id: string;
  from: string;
  to: string;
  label?: string;
  kind?: string;
  description?: string;
  directed?: boolean;
  metadata?: DiagramSpecMetadata;
}

export interface DiagramSpecGroup {
  id: string;
  label: string;
  contains: string[];
  kind?: string;
  description?: string;
  icon?: string;
  metadata?: DiagramSpecMetadata;
}

export interface DiagramSpec {
  version: number;
  title: string;
  description?: string;
  direction?: DiagramSpecDirection;
  nodes: DiagramSpecNode[];
  edges?: DiagramSpecEdge[];
  groups?: DiagramSpecGroup[];
  metadata?: DiagramSpecMetadata;
}

interface DiagramSpecTopologyEntryBase {
  id: string;
  depth: number;
  path: readonly string[];
  parentGroupId?: string;
}

export interface DiagramSpecTopologyNodeEntry
  extends DiagramSpecTopologyEntryBase {
  objectType: "node";
  node: DiagramSpecNode;
}

export interface DiagramSpecTopologyGroupEntry
  extends DiagramSpecTopologyEntryBase {
  objectType: "group";
  group: DiagramSpecGroup;
}

export type DiagramSpecTopologyEntry =
  | DiagramSpecTopologyNodeEntry
  | DiagramSpecTopologyGroupEntry;

export type DiagramSpecTopologyObjectType =
  | "node"
  | "edge"
  | "group"
  | "unknown";

export interface DiagramSpecTopologyContainmentReference {
  parentGroupId: string;
  parentGroupIndex: number;
  containedId: string;
  containedIndex: number;
  containedObjectType: DiagramSpecTopologyObjectType;
}

export interface DiagramSpecTopology {
  nodesById: ReadonlyMap<string, DiagramSpecNode>;
  edgesById: ReadonlyMap<string, DiagramSpecEdge>;
  groupsById: ReadonlyMap<string, DiagramSpecGroup>;
  rootNodes: readonly DiagramSpecNode[];
  rootGroups: readonly DiagramSpecGroup[];
  parentGroupIdsByObjectId: ReadonlyMap<string, string>;
  containmentReferences: readonly DiagramSpecTopologyContainmentReference[];
  containedObjectsByGroupId: ReadonlyMap<
    string,
    readonly DiagramSpecTopologyEntry[]
  >;
  traversal: readonly DiagramSpecTopologyEntry[];
  nodePathsById: ReadonlyMap<string, readonly string[]>;
}

export interface DiagramSpecTopologyWalkHandlers {
  rootDepth?: number;
  node(node: DiagramSpecNode, depth: number): void;
  enterGroup(group: DiagramSpecGroup, depth: number): void;
  exitGroup(group: DiagramSpecGroup, depth: number): void;
}

export function walkDiagramSpecTopology(
  topology: DiagramSpecTopology,
  handlers: DiagramSpecTopologyWalkHandlers,
): void {
  const rootDepth = handlers.rootDepth ?? 0;

  function walkEntry(entry: DiagramSpecTopologyEntry, depth: number): void {
    if (entry.objectType === "node") {
      handlers.node(entry.node, depth);
      return;
    }

    walkGroup(entry.group, depth);
  }

  function walkGroup(group: DiagramSpecGroup, depth: number): void {
    handlers.enterGroup(group, depth);

    for (const entry of topology.containedObjectsByGroupId.get(group.id) ?? []) {
      walkEntry(entry, depth + 1);
    }

    handlers.exitGroup(group, depth);
  }

  for (const node of topology.rootNodes) {
    handlers.node(node, rootDepth);
  }

  for (const group of topology.rootGroups) {
    walkGroup(group, rootDepth);
  }
}

export function createDiagramSpecTopology(
  spec: DiagramSpec,
): DiagramSpecTopology {
  const nodesById = new Map(spec.nodes.map((node) => [node.id, node]));
  const edgesById = new Map((spec.edges ?? []).map((edge) => [edge.id, edge]));
  const groups = spec.groups ?? [];
  const groupsById = new Map(
    groups.map((group) => [group.id, group]),
  );
  const parentGroupIdsByObjectId = new Map<string, string>();
  const containmentReferences: DiagramSpecTopologyContainmentReference[] = [];
  const containedObjectsByGroupId = new Map<
    string,
    DiagramSpecTopologyEntry[]
  >();
  const nodePathsById = new Map<string, readonly string[]>();
  const traversal: DiagramSpecTopologyEntry[] = [];

  function getObjectType(id: string): DiagramSpecTopologyObjectType {
    if (nodesById.has(id)) {
      return "node";
    }

    if (groupsById.has(id)) {
      return "group";
    }

    if (edgesById.has(id)) {
      return "edge";
    }

    return "unknown";
  }

  groups.forEach((group, parentGroupIndex) => {
    group.contains.forEach((containedId, containedIndex) => {
      parentGroupIdsByObjectId.set(containedId, group.id);
      containmentReferences.push({
        parentGroupId: group.id,
        parentGroupIndex,
        containedId,
        containedIndex,
        containedObjectType: getObjectType(containedId),
      });
    });
  });

  function createNodeEntry(
    node: DiagramSpecNode,
    depth: number,
    path: readonly string[],
    parentGroupId?: string,
  ): DiagramSpecTopologyEntry {
    nodePathsById.set(node.id, path);

    return {
      objectType: "node",
      id: node.id,
      depth,
      path,
      parentGroupId,
      node,
    };
  }

  function createGroupEntry(
    group: DiagramSpecGroup,
    depth: number,
    path: readonly string[],
    parentGroupId?: string,
  ): DiagramSpecTopologyEntry {
    return {
      objectType: "group",
      id: group.id,
      depth,
      path,
      parentGroupId,
      group,
    };
  }

  function addContainedObjects(
    group: DiagramSpecGroup,
    depth: number,
    parentPath: readonly string[],
    activeGroupIds: ReadonlySet<string>,
  ): void {
    const entries: DiagramSpecTopologyEntry[] = [];

    for (const containedId of group.contains) {
      const path = [...parentPath, containedId];
      const childGroup = groupsById.get(containedId);

      if (childGroup !== undefined) {
        const entry = createGroupEntry(childGroup, depth, path, group.id);

        entries.push(entry);
        traversal.push(entry);
        if (!activeGroupIds.has(childGroup.id)) {
          addContainedObjects(
            childGroup,
            depth + 1,
            path,
            new Set([...activeGroupIds, childGroup.id]),
          );
        }
        continue;
      }

      const childNode = nodesById.get(containedId);

      if (childNode !== undefined) {
        const entry = createNodeEntry(childNode, depth, path, group.id);

        entries.push(entry);
        traversal.push(entry);
      }
    }

    containedObjectsByGroupId.set(group.id, entries);
  }

  const rootNodes = spec.nodes.filter(
    (node) => !parentGroupIdsByObjectId.has(node.id),
  );
  const rootGroups = groups.filter(
    (group) => !parentGroupIdsByObjectId.has(group.id),
  );

  for (const node of rootNodes) {
    const entry = createNodeEntry(node, 0, [node.id]);

    traversal.push(entry);
  }

  for (const group of rootGroups) {
    const path = [group.id];
    const entry = createGroupEntry(group, 0, path);

    traversal.push(entry);
    addContainedObjects(group, 1, path, new Set([group.id]));
  }

  return {
    nodesById,
    edgesById,
    groupsById,
    rootNodes,
    rootGroups,
    parentGroupIdsByObjectId,
    containmentReferences,
    containedObjectsByGroupId,
    traversal,
    nodePathsById,
  };
}
