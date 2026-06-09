import {
  isPackagedLucideIconName,
  LUCIDE_ICON_NAMESPACE,
} from "@diagrampilot/icons";

import {
  allowedDirectionList,
  allowedDirections,
  iconReferenceExpected,
  stableIdExpected,
  stableIdPattern,
} from "./diagramspec-constants.js";
import { validateWellKnownMetadataReferences } from "./diagramspec-metadata-validation.js";
import {
  createDiagramSpecTopologyForValidation,
  validateDuplicateGroupContainmentParentage,
  validateEdgeEndpoints,
  validateGroupContainmentCycles,
  validateGroupContainmentReferences,
} from "./diagramspec-topology-validation.js";
import {
  diagramObjectCollectionNames,
  forEachCollectionItem,
  forEachCollectionRecord,
  isRecord,
} from "./diagramspec-validation-helpers.js";

export interface RepairableDiagnostic {
  path: string;
  message: string;
  badValue?: unknown;
  expected: string;
  suggestion: string;
}

export interface DiagramSpecValidationError extends RepairableDiagnostic {}

export type DiagramSpecValidationResult =
  | {
      ok: true;
      errors: [];
    }
  | {
      ok: false;
      errors: DiagramSpecValidationError[];
    };

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

  forEachCollectionItem(
    value,
    diagramObjectCollectionNames,
    (item, index, collectionName) => {
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
    },
  );
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

  forEachCollectionRecord(
    value,
    diagramObjectCollectionNames,
    (item, index, collectionName) => {
      const idPath = `${collectionName}[${index}].id`;
      const id = item.id;

      if (validateStableIdShape(idPath, id, errors)) {
        validateGlobalStableIdUniqueness(idPath, id, seenIds, errors);
      }
    },
  );
}

function validateDiagramObjectKinds(
  value: Record<string, unknown>,
  errors: DiagramSpecValidationError[],
): void {
  forEachCollectionRecord(
    value,
    diagramObjectCollectionNames,
    (item, index, collectionName) => {
      if (!("kind" in item)) return;

      validateStableIdShape(
        `${collectionName}[${index}].kind`,
        item.kind,
        errors,
      );
    },
  );
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
  forEachCollectionRecord(
    value,
    ["nodes", "groups"],
    (item, index, collectionName) => {
      if (!("icon" in item)) return;

      validateIconReferenceValue(
        `${collectionName}[${index}].icon`,
        item.icon,
        errors,
      );
    },
  );
}

function validateRequiredPlainTextLabels(
  value: Record<string, unknown>,
  errors: DiagramSpecValidationError[],
): void {
  forEachCollectionRecord(
    value,
    ["nodes", "groups"],
    (item, index, collectionName) => {
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
    },
  );
}

function validateOptionalEdgeLabels(
  value: Record<string, unknown>,
  errors: DiagramSpecValidationError[],
): void {
  forEachCollectionRecord(value, ["edges"], (edge, index) => {
    if (!("label" in edge) || typeof edge.label === "string") {
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

function validateEdgeDirectedValues(
  value: Record<string, unknown>,
  errors: DiagramSpecValidationError[],
): void {
  forEachCollectionRecord(value, ["edges"], (edge, index) => {
    if (!("directed" in edge)) return;

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
