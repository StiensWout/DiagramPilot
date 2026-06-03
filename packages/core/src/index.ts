import { readFileSync } from "node:fs";

import {
  isPackagedLucideIconName,
  LUCIDE_ICON_NAMESPACE,
} from "@diagrampilot/icons";
import { LineCounter, parseDocument } from "yaml";
import type { YAMLError } from "yaml";

export const DIAGRAMPILOT_VERSION = "0.1.0";

const allowedDirections = ["right", "left", "down", "up"] as const;
const allowedDirectionList = allowedDirections.join(", ");
const stableIdPattern = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/;
const stableIdExpected = "^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$";
const urlSchemePattern = /^[a-z][a-z0-9+.-]*:/i;
const sourceReferenceExpected =
  "Local repository path or path-like glob, such as src/gateway or packages/*/src/**/*.ts.";
const externalReferenceExpected =
  "External HTTP(S) URL, such as https://example.com/context.";
const iconReferenceExpected =
  "Namespaced icon reference, such as lucide:database.";

export function getDiagramPilotVersion(): string {
  return DIAGRAMPILOT_VERSION;
}

export type DiagramSpecDirection = (typeof allowedDirections)[number];

export interface DiagramSpecMetadata {
  [key: string]: unknown;
}

export interface DiagramSpecNode {
  id: string;
  label: string;
  kind?: string;
  description?: string;
  icon?: string;
  metadata?: DiagramSpecMetadata;
}

export interface DiagramSpecEdge {
  id: string;
  from: string;
  to: string;
  label?: string;
  kind?: string;
  description?: string;
  directed?: boolean;
  metadata?: DiagramSpecMetadata;
}

export interface DiagramSpecGroup {
  id: string;
  label: string;
  contains: string[];
  kind?: string;
  description?: string;
  icon?: string;
  metadata?: DiagramSpecMetadata;
}

export interface DiagramSpec {
  version: number;
  title: string;
  description?: string;
  direction?: DiagramSpecDirection;
  nodes: DiagramSpecNode[];
  edges?: DiagramSpecEdge[];
  groups?: DiagramSpecGroup[];
  metadata?: DiagramSpecMetadata;
}

interface DiagramSpecTopologyEntryBase {
  id: string;
  depth: number;
  path: readonly string[];
  parentGroupId?: string;
}

export interface DiagramSpecTopologyNodeEntry
  extends DiagramSpecTopologyEntryBase {
  objectType: "node";
  node: DiagramSpecNode;
}

export interface DiagramSpecTopologyGroupEntry
  extends DiagramSpecTopologyEntryBase {
  objectType: "group";
  group: DiagramSpecGroup;
}

export type DiagramSpecTopologyEntry =
  | DiagramSpecTopologyNodeEntry
  | DiagramSpecTopologyGroupEntry;

export type DiagramSpecTopologyObjectType =
  | "node"
  | "edge"
  | "group"
  | "unknown";

export interface DiagramSpecTopologyContainmentReference {
  parentGroupId: string;
  parentGroupIndex: number;
  containedId: string;
  containedIndex: number;
  containedObjectType: DiagramSpecTopologyObjectType;
}

export interface DiagramSpecTopology {
  nodesById: ReadonlyMap<string, DiagramSpecNode>;
  edgesById: ReadonlyMap<string, DiagramSpecEdge>;
  groupsById: ReadonlyMap<string, DiagramSpecGroup>;
  rootNodes: readonly DiagramSpecNode[];
  rootGroups: readonly DiagramSpecGroup[];
  parentGroupIdsByObjectId: ReadonlyMap<string, string>;
  containmentReferences: readonly DiagramSpecTopologyContainmentReference[];
  containedObjectsByGroupId: ReadonlyMap<
    string,
    readonly DiagramSpecTopologyEntry[]
  >;
  traversal: readonly DiagramSpecTopologyEntry[];
  nodePathsById: ReadonlyMap<string, readonly string[]>;
}

