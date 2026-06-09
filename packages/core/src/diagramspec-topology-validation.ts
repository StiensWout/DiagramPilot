import type { DiagramSpec, DiagramSpecTopology } from "./diagramspec-topology.js";
import { createDiagramSpecTopology } from "./diagramspec-topology.js";
import type { DiagramSpecValidationError } from "./diagramspec-validation.js";
import {
  forEachStableGroupWithContains,
  idsFromTopologyMap,
  stableIdsFromCollection,
} from "./diagramspec-topology-validation-helpers.js";
import { isRecord, isStableId } from "./diagramspec-validation-helpers.js";

export {
  validateGroupContainmentCycles,
} from "./diagramspec-group-containment-cycle-validation.js";

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
  if (nodeIds.size === 0) return "An existing node ID.";

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

  const context = containmentReferenceContext(value, groups, topology);

  if (topology !== undefined) {
    validateTopologyContainmentReferences(topology, context.expected, errors);
    return;
  }

  validateSourceContainmentReferences(
    groups,
    context.nodeIds,
    context.edgeIds,
    context.groupIds,
    context.expected,
    errors,
  );
}

function containmentReferenceContext(
  value: Record<string, unknown>,
  groups: readonly unknown[],
  topology: DiagramSpecTopology | undefined,
): {
  nodeIds: Set<string>;
  edgeIds: Set<string>;
  groupIds: Set<string>;
  expected: string;
} {
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

  return {
    nodeIds,
    edgeIds,
    groupIds,
    expected: nodeOrGroupIdsExpected(nodeIds, groupIds),
  };
}

function validateTopologyContainmentReferences(
  topology: DiagramSpecTopology,
  expected: string,
  errors: DiagramSpecValidationError[],
): void {
  for (const reference of topology.containmentReferences) {
    const containedPath = `groups[${reference.parentGroupIndex}].contains[${reference.containedIndex}]`;

    if (
      reference.containedObjectType === "node" ||
      reference.containedObjectType === "group"
    ) {
      continue;
    }

    errors.push(
      reference.containedObjectType === "edge"
        ? edgeContainmentReferenceError(containedPath, reference.containedId, expected)
        : unknownContainmentReferenceError(containedPath, reference.containedId, expected),
    );
  }
}

function validateSourceContainmentReferences(
  groups: readonly unknown[],
  nodeIds: ReadonlySet<string>,
  edgeIds: ReadonlySet<string>,
  groupIds: ReadonlySet<string>,
  expected: string,
  errors: DiagramSpecValidationError[],
): void {
  groups.forEach((group, groupIndex) => {
    if (!isRecord(group)) return;

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
      const error = sourceContainmentReferenceError({
        containedId,
        containedPath: `${containsPath}[${containedIndex}]`,
        nodeIds,
        edgeIds,
        groupIds,
        expected,
      });

      if (error !== undefined) errors.push(error);
    });
  });
}

function sourceContainmentReferenceError(options: {
  containedId: unknown;
  containedPath: string;
  nodeIds: ReadonlySet<string>;
  edgeIds: ReadonlySet<string>;
  groupIds: ReadonlySet<string>;
  expected: string;
}): DiagramSpecValidationError | undefined {
  if (typeof options.containedId !== "string") {
    return {
      path: options.containedPath,
      message: `${options.containedPath} must reference a node or group ID.`,
      badValue: options.containedId,
      expected: options.expected,
      suggestion: `Change ${options.containedPath} to an existing node or group ID.`,
    };
  }

  if (
    options.nodeIds.has(options.containedId) ||
    options.groupIds.has(options.containedId)
  ) {
    return undefined;
  }

  return options.edgeIds.has(options.containedId)
    ? edgeContainmentReferenceError(
        options.containedPath,
        options.containedId,
        options.expected,
      )
    : unknownContainmentReferenceError(
        options.containedPath,
        options.containedId,
        options.expected,
      );
}

function edgeContainmentReferenceError(
  containedPath: string,
  containedId: string,
  expected: string,
): DiagramSpecValidationError {
  return {
    path: containedPath,
    message: `${containedPath} references edge "${containedId}"; groups can contain nodes and groups only.`,
    badValue: containedId,
    expected,
    suggestion: `Remove ${containedPath} or change it to an existing node or group ID.`,
  };
}

function unknownContainmentReferenceError(
  containedPath: string,
  containedId: string,
  expected: string,
): DiagramSpecValidationError {
  return {
    path: containedPath,
    message: `${containedPath} references unknown node or group "${containedId}".`,
    badValue: containedId,
    expected,
    suggestion: `Add a node or group with id "${containedId}" or change ${containedPath} to an existing node or group ID.`,
  };
}

export function validateDuplicateGroupContainmentParentage(
  value: Record<string, unknown>,
  topology: DiagramSpecTopology | undefined,
  errors: DiagramSpecValidationError[],
): void {
  if (topology !== undefined) {
    const parentByContainedId = new Map<string, { id: string }>();

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
  const nodeIds = stableIdsFromCollection(value.nodes);
  const groupIds = stableIdsFromCollection(groups);
  const parentByContainedId = new Map<string, { id: string }>();

  forEachStableGroupWithContains(groups, (group, groupIndex, groupId) => {
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
