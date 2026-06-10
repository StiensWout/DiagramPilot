import type {
  DiagramSpec,
  DiagramSpecTopology,
} from "./diagramspec-topology.js";
import { createDiagramSpecTopology } from "./diagramspec-topology.js";
import { isRecord, isStableId } from "./diagramspec-validation-helpers.js";

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

function isOptionalTopologyCompatibleObjectCollection(
  collection: unknown,
): boolean {
  return (
    collection === undefined ||
    isTopologyCompatibleObjectCollection(collection)
  );
}

function isOptionalTopologyCompatibleGroupCollection(
  collection: unknown,
): boolean {
  return (
    collection === undefined || isTopologyCompatibleGroupCollection(collection)
  );
}

function isTopologyCompatibleSpec(value: Record<string, unknown>): boolean {
  const checks = [
    isTopologyCompatibleObjectCollection(value.nodes),
    isOptionalTopologyCompatibleObjectCollection(value.edges),
    isOptionalTopologyCompatibleGroupCollection(value.groups),
  ];

  return checks.every(Boolean);
}

export function createDiagramSpecTopologyForValidation(
  value: Record<string, unknown>,
): DiagramSpecTopology | undefined {
  return isTopologyCompatibleSpec(value)
    ? createDiagramSpecTopology(value as unknown as DiagramSpec)
    : undefined;
}