export function createDiagramSpecTopology(
  spec: DiagramSpec,
): DiagramSpecTopology {
  const nodesById = new Map(spec.nodes.map((node) => [node.id, node]));
  const edgesById = new Map((spec.edges ?? []).map((edge) => [edge.id, edge]));
  const groups = spec.groups ?? [];
  const groupsById = new Map(
    groups.map((group) => [group.id, group]),
  );
  const parentGroupIdsByObjectId = new Map<string, string>();
  const containmentReferences: DiagramSpecTopologyContainmentReference[] = [];
  const containedObjectsByGroupId = new Map<
    string,
    DiagramSpecTopologyEntry[]
  >();
  const nodePathsById = new Map<string, readonly string[]>();
  const traversal: DiagramSpecTopologyEntry[] = [];

  function getObjectType(id: string): DiagramSpecTopologyObjectType {
    if (nodesById.has(id)) {
      return "node";
    }

    if (groupsById.has(id)) {
      return "group";
    }

    if (edgesById.has(id)) {
      return "edge";
    }

    return "unknown";
  }

  groups.forEach((group, parentGroupIndex) => {
    group.contains.forEach((containedId, containedIndex) => {
      parentGroupIdsByObjectId.set(containedId, group.id);
      containmentReferences.push({
        parentGroupId: group.id,
        parentGroupIndex,
        containedId,
        containedIndex,
        containedObjectType: getObjectType(containedId),
      });
    });
  });

  function createNodeEntry(
    node: DiagramSpecNode,
    depth: number,
    path: readonly string[],
    parentGroupId?: string,
  ): DiagramSpecTopologyEntry {
    nodePathsById.set(node.id, path);

    return {
      objectType: "node",
      id: node.id,
      depth,
      path,
      parentGroupId,
      node,
    };
  }

  function createGroupEntry(
    group: DiagramSpecGroup,
    depth: number,
    path: readonly string[],
    parentGroupId?: string,
  ): DiagramSpecTopologyEntry {
    return {
      objectType: "group",
      id: group.id,
      depth,
      path,
      parentGroupId,
      group,
    };
  }

  function addContainedObjects(
    group: DiagramSpecGroup,
    depth: number,
    parentPath: readonly string[],
    activeGroupIds: ReadonlySet<string>,
  ): void {
    const entries: DiagramSpecTopologyEntry[] = [];

    for (const containedId of group.contains) {
      const path = [...parentPath, containedId];
      const childGroup = groupsById.get(containedId);

      if (childGroup !== undefined) {
        const entry = createGroupEntry(childGroup, depth, path, group.id);

        entries.push(entry);
        traversal.push(entry);
        if (!activeGroupIds.has(childGroup.id)) {
          addContainedObjects(
            childGroup,
            depth + 1,
            path,
            new Set([...activeGroupIds, childGroup.id]),
          );
        }
        continue;
      }

      const childNode = nodesById.get(containedId);

      if (childNode !== undefined) {
        const entry = createNodeEntry(childNode, depth, path, group.id);

        entries.push(entry);
        traversal.push(entry);
      }
    }

    containedObjectsByGroupId.set(group.id, entries);
  }

  const rootNodes = spec.nodes.filter(
    (node) => !parentGroupIdsByObjectId.has(node.id),
  );
  const rootGroups = groups.filter(
    (group) => !parentGroupIdsByObjectId.has(group.id),
  );

  for (const node of rootNodes) {
    const entry = createNodeEntry(node, 0, [node.id]);

    traversal.push(entry);
  }

  for (const group of rootGroups) {
    const path = [group.id];
    const entry = createGroupEntry(group, 0, path);

    traversal.push(entry);
    addContainedObjects(group, 1, path, new Set([group.id]));
  }

  return {
    nodesById,
    edgesById,
    groupsById,
    rootNodes,
    rootGroups,
    parentGroupIdsByObjectId,
    containmentReferences,
    containedObjectsByGroupId,
    traversal,
    nodePathsById,
  };
}

export type DiagramPilotSourceFormat = "yaml" | "json";

export interface DiagramPilotSourceFile {
  format: DiagramPilotSourceFormat;
  path: string;
  value: unknown;
}

export interface RepairableDiagnostic {
  path: string;
  message: string;
  badValue?: unknown;
  expected: string;
  suggestion: string;
}

export interface DiagramSpecValidationError extends RepairableDiagnostic {}

export interface RepairableDiagnosticReport {
  file: string;
  errors: RepairableDiagnostic[];
  text: string;
}

