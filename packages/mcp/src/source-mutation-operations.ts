import type { DiagramSpec } from "@diagrampilot/core";

export type SourceMutationOperation = {
  type: string;
  [key: string]: unknown;
};

type DiagramSpecNode = DiagramSpec["nodes"][number];
type DiagramSpecEdge = NonNullable<DiagramSpec["edges"]>[number];
type DiagramSpecGroup = NonNullable<DiagramSpec["groups"]>[number];
type DiagramSpecObject = Record<string, unknown> & { id: string };
type MutationHandler = (
  spec: DiagramSpec,
  operation: SourceMutationOperation,
) => void;
type Placement = { id: string; offset: number };

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function operationArgument(
  args: Record<string, unknown>,
): SourceMutationOperation {
  const value = args.operation;
  if (isObjectRecord(value)) return value as SourceMutationOperation;
  throw new Error("Missing required MCP tool argument: operation");
}

function operationString(
  operation: SourceMutationOperation,
  name: string,
): string {
  const value = operation[name];
  if (typeof value === "string" && value.length > 0) return value;
  throw new Error(`Missing required MCP mutation operation field: ${name}`);
}

function optionalOperationString(
  operation: SourceMutationOperation,
  name: string,
): string | undefined {
  const value = operation[name];
  if (value === undefined) return undefined;
  if (typeof value === "string" && value.length > 0) return value;
  throw new Error(`Invalid MCP mutation operation field: ${name}`);
}

function operationRecord(
  operation: SourceMutationOperation,
  name: string,
): Record<string, unknown> {
  const value = operation[name];
  if (isObjectRecord(value)) return value;
  throw new Error(`Missing required MCP mutation operation field: ${name}`);
}

function optionalOperationStringArray(
  operation: SourceMutationOperation,
  name: string,
): string[] | undefined {
  const value = operation[name];
  if (value === undefined) return undefined;
  if (Array.isArray(value) && value.every((entry) => typeof entry === "string")) {
    return value;
  }

  throw new Error(`Invalid MCP mutation operation field: ${name}`);
}

function assignStringField(
  target: Record<string, unknown>,
  operation: SourceMutationOperation,
  name: string,
): void {
  if (Object.prototype.hasOwnProperty.call(operation, name)) {
    target[name] = operationString(operation, name);
  }
}

function stableIdIndex<T extends { id: string }>(
  items: readonly T[],
  id: string,
  collectionName: string,
): number {
  const index = items.findIndex((item) => item.id === id);
  if (index >= 0) return index;
  throw new Error(`Unknown ${collectionName} Stable ID: ${id}`);
}

function operationPlacement(operation: SourceMutationOperation): Placement | undefined {
  const beforeId = optionalOperationString(operation, "beforeId");
  const afterId = optionalOperationString(operation, "afterId");
  const placements = [
    beforeId === undefined ? undefined : { id: beforeId, offset: 0 },
    afterId === undefined ? undefined : { id: afterId, offset: 1 },
  ].filter((placement): placement is Placement => placement !== undefined);

  if (placements.length > 1) {
    throw new Error("Specify beforeId or afterId, not both.");
  }

  return placements[0];
}

function insertionIndex<T extends { id: string }>(
  items: readonly T[],
  operation: SourceMutationOperation,
  collectionName: string,
): number {
  const placement = operationPlacement(operation);
  if (placement === undefined) return items.length;
  return stableIdIndex(items, placement.id, collectionName) + placement.offset;
}

function itemCount(items: readonly unknown[] | undefined): number {
  return items === undefined ? 0 : items.length;
}

export function diagramSummary(spec: DiagramSpec): Record<string, unknown> {
  return {
    exists: true,
    valid: true,
    title: spec.title,
    nodeCount: spec.nodes.length,
    edgeCount: itemCount(spec.edges),
    groupCount: itemCount(spec.groups),
  };
}

function deleteEmptyTopLevelMetadata(spec: DiagramSpec): void {
  if (spec.metadata !== undefined && Object.keys(spec.metadata).length === 0) {
    delete spec.metadata;
  }
}

function deleteEmptyEdges(spec: DiagramSpec): void {
  if (spec.edges?.length === 0) delete spec.edges;
}

function deleteEmptyGroups(spec: DiagramSpec): void {
  if (spec.groups?.length === 0) delete spec.groups;
}

function metadataRecord(value: unknown): Record<string, unknown> | undefined {
  if (value === undefined) return undefined;
  if (isObjectRecord(value)) return value;
  throw new Error("DiagramSpec object metadata must be an object.");
}

function ensureObjectMetadata(object: Record<string, unknown>): Record<string, unknown> {
  const existingMetadata = metadataRecord(object.metadata);
  if (existingMetadata !== undefined) return existingMetadata;
  object.metadata = {};
  return object.metadata as Record<string, unknown>;
}

function deleteEmptyObjectMetadata(object: Record<string, unknown>): void {
  const metadata = metadataRecord(object.metadata);
  if (metadata !== undefined && Object.keys(metadata).length === 0) {
    delete object.metadata;
  }
}

function diagramObjectById(spec: DiagramSpec, id: string): Record<string, unknown> {
  const objects: DiagramSpecObject[] = [
    ...spec.nodes,
    ...(spec.groups ?? []),
    ...(spec.edges ?? []),
  ] as unknown as DiagramSpecObject[];
  const object = objects.find((candidate) => candidate.id === id);
  if (object !== undefined) return object;
  throw new Error(`Unknown DiagramSpec object Stable ID: ${id}`);
}

