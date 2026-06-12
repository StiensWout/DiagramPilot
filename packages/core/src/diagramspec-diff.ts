import type {
  DiagramSpec,
  DiagramSpecEdge,
  DiagramSpecGroup,
  DiagramSpecNode,
} from "./diagramspec-topology.js";

type DiagramSpecDiffCollectionName = "nodes" | "edges" | "groups";

export interface DiagramSpecDiffObjectChange<TObject> {
  id: string;
  object: TObject;
}

export interface DiagramSpecDiffChangedObject<TObject> {
  id: string;
  before: TObject;
  after: TObject;
  fields: string[];
}

export interface DiagramSpecDiffCollection<TObject> {
  added: DiagramSpecDiffObjectChange<TObject>[];
  removed: DiagramSpecDiffObjectChange<TObject>[];
  changed: DiagramSpecDiffChangedObject<TObject>[];
}

export interface DiagramSpecDiffSummaryCounts {
  nodes: number;
  edges: number;
  groups: number;
}

export interface DiagramSpecDiffSummary {
  added: DiagramSpecDiffSummaryCounts;
  removed: DiagramSpecDiffSummaryCounts;
  changed: DiagramSpecDiffSummaryCounts;
}

export interface DiagramSpecDiffResult {
  summary: DiagramSpecDiffSummary;
  nodes: DiagramSpecDiffCollection<DiagramSpecNode>;
  edges: DiagramSpecDiffCollection<DiagramSpecEdge>;
  groups: DiagramSpecDiffCollection<DiagramSpecGroup>;
}

type DiffChangeKind = "added" | "removed" | "changed";

interface DiffDiagramNodeInput {
  id: string;
  label: string;
  kind: DiffChangeKind;
}

const nodeDiffFields = [
  "label",
  "kind",
  "description",
  "icon",
  "metadata",
] as const satisfies readonly (keyof DiagramSpecNode)[];

const edgeDiffFields = [
  "from",
  "to",
  "label",
  "kind",
  "description",
  "directed",
  "metadata",
] as const satisfies readonly (keyof DiagramSpecEdge)[];

const groupDiffFields = [
  "label",
  "contains",
  "kind",
  "description",
  "icon",
  "metadata",
] as const satisfies readonly (keyof DiagramSpecGroup)[];

function stableObjectMap<TObject extends { id: string }>(
  objects: readonly TObject[] | undefined,
): ReadonlyMap<string, TObject> {
  return new Map((objects ?? []).map((object) => [object.id, object]));
}

function jsonEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function changedFields<TObject extends { id: string }>(
  before: TObject,
  after: TObject,
  fields: readonly (keyof TObject & string)[],
): string[] {
  return fields.filter((field) => !jsonEqual(before[field], after[field]));
}

function addedObjectChanges<TObject extends { id: string }>(
  beforeById: ReadonlyMap<string, TObject>,
  afterObjects: readonly TObject[] | undefined,
): DiagramSpecDiffObjectChange<TObject>[] {
  return (afterObjects ?? [])
    .filter((object) => !beforeById.has(object.id))
    .map((object) => ({ id: object.id, object }));
}

function removedObjectChanges<TObject extends { id: string }>(
  afterById: ReadonlyMap<string, TObject>,
  beforeObjects: readonly TObject[] | undefined,
): DiagramSpecDiffObjectChange<TObject>[] {
  return (beforeObjects ?? [])
    .filter((object) => !afterById.has(object.id))
    .map((object) => ({ id: object.id, object }));
}

function changedObjectChange<TObject extends { id: string }>(
  before: TObject,
  after: TObject | undefined,
  fields: readonly (keyof TObject & string)[],
): DiagramSpecDiffChangedObject<TObject> | undefined {
  if (after === undefined) return undefined;

  const objectFields = changedFields(before, after, fields);
  if (objectFields.length === 0) return undefined;

  return {
    id: before.id,
    before,
    after,
    fields: objectFields,
  };
}

function definedValue<TValue>(
  value: TValue | undefined,
): value is TValue {
  return value !== undefined;
}

function changedObjectChanges<TObject extends { id: string }>(
  afterById: ReadonlyMap<string, TObject>,
  beforeObjects: readonly TObject[] | undefined,
  fields: readonly (keyof TObject & string)[],
): DiagramSpecDiffChangedObject<TObject>[] {
  return (beforeObjects ?? [])
    .map((object) => changedObjectChange(object, afterById.get(object.id), fields))
    .filter(definedValue);
}