export type DiagramSpecValidationResult =
  | {
      ok: true;
      errors: [];
    }
  | {
      ok: false;
      errors: DiagramSpecValidationError[];
    };

export interface SourceParseFailure {
  kind: "parse";
  format: DiagramPilotSourceFormat;
  path: string;
  message: string;
  line?: number;
  column?: number;
}

export interface SourceReadFailure {
  kind: "read";
  path: string;
  message: string;
}

export type SourceLoadFailure = SourceParseFailure | SourceReadFailure;

export type SourceLoadResult =
  | {
      ok: true;
      source: DiagramPilotSourceFile;
    }
  | {
      ok: false;
      failure: SourceLoadFailure;
    };

export type ValidatedDiagramSpecLoadFailure =
  | SourceLoadFailure
  | {
      kind: "validation";
      source: DiagramPilotSourceFile;
      errors: DiagramSpecValidationError[];
    };

export type ValidatedDiagramSpecLoadResult =
  | {
      ok: true;
      source: DiagramPilotSourceFile;
      spec: DiagramSpec;
    }
  | {
      ok: false;
      failure: ValidatedDiagramSpecLoadFailure;
    };

function formatSourceFailure(failure: SourceLoadFailure): string {
  if (failure.kind === "read") {
    return `Unable to read ${failure.path}: ${failure.message}`;
  }

  const location =
    failure.line === undefined || failure.column === undefined
      ? ""
      : ` at line ${failure.line}, column ${failure.column}`;
  const formatLabel = failure.format.toUpperCase();

  return `${formatLabel} parse error in ${failure.path}${location}: ${failure.message}`;
}

function sourceFailureToRepairableDiagnostic(
  failure: SourceLoadFailure,
): RepairableDiagnostic {
  if (failure.kind === "read") {
    return {
      path: "$",
      message: `Unable to read ${failure.path}: ${failure.message}`,
      expected: "Readable DiagramPilot Source File.",
      suggestion: "Check that the source path exists and is readable.",
    };
  }

  const location =
    failure.line === undefined || failure.column === undefined
      ? ""
      : ` at line ${failure.line}, column ${failure.column}`;
  const formatLabel = failure.format.toUpperCase();

  return {
    path: "$",
    message: `${formatLabel} parse error${location}: ${failure.message}`,
    expected: `Valid ${formatLabel} DiagramPilot Source File syntax.`,
    suggestion: `Fix the ${failure.format.toUpperCase()} syntax before semantic validation.`,
  };
}

function hasBadValue(
  error: RepairableDiagnostic,
): error is RepairableDiagnostic & { badValue: unknown } {
  return Object.prototype.hasOwnProperty.call(error, "badValue");
}

function formatBadValue(value: unknown): string {
  if (value === undefined) {
    return "<missing>";
  }

  const formatted = JSON.stringify(value);

  return formatted === undefined ? String(value) : formatted;
}

function formatRepairableDiagnostic(
  filePath: string,
  error: RepairableDiagnostic,
): string {
  const lines = [
    `DiagramSpec validation error in ${filePath}: ${error.message}`,
    `  Path: ${error.path}`,
    `  Problem: ${error.message}`,
  ];

  if (hasBadValue(error)) {
    lines.push(`  Bad value: ${formatBadValue(error.badValue)}`);
  }

  lines.push(`  Expected: ${error.expected}`);
  lines.push(`  Suggestion: ${error.suggestion}`);

  return lines.join("\n");
}

export function createRepairableDiagnosticReport(
  failure: ValidatedDiagramSpecLoadFailure,
): RepairableDiagnosticReport {
  if (failure.kind !== "validation") {
    return {
      file: failure.path,
      errors: [sourceFailureToRepairableDiagnostic(failure)],
      text: formatSourceFailure(failure),
    };
  }

  return {
    file: failure.source.path,
    errors: failure.errors,
    text: failure.errors
      .map((error) => formatRepairableDiagnostic(failure.source.path, error))
      .join("\n"),
  };
}

function firstLinePosition(error: YAMLError): { line?: number; column?: number } {
  const [linePosition] = error.linePos ?? [];

  return {
    line: linePosition?.line,
    column: linePosition?.col,
  };
}

