import { readFileSync } from "node:fs";

import { LineCounter, parseDocument } from "yaml";
import type { YAMLError } from "yaml";

export const DIAGRAMPILOT_VERSION = "0.1.0";

const allowedDirections = ["right", "left", "down", "up"] as const;
const allowedDirectionList = allowedDirections.join(", ");
const stableIdPattern = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/;
const stableIdExpected = "^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$";

export function getDiagramPilotVersion(): string {
  return DIAGRAMPILOT_VERSION;
}

export type DiagramPilotSourceFormat = "yaml" | "json";

export interface DiagramPilotSourceFile {
  format: DiagramPilotSourceFormat;
  path: string;
  value: unknown;
}

export interface DiagramSpecValidationError {
  path: string;
  message: string;
  badValue?: unknown;
  expected: string;
  suggestion: string;
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

function nodeIdsExpected(nodeIds: ReadonlySet<string>): string {
  if (nodeIds.size === 0) {
    return "An existing node ID.";
  }

  return `One of: ${Array.from(nodeIds).join(", ")}.`;
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
  errors: DiagramSpecValidationError[],
): void {
  const edges = value.edges;

  if (!Array.isArray(edges)) {
    return;
  }

  const nodeIds = stableIdsFromCollection(value.nodes);
  const groupIds = stableIdsFromCollection(value.groups);

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

  validateDiagramObjectIds(value, errors);
  validateRequiredPlainTextLabels(value, errors);
  validateOptionalEdgeLabels(value, errors);
  validateEdgeEndpoints(value, errors);
  validateEdgeDirectedValues(value, errors);

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, errors: [] };
}