function setTitle(spec: DiagramSpec, operation: SourceMutationOperation): void {
  spec.title = operationString(operation, "title");
}

function setDescription(
  spec: DiagramSpec,
  operation: SourceMutationOperation,
): void {
  spec.description = operationString(operation, "description");
}

function setDirection(spec: DiagramSpec, operation: SourceMutationOperation): void {
  spec.direction = operationString(operation, "direction") as DiagramSpec["direction"];
}

function setMetadata(spec: DiagramSpec, operation: SourceMutationOperation): void {
  spec.metadata ??= {};
  spec.metadata[operationString(operation, "key")] = operation.value;
}

function deleteMetadata(spec: DiagramSpec, operation: SourceMutationOperation): void {
  if (spec.metadata === undefined) return;
  delete spec.metadata[operationString(operation, "key")];
  deleteEmptyTopLevelMetadata(spec);
}

function addNode(spec: DiagramSpec, operation: SourceMutationOperation): void {
  const node = operationRecord(operation, "node") as unknown as DiagramSpecNode;
  spec.nodes.splice(insertionIndex(spec.nodes, operation, "node"), 0, node);
}

function updateNode(spec: DiagramSpec, operation: SourceMutationOperation): void {
  const index = stableIdIndex(spec.nodes, operationString(operation, "id"), "node");
  const node = spec.nodes[index] as unknown as Record<string, unknown>;
  assignStringField(node, operation, "label");
  assignStringField(node, operation, "description");
  assignStringField(node, operation, "icon");
}

function removeNode(spec: DiagramSpec, operation: SourceMutationOperation): void {
  spec.nodes.splice(
    stableIdIndex(spec.nodes, operationString(operation, "id"), "node"),
    1,
  );
}

function addEdge(spec: DiagramSpec, operation: SourceMutationOperation): void {
  const edge = operationRecord(operation, "edge") as unknown as DiagramSpecEdge;
  spec.edges ??= [];
  spec.edges.splice(insertionIndex(spec.edges, operation, "edge"), 0, edge);
}

function updateEdge(spec: DiagramSpec, operation: SourceMutationOperation): void {
  const edges = spec.edges ?? [];
  const index = stableIdIndex(edges, operationString(operation, "id"), "edge");
  const edge = edges[index] as unknown as Record<string, unknown>;
  assignStringField(edge, operation, "from");
  assignStringField(edge, operation, "to");
  assignStringField(edge, operation, "label");
}

function removeEdge(spec: DiagramSpec, operation: SourceMutationOperation): void {
  const edges = spec.edges ?? [];
  edges.splice(stableIdIndex(edges, operationString(operation, "id"), "edge"), 1);
  deleteEmptyEdges(spec);
}

function addGroup(spec: DiagramSpec, operation: SourceMutationOperation): void {
  const group = operationRecord(operation, "group") as unknown as DiagramSpecGroup;
  spec.groups ??= [];
  spec.groups.splice(insertionIndex(spec.groups, operation, "group"), 0, group);
}

function updateGroup(spec: DiagramSpec, operation: SourceMutationOperation): void {
  const groups = spec.groups ?? [];
  const index = stableIdIndex(groups, operationString(operation, "id"), "group");
  const group = groups[index] as unknown as Record<string, unknown>;
  assignStringField(group, operation, "label");

  const contains = optionalOperationStringArray(operation, "contains");
  if (contains !== undefined) group.contains = contains;
}

function removeGroup(spec: DiagramSpec, operation: SourceMutationOperation): void {
  const groups = spec.groups ?? [];
  groups.splice(stableIdIndex(groups, operationString(operation, "id"), "group"), 1);
  deleteEmptyGroups(spec);
}

function setObjectMetadata(
  spec: DiagramSpec,
  operation: SourceMutationOperation,
): void {
  const object = diagramObjectById(spec, operationString(operation, "id"));
  const metadata = ensureObjectMetadata(object);
  metadata[operationString(operation, "key")] = operation.value;
}

function deleteObjectMetadata(
  spec: DiagramSpec,
  operation: SourceMutationOperation,
): void {
  const object = diagramObjectById(spec, operationString(operation, "id"));
  const metadata = metadataRecord(object.metadata);
  if (metadata === undefined) return;
  delete metadata[operationString(operation, "key")];
  deleteEmptyObjectMetadata(object);
}

const mutationHandlers: Record<string, MutationHandler> = {
  set_title: setTitle,
  set_description: setDescription,
  set_direction: setDirection,
  set_metadata: setMetadata,
  delete_metadata: deleteMetadata,
  add_node: addNode,
  update_node: updateNode,
  remove_node: removeNode,
  add_edge: addEdge,
  update_edge: updateEdge,
  remove_edge: removeEdge,
  add_group: addGroup,
  update_group: updateGroup,
  remove_group: removeGroup,
  set_object_metadata: setObjectMetadata,
  delete_object_metadata: deleteObjectMetadata,
};

export function applySourceMutation(
  spec: DiagramSpec,
  operation: SourceMutationOperation,
): string {
  const handler = mutationHandlers[operation.type];
  if (handler === undefined) {
    throw new Error(`Unsupported DiagramPilot source mutation: ${operation.type}`);
  }

  handler(spec, operation);
  return operation.type;
}
