import { isRecord, isStableId } from "./diagramspec-validation-helpers.js";

export function stableIdsFromCollection(collection: unknown): Set<string> {
  if (!Array.isArray(collection)) {
    return new Set();
  }

  return new Set(collection.map(stableIdFromItem).filter(isDefinedString));
}

function stableIdFromItem(item: unknown): string | undefined {
  return isRecord(item) && isStableId(item.id) ? item.id : undefined;
}

function isDefinedString(value: string | undefined): value is string {
  return value !== undefined;
}

export function idsFromTopologyMap<T>(objectsById: ReadonlyMap<string, T>): Set<string> {
  return new Set(objectsById.keys());
}

export function forEachStableGroupWithContains(
  groups: unknown,
  visitor: (
    group: Record<string, unknown> & { contains: unknown[] },
    groupIndex: number,
    groupId: string,
  ) => void,
): void {
  if (!Array.isArray(groups)) return;

  groups.forEach((group, groupIndex) => {
    if (!isRecord(group) || !Array.isArray(group.contains)) {
      return;
    }

    const groupId = group.id;

    if (!isStableId(groupId)) return;

    visitor(
      group as Record<string, unknown> & { contains: unknown[] },
      groupIndex,
      groupId,
    );
  });
}