function parseYamlSource(path: string, content: string): SourceLoadResult {
  const lineCounter = new LineCounter();
  const document = parseDocument(content, {
    lineCounter,
    prettyErrors: false,
  });
  const [firstError] = document.errors;

  if (firstError !== undefined) {
    const { line, column } = firstLinePosition(firstError);

    return {
      ok: false,
      failure: {
        kind: "parse",
        format: "yaml",
        path,
        message: firstError.message,
        line,
        column,
      },
    };
  }

  return {
    ok: true,
    source: {
      format: "yaml",
      path,
      value: document.toJS(),
    },
  };
}

function jsonErrorPosition(message: string): { line?: number; column?: number } {
  const match = /\(line (?<line>\d+) column (?<column>\d+)\)$/.exec(message);

  if (match?.groups === undefined) {
    return {};
  }

  return {
    line: Number(match.groups.line),
    column: Number(match.groups.column),
  };
}

function parseJsonSource(path: string, content: string): SourceLoadResult {
  try {
    return {
      ok: true,
      source: {
        format: "json",
        path,
        value: JSON.parse(content),
      },
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to parse JSON.";
    const { line, column } = jsonErrorPosition(message);

    return {
      ok: false,
      failure: {
        kind: "parse",
        format: "json",
        path,
        message,
        line,
        column,
      },
    };
  }
}

export function loadDiagramPilotSourceFile(path: string): SourceLoadResult {
  let content: string;

  try {
    content = readFileSync(path, "utf8");
  } catch (error) {
    return {
      ok: false,
      failure: {
        kind: "read",
        path,
        message: error instanceof Error ? error.message : "Unable to read file.",
      },
    };
  }

  if (path.toLowerCase().endsWith(".json")) {
    return parseJsonSource(path, content);
  }

  return parseYamlSource(path, content);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateTopLevelCollectionShapes(
  value: Record<string, unknown>,
  errors: DiagramSpecValidationError[],
): void {
  if ("nodes" in value && !Array.isArray(value.nodes)) {
    errors.push({
      path: "nodes",
      message: "nodes must be an array of node objects.",
      badValue: value.nodes,
      expected: "Array of node objects with at least one node.",
      suggestion: "Change nodes to a list of node objects.",
    });
  }

  if ("edges" in value && !Array.isArray(value.edges)) {
    errors.push({
      path: "edges",
      message: "edges must be an array of edge objects when present.",
      badValue: value.edges,
      expected: "Array of edge objects.",
      suggestion: "Change edges to a list of edge objects or omit edges.",
    });
  }

  if ("groups" in value && !Array.isArray(value.groups)) {
    errors.push({
      path: "groups",
      message: "groups must be an array of group objects when present.",
      badValue: value.groups,
      expected: "Array of group objects.",
      suggestion: "Change groups to a list of group objects or omit groups.",
    });
  }
}

function validateDiagramObjectShapes(
  value: Record<string, unknown>,
  errors: DiagramSpecValidationError[],
): void {
  const collectionLabels = {
    nodes: "node",
    edges: "edge",
    groups: "group",
  } as const;

  for (const collectionName of ["nodes", "edges", "groups"] as const) {
    const collection = value[collectionName];

    if (!Array.isArray(collection)) {
      continue;
    }

    collection.forEach((item, index) => {
      if (isRecord(item)) {
        return;
      }

      const objectLabel = collectionLabels[collectionName];

      errors.push({
        path: `${collectionName}[${index}]`,
        message: `${collectionName}[${index}] must be a ${objectLabel} object.`,
        badValue: item,
        expected: `${objectLabel[0].toUpperCase()}${objectLabel.slice(1)} object.`,
        suggestion: `Change ${collectionName}[${index}] to a ${objectLabel} object with a stable id.`,
      });
    });
  }
}

function isAllowedDirection(value: unknown): boolean {
  return allowedDirections.some((direction) => direction === value);
}

function isStableId(value: unknown): value is string {
  return typeof value === "string" && stableIdPattern.test(value);
}

function validateStableIdShape(
  path: string,
  value: unknown,
  errors: DiagramSpecValidationError[],
): value is string {
  if (isStableId(value)) {
    return true;
  }

  errors.push({
    path,
    message: `${path} must match the stable ID pattern.`,
    badValue: value,
    expected: stableIdExpected,
    suggestion: `Change ${path} to lowercase snake case, such as api_gateway.`,
  });

  return false;
}

function validateGlobalStableIdUniqueness(
  path: string,
  id: string,
  seenIds: Map<string, string>,
  errors: DiagramSpecValidationError[],
): void {
  const originalPath = seenIds.get(id);

  if (originalPath === undefined) {
    seenIds.set(id, path);
    return;
  }

  errors.push({
    path,
    message: `${path} duplicates ${originalPath} "${id}".`,
    badValue: id,
    expected: "One globally unique stable ID across nodes, edges, and groups.",
    suggestion: "Assign a unique stable ID across nodes, edges, and groups.",
  });
}

function validateDiagramObjectIds(
  value: Record<string, unknown>,
  errors: DiagramSpecValidationError[],
): void {
  const seenIds = new Map<string, string>();

  for (const collectionName of ["nodes", "edges", "groups"] as const) {
    const collection = value[collectionName];

    if (!Array.isArray(collection)) {
      continue;
    }

    collection.forEach((item, index) => {
      if (!isRecord(item)) {
        return;
      }

      const idPath = `${collectionName}[${index}].id`;
      const id = item.id;

      if (validateStableIdShape(idPath, id, errors)) {
        validateGlobalStableIdUniqueness(idPath, id, seenIds, errors);
      }
    });
  }
}

function validateDiagramObjectKinds(
  value: Record<string, unknown>,
  errors: DiagramSpecValidationError[],
): void {
  for (const collectionName of ["nodes", "edges", "groups"] as const) {
    const collection = value[collectionName];

    if (!Array.isArray(collection)) {
      continue;
    }

    collection.forEach((item, index) => {
      if (!isRecord(item) || !("kind" in item)) {
        return;
      }

      validateStableIdShape(
        `${collectionName}[${index}].kind`,
        item.kind,
        errors,
      );
    });
  }
}

interface IconReference {
  namespace: string;
  name: string;
}

function parseIconReference(value: string): IconReference | undefined {
  const separatorIndex = value.indexOf(":");

  if (
    separatorIndex <= 0 ||
    separatorIndex === value.length - 1 ||
    value.indexOf(":", separatorIndex + 1) !== -1
  ) {
    return undefined;
  }

  return {
    namespace: value.slice(0, separatorIndex),
    name: value.slice(separatorIndex + 1),
  };
}

function validateIconReferenceValue(
  path: string,
  value: unknown,
  errors: DiagramSpecValidationError[],
): void {
  if (typeof value !== "string" || value.trim() !== value) {
    errors.push({
      path,
      message: `${path} must be a namespaced icon reference.`,
      badValue: value,
      expected: iconReferenceExpected,
      suggestion: `Use a supported icon reference such as ${LUCIDE_ICON_NAMESPACE}:database.`,
    });
    return;
  }

  const reference = parseIconReference(value);

  if (reference === undefined) {
    errors.push({
      path,
      message: `${path} must be a namespaced icon reference.`,
      badValue: value,
      expected: iconReferenceExpected,
      suggestion: `Use a supported icon reference such as ${LUCIDE_ICON_NAMESPACE}:database.`,
    });
    return;
  }

  if (reference.namespace !== LUCIDE_ICON_NAMESPACE) {
    errors.push({
      path,
      message: `${path} uses unsupported icon namespace "${reference.namespace}".`,
      badValue: value,
      expected: `Supported icon namespaces: ${LUCIDE_ICON_NAMESPACE}.`,
      suggestion: `Use ${LUCIDE_ICON_NAMESPACE}:<icon-name> with a packaged Lucide icon, such as ${LUCIDE_ICON_NAMESPACE}:database.`,
    });
    return;
  }

  if (isPackagedLucideIconName(reference.name)) {
    return;
  }

  errors.push({
    path,
    message: `${path} references unknown Lucide icon "${reference.name}".`,
    badValue: value,
    expected: "Known Lucide icon name.",
    suggestion: `Choose a packaged Lucide icon, such as ${LUCIDE_ICON_NAMESPACE}:database.`,
  });
}

function validateDiagramObjectIcons(
  value: Record<string, unknown>,
  errors: DiagramSpecValidationError[],
): void {
  for (const collectionName of ["nodes", "groups"] as const) {
    const collection = value[collectionName];

    if (!Array.isArray(collection)) {
      continue;
    }

    collection.forEach((item, index) => {
      if (!isRecord(item) || !("icon" in item)) {
        return;
      }

      validateIconReferenceValue(
        `${collectionName}[${index}].icon`,
        item.icon,
        errors,
      );
    });
  }
}

function isLocalSourceReference(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }

  const trimmedValue = value.trim();

  return (
    trimmedValue.length > 0 &&
    trimmedValue === value &&
    !urlSchemePattern.test(value) &&
    !value.startsWith("/") &&
    !value.startsWith("//")
  );
}

function isExternalUrlReference(value: unknown): value is string {
  if (typeof value !== "string" || value.trim() !== value) {
    return false;
  }

  try {
    const url = new URL(value);

    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      url.hostname.length > 0
    );
  } catch {
    return false;
  }
}

