import type { DiagramSpecTopology } from "./diagramspec-topology.js";
import type { DiagramSpecValidationError } from "./diagramspec-validation.js";
import {
  forEachStableGroupWithContains,
  idsFromTopologyMap,
  stableIdsFromCollection,
} from "./diagramspec-topology-validation-helpers.js";
import { isRecord } from "./diagramspec-validation-helpers.js";

export {
  validateGroupContainmentCycles,
} from "./diagramspec-group-containment-cycle-validation.js";
export {
  createDiagramSpecTopologyForValidation,
} from "./diagramspec-topology-for-validation.js";

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

function isValidTopologyContainmentObjectType(
  objectType: string,
): boolean {
  return objectType === "node" || objectType === "group";
}

function topologyContainmentReferencePath(reference: {
  parentGroupIndex: number;
  containedIndex: number;
}): string {
  return `groups[${reference.parentGroupIndex}].contains[${reference.containedIndex}]`;
}

function topologyContainmentReferenceError(
  containedPath: string,
  containedId: string,
  containedObjectType: string,
  expected: string,
): DiagramSpecValidationError {
  return containedObjectType === "edge"
    ? edgeContainmentReferenceError(containedPath, containedId, expected)
    : unknownContainmentReferenceError(containedPath, containedId, expected);
}

function validateTopologyContainmentReferences(
  topology: DiagramSpecTopology,
  expected: string,
  errors: DiagramSpecValidationError[],
): void {
  for (const reference of topology.containmentReferences) {
    if (isValidTopologyContainmentObjectType(reference.containedObjectType)) {
      continue;
    }

    errors.push(
      topologyContainmentReferenceError(
        topologyContainmentReferencePath(reference),
        reference.containedId,
        reference.containedObjectType,
        expected,
      ),
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
    return nonStringContainmentReferenceError(options);
  }

  const containedId = options.containedId;

  if (isKnownSourceContainmentReference({ ...options, containedId })) {
    return undefined;
  }

  return invalidSourceContainmentReferenceError({ ...options, containedId });
}

function nonStringContainmentReferenceError(options: {
  containedId: unknown;
  containedPath: string;
  expected: string;
}): DiagramSpecValidationError {
  return {
    path: options.containedPath,
    message: `${options.containedPath} must reference a node or group ID.`,
    badValue: options.containedId,
    expected: options.expected,
    suggestion: `Change ${options.containedPath} to an existing node or group ID.`,
  };
}

function isKnownSourceContainmentReference(options: {
  containedId: string;
  nodeIds: ReadonlySet<string>;
  groupIds: ReadonlySet<string>;
}): boolean {
  return (
    options.nodeIds.has(options.containedId) ||
    options.groupIds.has(options.containedId)
  );
}

function invalidSourceContainmentReferenceError(options: {
  containedId: string;
  containedPath: string;
  edgeIds: ReadonlySet<string>;
  expected: string;
}): DiagramSpecValidationError {
  if (options.edgeIds.has(options.containedId)) {
    return edgeContainmentReferenceError(
      options.containedPath,
      options.containedId,
      options.expected,
    );
  }

  return unknownContainmentReferenceError(
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

type ContainmentReference = DiagramSpecTopology["containmentReferences"][number];
type ParentByContainedId = Map<string, { id: string }>;

function isNodeOrGroupContainmentReference(
  reference: ContainmentReference,
): boolean {
  return (
    reference.containedObjectType === "node" ||
    reference.containedObjectType === "group"
  );
}

function duplicateParentageError(
  path: string,
  containedId: string,
  existingParentId: string,
): DiagramSpecValidationError {
  return {
    path,
    message: `${path} contains "${containedId}", which is already contained by group "${existingParentId}".`,
    badValue: containedId,
    expected:
      "Each contained node or group can have at most one parent group.",
    suggestion: `Remove ${path} or choose a single parent group for "${containedId}".`,
  };
}

function recordContainedParent(
  parentByContainedId: ParentByContainedId,
  containedId: string,
  parentGroupId: string,
  path: string,
  errors: DiagramSpecValidationError[],
): void {
  const existingParent = parentByContainedId.get(containedId);

  if (existingParent === undefined) {
    parentByContainedId.set(containedId, { id: parentGroupId });
    return;
  }

  errors.push(duplicateParentageError(path, containedId, existingParent.id));
}

function validateTopologyDuplicateParentage(
  topology: DiagramSpecTopology,
  errors: DiagramSpecValidationError[],
): void {
  const parentByContainedId: ParentByContainedId = new Map();

  for (const reference of topology.containmentReferences) {
    if (!isNodeOrGroupContainmentReference(reference)) {
      continue;
    }

    recordContainedParent(
      parentByContainedId,
      reference.containedId,
      reference.parentGroupId,
      topologyContainmentReferencePath(reference),
      errors,
    );
  }
}

function isKnownSourceContainedId(
  containedId: unknown,
  nodeIds: ReadonlySet<string>,
  groupIds: ReadonlySet<string>,
): containedId is string {
  return (
    typeof containedId === "string" &&
    (nodeIds.has(containedId) || groupIds.has(containedId))
  );
}

function validateSourceDuplicateParentage(
  value: Record<string, unknown>,
  errors: DiagramSpecValidationError[],
): void {
  const groups = value.groups;
  const nodeIds = stableIdsFromCollection(value.nodes);
  const groupIds = stableIdsFromCollection(groups);
  const parentByContainedId: ParentByContainedId = new Map();

  forEachStableGroupWithContains(groups, (group, groupIndex, groupId) => {
    group.contains.forEach((containedId, containedIndex) => {
      if (!isKnownSourceContainedId(containedId, nodeIds, groupIds)) {
        return;
      }

      recordContainedParent(
        parentByContainedId,
        containedId,
        groupId,
        `groups[${groupIndex}].contains[${containedIndex}]`,
        errors,
      );
    });
  });
}

export function validateDuplicateGroupContainmentParentage(
  value: Record<string, unknown>,
  topology: DiagramSpecTopology | undefined,
  errors: DiagramSpecValidationError[],
): void {
  if (topology !== undefined) {
    validateTopologyDuplicateParentage(topology, errors);
    return;
  }

  validateSourceDuplicateParentage(value, errors);
}
