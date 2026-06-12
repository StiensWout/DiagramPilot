import type {
  DiagramSpec,
  DiagramSpecEdge,
  DiagramSpecGroup,
  DiagramSpecNode,
  DiagramSpecView,
} from "./diagramspec-topology.js";
import type { DiagramSpecValidationError } from "./diagramspec-validation.js";
import {
  forEachCollectionItem,
  forEachCollectionRecord,
  isRecord,
  isStableId,
  validateStableIdShape,
} from "./diagramspec-validation-helpers.js";
import { selectDiagramSpecView } from "./diagramspec-views.js";

const viewFilterFields = [
  "groups",
  "nodes",
  "edges",
  "nodeKinds",
  "edgeKinds",
] as const;

const referenceFields = [
  {
    field: "groups",
    collection: "groups",
    label: "group",
    empty: "No groups are declared.",
  },
  {
    field: "nodes",
    collection: "nodes",
    label: "node",
    empty: "No nodes are declared.",
  },
  {
    field: "edges",
    collection: "edges",
    label: "edge",
    empty: "No edges are declared.",
  },
] as const;

function validateViewShapes(
  value: Record<string, unknown>,
  errors: DiagramSpecValidationError[],
): void {
  forEachCollectionItem(value, ["views"], (item, index) => {
    if (isRecord(item)) return;
    errors.push({
      path: `views[${index}]`,
      message: `views[${index}] must be a view object.`,
      badValue: item,
      expected: "View object with a stable id and optional filter arrays.",
      suggestion: `Change views[${index}] to a view object with a stable id.`,
    });
  });
}

function validateViewId(
  view: Record<string, unknown>,
  index: number,
  seenIds: Map<string, string>,
  errors: DiagramSpecValidationError[],
): void {
  const idPath = `views[${index}].id`;
  const id = view.id;
  if (!validateStableIdShape(idPath, id, errors)) return;

  const originalPath = seenIds.get(id);
  if (originalPath === undefined) {
    seenIds.set(id, idPath);
    return;
  }

  errors.push({
    path: idPath,
    message: `${idPath} duplicates ${originalPath} "${id}".`,
    badValue: id,
    expected: "One unique stable ID per DiagramSpec view.",
    suggestion: "Assign a unique stable ID to this view.",
  });
}

function validatePlainTextField(
  view: Record<string, unknown>,
  index: number,
  field: "description" | "label",
  errors: DiagramSpecValidationError[],
): void {
  if (!(field in view) || typeof view[field] === "string") return;

  const path = `views[${index}].${field}`;
  errors.push({
    path,
    message: `${path} must be a plain-text string when present.`,
    badValue: view[field],
    expected: "Plain-text string.",
    suggestion: `Use plain text for ${path} or omit it.`,
  });
}

function validateFilterArray(
  view: Record<string, unknown>,
  index: number,
  field: (typeof viewFilterFields)[number],
  errors: DiagramSpecValidationError[],
): void {
  if (!(field in view)) return;

  const path = `views[${index}].${field}`;
  const value = view[field];
  if (!Array.isArray(value)) {
    errors.push({
      path,
      message: `${path} must be an array of stable IDs when present.`,
      badValue: value,
      expected: "Array of stable IDs.",
      suggestion: `Change ${path} to a list of stable IDs or omit it.`,
    });
    return;
  }

  value.forEach((item, itemIndex) => {
    validateStableIdShape(`${path}[${itemIndex}]`, item, errors);
  });
}

export function validateDiagramSpecViewShapeAndFilters(
  value: Record<string, unknown>,
  errors: DiagramSpecValidationError[],
): void {
  const seenIds = new Map<string, string>();

  validateViewShapes(value, errors);
  forEachCollectionRecord(value, ["views"], (view, index) => {
    validateViewId(view, index, seenIds, errors);
    validatePlainTextField(view, index, "label", errors);
    validatePlainTextField(view, index, "description", errors);
    for (const field of viewFilterFields) {
      validateFilterArray(view, index, field, errors);
    }
  });
}

function stableRecordIds(
  value: Record<string, unknown>,
  collectionName: "edges" | "groups" | "nodes",
): string[] {
  const ids: string[] = [];
  forEachCollectionRecord(value, [collectionName], (item) => {
    if (isStableId(item.id)) ids.push(item.id);
  });
  return ids;
}

function articleForLabel(label: "edge" | "group" | "node"): "an" | "a" {
  return label === "edge" ? "an" : "a";
}

function expectedIdList(ids: readonly string[], emptyLabel: string): string {
  return ids.length === 0 ? emptyLabel : `One of: ${ids.join(", ")}.`;
}

function unknownReferenceError(options: {
  path: string;
  value: string;
  label: "edge" | "group" | "node";
  expected: string;
}): DiagramSpecValidationError {
  return {
    path: options.path,
    message: `${options.path} references unknown ${options.label} "${options.value}".`,
    badValue: options.value,
    expected: options.expected,
    suggestion: `Add ${articleForLabel(options.label)} ${options.label} with id "${options.value}" or change ${options.path} to an existing ${options.label} ID.`,
  };
}