function validateMetadataSourceReference(
  metadataPath: string,
  metadata: Record<string, unknown>,
  errors: DiagramSpecValidationError[],
): void {
  if (!("source" in metadata) || isLocalSourceReference(metadata.source)) {
    return;
  }

  const sourcePath = `${metadataPath}.source`;

  errors.push({
    path: sourcePath,
    message: `${sourcePath} must be a local repository path or path-like glob.`,
    badValue: metadata.source,
    expected: sourceReferenceExpected,
    suggestion: `Use ${sourcePath} for a repo-relative path/glob. Use metadata.external_url for external URLs.`,
  });
}

function validateMetadataExternalReference(
  metadataPath: string,
  metadata: Record<string, unknown>,
  errors: DiagramSpecValidationError[],
): void {
  if (
    !("external_url" in metadata) ||
    isExternalUrlReference(metadata.external_url)
  ) {
    return;
  }

  const externalUrlPath = `${metadataPath}.external_url`;

  errors.push({
    path: externalUrlPath,
    message: `${externalUrlPath} must be an external URL.`,
    badValue: metadata.external_url,
    expected: externalReferenceExpected,
    suggestion: `Use ${externalUrlPath} for an external HTTP(S) URL. Use metadata.source for local repo paths or globs.`,
  });
}

