import { stableIdExpected, stableIdPattern } from "./diagramspec-constants.js";

interface StableIdValidationError {
  path: string;
  message: string;
  badValue?: unknown;
  expected: string;
  suggestion: string;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isStableId(value: unknown): value is string {
  return typeof value === "string" && stableIdPattern.test(value);
}

export function validateStableIdShape(
  path: string,
  value: unknown,
  errors: StableIdValidationError[],
): value is string {
  if (isStableId(value)) return true;

  errors.push({
    path,
    message: `${path} must match the stable ID pattern.`,
    badValue: value,
    expected: stableIdExpected,
    suggestion: `Change ${path} to lowercase snake case, such as api_gateway.`,
  });

  return false;
}

export const diagramObjectCollectionNames = ["nodes", "edges", "groups"] as const;

export function forEachCollectionItem<CollectionName extends string>(
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

export function forEachCollectionRecord<CollectionName extends string>(
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
