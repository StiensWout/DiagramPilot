import type { DiagramSpec, DiagramSpecTopology } from "./diagramspec-topology.js";
import { createDiagramSpecTopology } from "./diagramspec-topology.js";
import type { DiagramSpecValidationError } from "./diagramspec-validation.js";
import { isRecord, isStableId } from "./diagramspec-validation-helpers.js";

function stableIdsFromCollection(collection: unknown): Set<string> {
  const ids = new Set<string>();

  if (!Array.isArray(collection)) {
    return ids;
  }

  for (const item of collection) {
    if (isRecord(item) && isStableId(item.id)) {
      ids.add(item.id);
    }
  }

  return ids;
}

function idsFromTopologyMap<T>(objectsById: ReadonlyMap<string, T>): Set<string> {
  return new Set(objectsById.keys());
}

function isTopologyCompatibleObjectCollection(collection: unknown): boolean {
  return (
    Array.isArray(collection) &&
    collection.every((item) => isRecord(item) && isStableId(item.id))
  );
}

function isTopologyCompatibleGroupCollection(collection: unknown): boolean {
  return (
    Array.isArray(collection) &&
    collection.every(
      (item) =>
        isRecord(item) &&
        isStableId(item.id) &&
        Array.isArray(item.contains) &&
        item.contains.every((containedId) => typeof containedId === "string"),
    )
  );
}

export function createDiagramSpecTopologyForValidation(
  value: Record<string, unknown>,
): DiagramSpecTopology | undefined {
  if (!isTopologyCompatibleObjectCollection(value.nodes)) {
    return undefined;
  }

  if (
    value.edges !== undefined &&
    !isTopologyCompatibleObjectCollection(value.edges)
  ) {
    return undefined;
  }

  if (
    value.groups !== undefined &&
    !isTopologyCompatibleGroupCollection(value.groups)
  ) {
    return undefined;
  }

  return createDiagramSpecTopology(value as unknown as DiagramSpec);
}

function nodeIdsExpected(nodeIds: ReadonlySet<string>): string {
  if (nodeIds.size === 0) {
    return "An existing node ID.";
  }

  return `One of: ${Array.from(nodeIds).join(", ")}.`;
}

function nodeOrGroupIdsExpected(
  nodeIds: ReadonlySet<string>,
  groupIds: ReadonlySet<string>,
): string {
  const ids = [...nodeIds, ...groupIds];

  if (ids.length === 0) {
    return "An existing node or group ID.";
  }

  return `One of: ${ids.join(", ")}.`;
}

function validateEdgeEndpoint(
  path: string,
  endpoint: unknown,
  nodeIds: ReadonlySet<string>,
  groupIds: ReadonlySet<string>,
  errors: DiagramSpecValidationError[],
): void {
  const expected = nodeIdsExpected(nodeIds);

  if (typeof endpoint !== "string") {
    errors.push({
      path,
      message: `${path} must reference a node ID.`,
      badValue: endpoint,
      expected,
      suggestion: `Change ${path} to an existing node ID.`,
    });
    return;
  }

  if (nodeIds.has(endpoint)) {
    return;
  }

  if (groupIds.has(endpoint)) {
    errors.push({
      path,
      message: `${path} references group "${endpoint}"; edges must reference node IDs.`,
      badValue: endpoint,
      expected,
      suggestion: `Change ${path} to an existing node ID instead of a group ID.`,
    });
    return;
  }

  errors.push({
    path,
    message: `${path} references unknown node "${endpoint}".`,
    badValue: endpoint,
    expected,
    suggestion: `Add a node with id "${endpoint}" or change ${path} to an existing node ID.`,
  });
}

export function validateEdgeEndpoints(
  value: Record<string, unknown>,
  topology: DiagramSpecTopology | undefined,
  errors: DiagramSpecValidationError[],
): void {
  const edges = value.edges;

  if (!Array.isArray(edges)) {
    return;
  }

  const nodeIds =
    topology === undefined
      ? stableIdsFromCollection(value.nodes)
      : idsFromTopologyMap(topology.nodesById);
  const groupIds =
    topology === undefined
      ? stableIdsFromCollection(value.groups)
      : idsFromTopologyMap(topology.groupsById);

  edges.forEach((edge, index) => {
    if (!isRecord(edge)) {
      return;
    }

    validateEdgeEndpoint(
      `edges[${index}].from`,
      edge.from,
      nodeIds,
      groupIds,
      errors,
    );
    validateEdgeEndpoint(
      `edges[${index}].to`,
      edge.to,
      nodeIds,
      groupIds,
      errors,
    );
  });
}