function validateWellKnownMetadataReferences(
  value: Record<string, unknown>,
  errors: DiagramSpecValidationError[],
): void {
  if (isRecord(value.metadata)) {
    validateMetadataSourceReference("metadata", value.metadata, errors);
    validateMetadataExternalReference("metadata", value.metadata, errors);
  }

  for (const collectionName of ["nodes", "edges", "groups"] as const) {
    const collection = value[collectionName];

    if (!Array.isArray(collection)) {
      continue;
    }

    collection.forEach((item, index) => {
      if (!isRecord(item) || !isRecord(item.metadata)) {
        return;
      }

      validateMetadataSourceReference(
        `${collectionName}[${index}].metadata`,
        item.metadata,
        errors,
      );
      validateMetadataExternalReference(
        `${collectionName}[${index}].metadata`,
        item.metadata,
        errors,
      );
    });
  }
}

function validateRequiredPlainTextLabels(
  value: Record<string, unknown>,
  errors: DiagramSpecValidationError[],
): void {
  for (const collectionName of ["nodes", "groups"] as const) {
    const collection = value[collectionName];

    if (!Array.isArray(collection)) {
      continue;
    }

    collection.forEach((item, index) => {
      if (!isRecord(item)) {
        return;
      }

      const labelPath = `${collectionName}[${index}].label`;

      if (typeof item.label === "string") {
        return;
      }

      errors.push({
        path: labelPath,
        message: `${labelPath} is required.`,
        badValue: item.label,
        expected: "Plain-text label string.",
        suggestion: `Add a plain-text label to ${collectionName}[${index}].`,
      });
    });
  }
}

