import type { DiagramSpecTopology } from "./diagramspec-topology.js";
import type { DiagramSpecValidationError } from "./diagramspec-validation.js";
import {
  forEachStableGroupWithContains,
  idsFromTopologyMap,
  stableIdsFromCollection,
} from "./diagramspec-topology-validation-helpers.js";

type GroupContainmentLink = { childId: string; childIndex: number; parentIndex: number };

function addGroupContainmentLink(
  linksByParentId: Map<string, GroupContainmentLink[]>,
  parentId: string,
  link: GroupContainmentLink,
): void {
  const links = linksByParentId.get(parentId) ?? [];
  links.push(link);
  linksByParentId.set(parentId, links);
}

function topologyGroupContainmentLinks(
  topology: DiagramSpecTopology,
): Map<string, GroupContainmentLink[]> {
  const linksByParentId = new Map<string, GroupContainmentLink[]>();

  for (const reference of topology.containmentReferences) {
    if (reference.containedObjectType !== "group") continue;

    addGroupContainmentLink(linksByParentId, reference.parentGroupId, {
      childId: reference.containedId,
      childIndex: reference.containedIndex,
      parentIndex: reference.parentGroupIndex,
    });
  }

  return linksByParentId;
}

function sourceGroupContainmentLinks(
  groups: readonly unknown[],
  groupIds: ReadonlySet<string>,
): Map<string, GroupContainmentLink[]> {
  const linksByParentId = new Map<string, GroupContainmentLink[]>();

  forEachStableGroupWithContains(groups, (group, groupIndex, groupId) => {
    const links: GroupContainmentLink[] = [];

    group.contains.forEach((containedId, containedIndex) => {
      if (typeof containedId !== "string" || !groupIds.has(containedId)) return;

      links.push({
        childId: containedId,
        childIndex: containedIndex,
        parentIndex: groupIndex,
      });
    });

    linksByParentId.set(groupId, links);
  });

  return linksByParentId;
}

function groupContainmentLinks(
  groups: readonly unknown[],
  groupIds: ReadonlySet<string>,
  topology: DiagramSpecTopology | undefined,
): Map<string, GroupContainmentLink[]> {
  return topology === undefined
    ? sourceGroupContainmentLinks(groups, groupIds)
    : topologyGroupContainmentLinks(topology);
}

function reportGroupContainmentCycle(options: {
  link: GroupContainmentLink;
  stack: readonly string[];
  cycleStartIndex: number;
  errors: DiagramSpecValidationError[];
}): void {
  const cyclePath = [
    ...options.stack.slice(options.cycleStartIndex),
    options.link.childId,
  ];
  const path = `groups[${options.link.parentIndex}].contains[${options.link.childIndex}]`;

  options.errors.push({
    path,
    message: `${path} creates a group containment cycle: ${cyclePath.join(" -> ")}.`,
    badValue: options.link.childId,
    expected: "Acyclic group containment.",
    suggestion: "Remove one group containment reference from the cycle.",
  });
}

function linksForGroup(
  linksByParentId: Map<string, GroupContainmentLink[]>,
  groupId: string,
): readonly GroupContainmentLink[] {
  return linksByParentId.get(groupId) ?? [];
}

function cycleStartIndexForLink(
  stack: readonly string[],
  visiting: ReadonlySet<string>,
  childId: string,
): number {
  const cycleStartIndex = stack.indexOf(childId);

  return cycleStartIndex !== -1 && visiting.has(childId)
    ? cycleStartIndex
    : -1;
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
  const linksByParentId = groupContainmentLinks(groups, groupIds, topology);

  const visited = new Set<string>();
  const visiting = new Set<string>();
  const stack: string[] = [];

  function visit(groupId: string): void {
    if (visited.has(groupId)) {
      return;
    }

    visiting.add(groupId);
    stack.push(groupId);

    for (const link of linksForGroup(linksByParentId, groupId)) {
      const cycleStartIndex = cycleStartIndexForLink(
        stack,
        visiting,
        link.childId,
      );

      if (cycleStartIndex !== -1) {
        reportGroupContainmentCycle({
          link,
          stack,
          cycleStartIndex,
          errors,
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