function diffObjectCollection<TObject extends { id: string }>(
  beforeObjects: readonly TObject[] | undefined,
  afterObjects: readonly TObject[] | undefined,
  fields: readonly (keyof TObject & string)[],
): DiagramSpecDiffCollection<TObject> {
  const beforeById = stableObjectMap(beforeObjects);
  const afterById = stableObjectMap(afterObjects);

  return {
    added: addedObjectChanges(beforeById, afterObjects),
    removed: removedObjectChanges(afterById, beforeObjects),
    changed: changedObjectChanges(afterById, beforeObjects, fields),
  };
}

function collectionCounts(
  collections: Pick<
    DiagramSpecDiffResult,
    DiagramSpecDiffCollectionName
  >,
  changeType: keyof DiagramSpecDiffCollection<unknown>,
): DiagramSpecDiffSummaryCounts {
  return {
    nodes: collections.nodes[changeType].length,
    edges: collections.edges[changeType].length,
    groups: collections.groups[changeType].length,
  };
}

export function diffDiagramSpecs(
  before: DiagramSpec,
  after: DiagramSpec,
): DiagramSpecDiffResult {
  const collections = {
    nodes: diffObjectCollection(before.nodes, after.nodes, nodeDiffFields),
    edges: diffObjectCollection(before.edges, after.edges, edgeDiffFields),
    groups: diffObjectCollection(before.groups, after.groups, groupDiffFields),
  };

  return {
    summary: {
      added: collectionCounts(collections, "added"),
      removed: collectionCounts(collections, "removed"),
      changed: collectionCounts(collections, "changed"),
    },
    ...collections,
  };
}

function diffDiagramNodeId(
  changeKind: DiffChangeKind,
  objectType: "node" | "edge" | "group",
  id: string,
): string {
  return `${changeKind}_${objectType}_${id}`;
}

function changedObjectLabel(
  objectType: "node" | "edge" | "group",
  change: DiagramSpecDiffChangedObject<unknown>,
): string {
  return `~ ${objectType} ${change.id}: ${change.fields.join(", ")}`;
}

function diffDiagramNodesForCollection<TObject>(
  objectType: "node" | "edge" | "group",
  collection: DiagramSpecDiffCollection<TObject>,
): DiffDiagramNodeInput[] {
  return [
    ...collection.added.map((change) => ({
      id: diffDiagramNodeId("added", objectType, change.id),
      label: `+ ${objectType} ${change.id}`,
      kind: "added" as const,
    })),
    ...collection.removed.map((change) => ({
      id: diffDiagramNodeId("removed", objectType, change.id),
      label: `- ${objectType} ${change.id}`,
      kind: "removed" as const,
    })),
    ...collection.changed.map((change) => ({
      id: diffDiagramNodeId("changed", objectType, change.id),
      label: changedObjectLabel(objectType, change),
      kind: "changed" as const,
    })),
  ];
}

function groupedDiffNodeIds(
  nodes: readonly DiffDiagramNodeInput[],
  kind: DiffChangeKind,
): string[] {
  return nodes.filter((node) => node.kind === kind).map((node) => node.id);
}

export function createDiagramSpecDiffDiagram(
  diff: DiagramSpecDiffResult,
  options: {
    beforePath: string;
    afterPath: string;
  },
): DiagramSpec {
  const nodes = [
    ...diffDiagramNodesForCollection("node", diff.nodes),
    ...diffDiagramNodesForCollection("edge", diff.edges),
    ...diffDiagramNodesForCollection("group", diff.groups),
  ];

  return {
    version: 1,
    title: `DiagramPilot Diff: ${options.beforePath} -> ${options.afterPath}`,
    direction: "down",
    nodes: nodes.map((node) => ({
      id: node.id,
      label: node.label,
      kind: `diff_${node.kind}`,
    })),
    groups: [
      {
        id: "diff_added",
        label: "Added",
        contains: groupedDiffNodeIds(nodes, "added"),
      },
      {
        id: "diff_removed",
        label: "Removed",
        contains: groupedDiffNodeIds(nodes, "removed"),
      },
      {
        id: "diff_changed",
        label: "Changed",
        contains: groupedDiffNodeIds(nodes, "changed"),
      },
    ],
  };
}