function validateOptionalEdgeLabels(
  value: Record<string, unknown>,
  errors: DiagramSpecValidationError[],
): void {
  const edges = value.edges;

  if (!Array.isArray(edges)) {
    return;
  }

  edges.forEach((edge, index) => {
    if (
      !isRecord(edge) ||
      !("label" in edge) ||
      typeof edge.label === "string"
    ) {
      return;
    }

    errors.push({
      path: `edges[${index}].label`,
      message: `edges[${index}].label must be a plain-text string when present.`,
      badValue: edge.label,
      expected: "Plain-text label string.",
      suggestion: `Use a plain-text label or omit edges[${index}].label.`,
    });
  });
}

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

function createDiagramSpecTopologyForValidation(
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

function validateEdgeEndpoints(
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

function validateGroupContainmentReferences(
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

function validateDuplicateGroupContainmentParentage(
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

function validateGroupContainmentCycles(
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

function validateEdgeDirectedValues(
  value: Record<string, unknown>,
  errors: DiagramSpecValidationError[],
): void {
  const edges = value.edges;

  if (!Array.isArray(edges)) {
    return;
  }

  edges.forEach((edge, index) => {
    if (!isRecord(edge) || !("directed" in edge)) {
      return;
    }

    if (typeof edge.directed === "boolean") {
      return;
    }

    errors.push({
      path: `edges[${index}].directed`,
      message: `edges[${index}].directed must be a boolean when present.`,
      badValue: edge.directed,
      expected: "Boolean true or false.",
      suggestion:
        "Use true for directed edges or false for undirected edges.",
    });
  });
}

export function validateDiagramSpec(
  value: unknown,
): DiagramSpecValidationResult {
  const errors: DiagramSpecValidationError[] = [];

  if (!isRecord(value)) {
    errors.push({
      path: "$",
      message: "DiagramSpec must be a top-level object.",
      badValue: value,
      expected: "Object with required top-level fields: version, title, nodes.",
      suggestion:
        "Replace the source contents with a DiagramSpec object containing version, title, and nodes.",
    });

    return { ok: false, errors };
  }

  for (const field of ["version", "title", "nodes"] as const) {
    if (!(field in value)) {
      errors.push({
        path: field,
        message: `Missing required top-level field: ${field}.`,
        expected: "Required top-level fields: version, title, nodes.",
        suggestion: `Add ${field} to the top level of the DiagramSpec.`,
      });
    }
  }

  if (Array.isArray(value.nodes) && value.nodes.length === 0) {
    errors.push({
      path: "nodes",
      message: "nodes must contain at least one node.",
      badValue: value.nodes,
      expected: "nodes with at least one node object.",
      suggestion: "Add at least one node to nodes.",
    });
  }

  if ("direction" in value && !isAllowedDirection(value.direction)) {
    errors.push({
      path: "direction",
      message: `direction must be one of: ${allowedDirectionList}.`,
      badValue: value.direction,
      expected: `One of: ${allowedDirectionList}.`,
      suggestion: "Change direction to right, left, down, or up.",
    });
  }

  validateTopLevelCollectionShapes(value, errors);
  validateDiagramObjectShapes(value, errors);
  validateDiagramObjectIds(value, errors);
  validateDiagramObjectKinds(value, errors);
  validateDiagramObjectIcons(value, errors);
  validateWellKnownMetadataReferences(value, errors);
  validateRequiredPlainTextLabels(value, errors);
  validateOptionalEdgeLabels(value, errors);
  const topology = createDiagramSpecTopologyForValidation(value);

  validateGroupContainmentReferences(value, topology, errors);
  validateDuplicateGroupContainmentParentage(value, topology, errors);
  validateGroupContainmentCycles(value, topology, errors);
  validateEdgeEndpoints(value, topology, errors);
  validateEdgeDirectedValues(value, errors);

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, errors: [] };
}

export function loadValidatedDiagramSpec(
  path: string,
): ValidatedDiagramSpecLoadResult {
  const sourceResult = loadDiagramPilotSourceFile(path);

  if (!sourceResult.ok) {
    return {
      ok: false,
      failure: sourceResult.failure,
    };
  }

  const validation = validateDiagramSpec(sourceResult.source.value);

  if (!validation.ok) {
    return {
      ok: false,
      failure: {
        kind: "validation",
        source: sourceResult.source,
        errors: validation.errors,
      },
    };
  }

  return {
    ok: true,
    source: sourceResult.source,
    spec: sourceResult.source.value as DiagramSpec,
  };
}