function validateViewReferences(
  view: Record<string, unknown>,
  index: number,
  idsByCollection: Record<"edges" | "groups" | "nodes", readonly string[]>,
  errors: DiagramSpecValidationError[],
): boolean {
  let hasErrors = false;

  for (const descriptor of referenceFields) {
    const values = view[descriptor.field];
    const knownIds = new Set(idsByCollection[descriptor.collection]);
    if (!Array.isArray(values)) continue;

    values.forEach((value, valueIndex) => {
      if (!isStableId(value) || knownIds.has(value)) return;

      errors.push(
        unknownReferenceError({
          path: `views[${index}].${descriptor.field}[${valueIndex}]`,
          value,
          label: descriptor.label,
          expected: expectedIdList(
            idsByCollection[descriptor.collection],
            descriptor.empty,
          ),
        }),
      );
      hasErrors = true;
    });
  }

  return hasErrors;
}

function hasFilterValues(view: DiagramSpecView): boolean {
  return viewFilterFields.some((field) => (view[field] ?? []).length > 0);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isNode(value: unknown): value is DiagramSpecNode {
  return isRecord(value) && typeof value.id === "string" && typeof value.label === "string";
}

function isEdge(value: unknown): value is DiagramSpecEdge {
  return isRecord(value) && typeof value.id === "string" && typeof value.from === "string" && typeof value.to === "string";
}

function isGroup(value: unknown): value is DiagramSpecGroup {
  return isRecord(value) && typeof value.id === "string" && typeof value.label === "string" && isStringArray(value.contains);
}

function isView(value: unknown): value is DiagramSpecView {
  return isRecord(value) && typeof value.id === "string";
}

function optionalCollection<T>(
  value: unknown,
  guard: (item: unknown) => item is T,
): boolean {
  return value === undefined || (Array.isArray(value) && value.every(guard));
}

type ProjectableSpecGuard = (value: Record<string, unknown>) => boolean;

function hasNumericVersion(value: Record<string, unknown>): boolean {
  return typeof value.version === "number";
}

function hasTextTitle(value: Record<string, unknown>): boolean {
  return typeof value.title === "string";
}

function hasProjectableNodes(value: Record<string, unknown>): boolean {
  return Array.isArray(value.nodes) && value.nodes.every(isNode);
}

function hasProjectableEdges(value: Record<string, unknown>): boolean {
  return optionalCollection(value.edges, isEdge);
}

function hasProjectableGroups(value: Record<string, unknown>): boolean {
  return optionalCollection(value.groups, isGroup);
}

function hasProjectableViews(value: Record<string, unknown>): boolean {
  return optionalCollection(value.views, isView);
}

const projectableSpecGuards: readonly ProjectableSpecGuard[] = [
  hasNumericVersion,
  hasTextTitle,
  hasProjectableNodes,
  hasProjectableEdges,
  hasProjectableGroups,
  hasProjectableViews,
];

function projectableDiagramSpec(
  value: Record<string, unknown>,
): DiagramSpec | undefined {
  return projectableSpecGuards.every((guard) => guard(value))
    ? (value as unknown as DiagramSpec)
    : undefined;
}

function projectionMatchedObjectCount(
  spec: DiagramSpec,
  view: DiagramSpecView,
): number {
  const projection = selectDiagramSpecView(spec, view.id);

  if (!projection.ok) {
    return 1;
  }

  return projection.counts.nodes + projection.counts.edges + projection.counts.groups;
}

function shouldValidateViewMatches(
  view: DiagramSpecView,
  index: number,
  viewIndexesWithReferenceErrors: ReadonlySet<number>,
): boolean {
  return hasFilterValues(view) && !viewIndexesWithReferenceErrors.has(index);
}

function unmatchedFilterError(
  view: DiagramSpecView,
  index: number,
): DiagramSpecValidationError {
  return {
    path: `views[${index}]`,
    message: `View "${view.id}" filters do not match any diagram objects.`,
    badValue: view,
    expected: "At least one matching node, edge, or group.",
    suggestion:
      "Change the view filters to reference existing groups, nodes, edges, node kinds, or edge kinds.",
  };
}

function validateViewFiltersMatchObjects(
  spec: DiagramSpec,
  view: DiagramSpecView,
  index: number,
  errors: DiagramSpecValidationError[],
  viewIndexesWithReferenceErrors: ReadonlySet<number>,
): void {
  if (!shouldValidateViewMatches(view, index, viewIndexesWithReferenceErrors)) return;

  if (projectionMatchedObjectCount(spec, view) > 0) return;

  errors.push(unmatchedFilterError(view, index));
}

function validateFiltersMatchObjects(
  value: Record<string, unknown>,
  errors: DiagramSpecValidationError[],
  viewIndexesWithReferenceErrors: ReadonlySet<number>,
): void {
  const spec = projectableDiagramSpec(value);
  if (spec?.views === undefined) return;

  spec.views.forEach((view, index) => {
    validateViewFiltersMatchObjects(
      spec,
      view,
      index,
      errors,
      viewIndexesWithReferenceErrors,
    );
  });
}

export function validateDiagramSpecViewReferencesAndMatches(
  value: Record<string, unknown>,
  errors: DiagramSpecValidationError[],
): void {
  const viewIndexesWithReferenceErrors = new Set<number>();
  const idsByCollection = {
    edges: stableRecordIds(value, "edges"),
    groups: stableRecordIds(value, "groups"),
    nodes: stableRecordIds(value, "nodes"),
  };

  forEachCollectionRecord(value, ["views"], (view, index) => {
    if (validateViewReferences(view, index, idsByCollection, errors)) {
      viewIndexesWithReferenceErrors.add(index);
    }
  });
  validateFiltersMatchObjects(value, errors, viewIndexesWithReferenceErrors);
}