export function validateGroupContainmentReferences(
  value: Record<string, unknown>,
  topology: DiagramSpecTopology | undefined,
  errors: DiagramSpecValidationError[],
): void {
  const groups = value.groups;

  if (!Array.isArray(groups)) {
    return;
  }

  const nodeIds =
    topology === undefined
      ? stableIdsFromCollection(value.nodes)
      : idsFromTopologyMap(topology.nodesById);
  const edgeIds =
    topology === undefined
      ? stableIdsFromCollection(value.edges)
      : idsFromTopologyMap(topology.edgesById);
  const groupIds =
    topology === undefined
      ? stableIdsFromCollection(groups)
      : idsFromTopologyMap(topology.groupsById);
  const expected = nodeOrGroupIdsExpected(nodeIds, groupIds);

  if (topology !== undefined) {
    for (const reference of topology.containmentReferences) {
      const containedPath = `groups[${reference.parentGroupIndex}].contains[${reference.containedIndex}]`;

      if (
        reference.containedObjectType === "node" ||
        reference.containedObjectType === "group"
      ) {
        continue;
      }

      if (reference.containedObjectType === "edge") {
        errors.push({
          path: containedPath,
          message: `${containedPath} references edge "${reference.containedId}"; groups can contain nodes and groups only.`,
          badValue: reference.containedId,
          expected,
          suggestion: `Remove ${containedPath} or change it to an existing node or group ID.`,
        });
        continue;
      }

      errors.push({
        path: containedPath,
        message: `${containedPath} references unknown node or group "${reference.containedId}".`,
        badValue: reference.containedId,
        expected,
        suggestion: `Add a node or group with id "${reference.containedId}" or change ${containedPath} to an existing node or group ID.`,
      });
    }

    return;
  }

  groups.forEach((group, groupIndex) => {
    if (!isRecord(group)) {
      return;
    }

    const containsPath = `groups[${groupIndex}].contains`;

    if (!("contains" in group)) {
      errors.push({
        path: containsPath,
        message: `${containsPath} is required.`,
        badValue: group.contains,
        expected: "Array of node or group IDs.",
        suggestion: `Add contains to groups[${groupIndex}] with node or group IDs.`,
      });
      return;
    }

    if (!Array.isArray(group.contains)) {
      errors.push({
        path: containsPath,
        message: `${containsPath} must be an array of node or group IDs.`,
        badValue: group.contains,
        expected: "Array of node or group IDs.",
        suggestion: `Change ${containsPath} to a list of node or group IDs.`,
      });
      return;
    }

    group.contains.forEach((containedId, containedIndex) => {
      const containedPath = `${containsPath}[${containedIndex}]`;

      if (typeof containedId !== "string") {
        errors.push({
          path: containedPath,
          message: `${containedPath} must reference a node or group ID.`,
          badValue: containedId,
          expected,
          suggestion: `Change ${containedPath} to an existing node or group ID.`,
        });
        return;
      }

      if (nodeIds.has(containedId) || groupIds.has(containedId)) {
        return;
      }

      if (edgeIds.has(containedId)) {
        errors.push({
          path: containedPath,
          message: `${containedPath} references edge "${containedId}"; groups can contain nodes and groups only.`,
          badValue: containedId,
          expected,
          suggestion: `Remove ${containedPath} or change it to an existing node or group ID.`,
        });
        return;
      }

      errors.push({
        path: containedPath,
        message: `${containedPath} references unknown node or group "${containedId}".`,
        badValue: containedId,
        expected,
        suggestion: `Add a node or group with id "${containedId}" or change ${containedPath} to an existing node or group ID.`,
      });
    });
  });
}

interface GroupParent {
  id: string;
}

