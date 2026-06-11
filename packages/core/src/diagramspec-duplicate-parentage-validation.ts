import type { DiagramSpecTopology } from "./diagramspec-topology.js";
import {
  forEachStableGroupWithContains,
  stableIdsFromCollection,
} from "./diagramspec-topology-validation-helpers.js";
import type { DiagramSpecValidationError } from "./diagramspec-validation.js";

type ContainmentReference = DiagramSpecTopology["containmentReferences"][number];
type ParentByContainedId = Map<string, { id: string }>;

function topologyContainmentReferencePath(reference: {
  parentGroupIndex: number;
  containedIndex: number;
}): string {
  return `groups[${reference.parentGroupIndex}].contains[${reference.containedIndex}]`;
}

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
