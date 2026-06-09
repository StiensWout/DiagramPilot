import { stableIdPattern } from "./diagramspec-constants.js";

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isStableId(value: unknown): value is string {
  return typeof value === "string" && stableIdPattern.test(value);
}

export const diagramObjectCollectionNames = [
  "nodes",
  "edges",
  "groups",
] as const;

export type DiagramObjectCollectionName =
  (typeof diagramObjectCollectionNames)[number];

export function forEachCollectionItem<
  CollectionName extends DiagramObjectCollectionName,
>(
  value: Record<string, unknown>,
  collectionNames: readonly CollectionName[],
  visitor: (
    item: unknown,
    index: number,
    collectionName: CollectionName,
  ) => void,
): void {
  for (const collectionName of collectionNames) {
    const collection = value[collectionName];

    if (!Array.isArray(collection)) {
      continue;
    }

    collection.forEach((item, index) => {
      visitor(item, index, collectionName);
    });
  }
}

export function forEachCollectionRecord<
  CollectionName extends DiagramObjectCollectionName,
>(
  value: Record<string, unknown>,
  collectionNames: readonly CollectionName[],
  visitor: (
    item: Record<string, unknown>,
    index: number,
    collectionName: CollectionName,
  ) => void,
): void {
  forEachCollectionItem(value, collectionNames, (item, index, collectionName) => {
    if (!isRecord(item)) {
      return;
    }

    visitor(item, index, collectionName);
  });
}
