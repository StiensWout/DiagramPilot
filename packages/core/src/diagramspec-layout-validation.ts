import type { DiagramSpecValidationError } from "./diagramspec-validation.js";
import {
  forEachCollectionRecord,
  isRecord,
  isStableId,
  validateStableIdShape,
} from "./diagramspec-validation-helpers.js";

const allowedLayoutHintKinds = ["primary_flow", "same_layer"] as const;
const allowedLayoutHintKindList = allowedLayoutHintKinds.join(", ");

function isAllowedLayoutHintKind(value: unknown): boolean {
  return allowedLayoutHintKinds.some((kind) => kind === value);
}

function stableNodeIds(value: Record<string, unknown>): string[] {
  const ids: string[] = [];
  forEachCollectionRecord(value, ["nodes"], (node) => {
    if (isStableId(node.id)) ids.push(node.id);
  });
  return ids;
}

function expectedNodeIds(ids: readonly string[]): string {
  return ids.length === 0 ? "No nodes are declared." : `One of: ${ids.join(", ")}.`;
}

function layoutHints(value: Record<string, unknown>): unknown {
  const layout = value.layout;
  if (!isRecord(layout)) return undefined;
  return layout.hints;
}

function invalidLayoutError(value: unknown): DiagramSpecValidationError {
  return {
    path: "layout",
    message: "layout must be an object when present.",
    badValue: value,
    expected: "Layout object with optional hints.",
    suggestion: "Change layout to an object or omit layout.",
  };
}

function invalidLayoutHintsError(value: unknown): DiagramSpecValidationError {
  return {
    path: "layout.hints",
    message: "layout.hints must be an array of layout hint objects when present.",
    badValue: value,
    expected: "Array of layout hint objects.",
    suggestion: "Change layout.hints to a list of layout hint objects or omit it.",
  };
}

export function validateDiagramSpecLayoutShape(
  value: Record<string, unknown>,
  errors: DiagramSpecValidationError[],
): void {
  if (!("layout" in value)) return;
  validateLayoutValueShape(value.layout, errors);
}

function validateLayoutValueShape(
  layout: unknown,
  errors: DiagramSpecValidationError[],
): void {
  if (!isRecord(layout)) {
    errors.push(invalidLayoutError(layout));
    return;
  }

  validateLayoutHintsShape(layout, errors);
}

function validateLayoutHintsShape(
  layout: Record<string, unknown>,
  errors: DiagramSpecValidationError[],
): void {
  if (!("hints" in layout)) return;

  const hints = layout.hints;
  if (Array.isArray(hints)) return;

  errors.push(invalidLayoutHintsError(hints));
}

function validateLayoutHintId(
  hint: Record<string, unknown>,
  path: string,
  seenIds: Map<string, string>,
  errors: DiagramSpecValidationError[],
): void {
  const idPath = `${path}.id`;
  if (!validateStableIdShape(idPath, hint.id, errors)) return;

  const originalPath = seenIds.get(hint.id);
  if (originalPath === undefined) {
    seenIds.set(hint.id, idPath);
    return;
  }

  errors.push({
    path: idPath,
    message: `${idPath} duplicates ${originalPath} "${hint.id}".`,
    badValue: hint.id,
    expected: "One unique stable ID per DiagramSpec layout hint.",
    suggestion: "Assign a unique stable ID to this layout hint.",
  });
}

function validateLayoutHintKind(
  hint: Record<string, unknown>,
  path: string,
  errors: DiagramSpecValidationError[],
): void {
  const kindPath = `${path}.kind`;
  if (isAllowedLayoutHintKind(hint.kind)) return;

  errors.push({
    path: kindPath,
    message: `${kindPath} must be one of: ${allowedLayoutHintKindList}.`,
    badValue: hint.kind,
    expected: `One of: ${allowedLayoutHintKindList}.`,
    suggestion: `Change ${kindPath} to primary_flow or same_layer.`,
  });
}

function validateLayoutHintNodeList(
  hint: Record<string, unknown>,
  path: string,
  errors: DiagramSpecValidationError[],
): void {
  const nodesPath = `${path}.nodes`;
  if (!Array.isArray(hint.nodes)) {
    errors.push({
      path: nodesPath,
      message: `${nodesPath} must be an array of node IDs.`,
      badValue: hint.nodes,
      expected: "Array of one or more DiagramSpec node IDs.",
      suggestion: `Change ${nodesPath} to a list of node IDs.`,
    });
    return;
  }

  if (hint.nodes.length === 0) {
    errors.push({
      path: nodesPath,
      message: `${nodesPath} must contain at least one node ID.`,
      badValue: hint.nodes,
      expected: "Array of one or more DiagramSpec node IDs.",
      suggestion: `Add node IDs to ${nodesPath} or remove this layout hint.`,
    });
  }

  hint.nodes.forEach((nodeId, nodeIndex) => {
    validateStableIdShape(`${nodesPath}[${nodeIndex}]`, nodeId, errors);
  });
}

function validateLayoutHint(
  hint: unknown,
  index: number,
  seenIds: Map<string, string>,
  errors: DiagramSpecValidationError[],
): void {
  const path = `layout.hints[${index}]`;
  if (!isRecord(hint)) {
      errors.push({
        path,
        message: `${path} must be a layout hint object.`,
        badValue: hint,
        expected: "Layout hint object with id, kind, and nodes.",
        suggestion: `Change ${path} to a layout hint object or remove it.`,
      });
      return;
  }

  validateLayoutHintId(hint, path, seenIds, errors);
  validateLayoutHintKind(hint, path, errors);
  validateLayoutHintNodeList(hint, path, errors);
}

export function validateDiagramSpecLayoutHints(
  value: Record<string, unknown>,
  errors: DiagramSpecValidationError[],
): void {
  const hints = layoutHints(value);
  if (!Array.isArray(hints)) return;

  const seenIds = new Map<string, string>();

  hints.forEach((hint, index) => {
    validateLayoutHint(hint, index, seenIds, errors);
  });
}

export function validateDiagramSpecLayoutReferences(
  value: Record<string, unknown>,
  errors: DiagramSpecValidationError[],
): void {
  const hints = layoutHints(value);
  if (!Array.isArray(hints)) return;

  const nodeIds = stableNodeIds(value);
  const knownNodeIds = new Set(nodeIds);

  hints.forEach((hint, index) => {
    if (!isRecord(hint) || !Array.isArray(hint.nodes)) return;

    hint.nodes.forEach((nodeId, nodeIndex) => {
      if (!isStableId(nodeId) || knownNodeIds.has(nodeId)) return;

      const path = `layout.hints[${index}].nodes[${nodeIndex}]`;
      errors.push({
        path,
        message: `${path} references unknown node "${nodeId}".`,
        badValue: nodeId,
        expected: expectedNodeIds(nodeIds),
        suggestion: `Add a node with id "${nodeId}" or change ${path} to an existing node ID.`,
      });
    });
  });
}