export function validateDuplicateGroupContainmentParentage(
  value: Record<string, unknown>,
  topology: DiagramSpecTopology | undefined,
  errors: DiagramSpecValidationError[],
): void {
  if (topology !== undefined) {
    const parentByContainedId = new Map<string, GroupParent>();

    for (const reference of topology.containmentReferences) {
      if (
        reference.containedObjectType !== "node" &&
        reference.containedObjectType !== "group"
      ) {
        continue;
      }

      const existingParent = parentByContainedId.get(reference.containedId);

      if (existingParent === undefined) {
        parentByContainedId.set(reference.containedId, {
          id: reference.parentGroupId,
        });
        continue;
      }

      const path = `groups[${reference.parentGroupIndex}].contains[${reference.containedIndex}]`;

      errors.push({
        path,
        message: `${path} contains "${reference.containedId}", which is already contained by group "${existingParent.id}".`,
        badValue: reference.containedId,
        expected:
          "Each contained node or group can have at most one parent group.",
        suggestion: `Remove ${path} or choose a single parent group for "${reference.containedId}".`,
      });
    }

    return;
  }

  const groups = value.groups;

  if (!Array.isArray(groups)) {
    return;
  }

  const nodeIds = stableIdsFromCollection(value.nodes);
  const groupIds = stableIdsFromCollection(groups);
  const parentByContainedId = new Map<string, GroupParent>();

  groups.forEach((group, groupIndex) => {
    if (!isRecord(group) || !Array.isArray(group.contains)) {
      return;
    }

    const groupId = group.id;

    if (!isStableId(groupId)) {
      return;
    }

    group.contains.forEach((containedId, containedIndex) => {
      if (
        typeof containedId !== "string" ||
        (!nodeIds.has(containedId) && !groupIds.has(containedId))
      ) {
        return;
      }

      const existingParent = parentByContainedId.get(containedId);

      if (existingParent === undefined) {
        parentByContainedId.set(containedId, {
          id: groupId,
        });
        return;
      }

      const path = `groups[${groupIndex}].contains[${containedIndex}]`;

      errors.push({
        path,
        message: `${path} contains "${containedId}", which is already contained by group "${existingParent.id}".`,
        badValue: containedId,
        expected:
          "Each contained node or group can have at most one parent group.",
        suggestion: `Remove ${path} or choose a single parent group for "${containedId}".`,
      });
    });
  });
}

interface GroupContainmentLink {
  childId: string;
  childIndex: number;
  parentIndex: number;
}

export function validateGroupContainmentCycles(
  value: Record<string, unknown>,
  topology: DiagramSpecTopology | undefined,
  errors: DiagramSpecValidationError[],
): void {
  const groups = value.groups;

  if (!Array.isArray(groups)) {
    return;
  }

  const groupIds =
    topology === undefined
      ? stableIdsFromCollection(groups)
      : idsFromTopologyMap(topology.groupsById);
  const linksByParentId = new Map<string, GroupContainmentLink[]>();

  if (topology !== undefined) {
    for (const reference of topology.containmentReferences) {
      if (reference.containedObjectType === "group") {
        const links =
          linksByParentId.get(reference.parentGroupId) ?? [];

        links.push({
          childId: reference.containedId,
          childIndex: reference.containedIndex,
          parentIndex: reference.parentGroupIndex,
        });

        linksByParentId.set(reference.parentGroupId, links);
      }
    }
  } else {
    groups.forEach((group, groupIndex) => {
      if (!isRecord(group) || !Array.isArray(group.contains)) {
        return;
      }

      const groupId = group.id;

      if (!isStableId(groupId)) {
        return;
      }

      const links: GroupContainmentLink[] = [];

      group.contains.forEach((containedId, containedIndex) => {
        if (typeof containedId === "string" && groupIds.has(containedId)) {
          links.push({
            childId: containedId,
            childIndex: containedIndex,
            parentIndex: groupIndex,
          });
        }
      });

      linksByParentId.set(groupId, links);
    });
  }

  const visited = new Set<string>();
  const visiting = new Set<string>();
  const stack: string[] = [];

  function visit(groupId: string): void {
    if (visited.has(groupId)) {
      return;
    }

    visiting.add(groupId);
    stack.push(groupId);

    for (const link of linksByParentId.get(groupId) ?? []) {
      const cycleStartIndex = stack.indexOf(link.childId);

      if (cycleStartIndex !== -1 && visiting.has(link.childId)) {
        const cyclePath = [...stack.slice(cycleStartIndex), link.childId];
        const path = `groups[${link.parentIndex}].contains[${link.childIndex}]`;

        errors.push({
          path,
          message: `${path} creates a group containment cycle: ${cyclePath.join(" -> ")}.`,
          badValue: link.childId,
          expected: "Acyclic group containment.",
          suggestion: "Remove one group containment reference from the cycle.",
        });
        continue;
      }

      visit(link.childId);
    }

    stack.pop();
    visiting.delete(groupId);
    visited.add(groupId);
  }

  for (const groupId of groupIds) {
    visit(groupId);
  }
}
