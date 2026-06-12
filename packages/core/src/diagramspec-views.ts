import {
  createDiagramSpecTopology,
  type DiagramSpec,
  type DiagramSpecEdge,
  type DiagramSpecNode,
  type DiagramSpecTopology,
  type DiagramSpecView,
} from "./diagramspec-topology.js";
import {
  createUnknownDiagramSpecReferenceDiagnostic,
  selectedDiagramSpecGroups,
} from "./diagramspec-projection.js";
import type { RepairableDiagnostic } from "./diagramspec-validation.js";

export interface DiagramSpecViewProjectionCounts {
  nodes: number;
  edges: number;
  groups: number;
}

export type DiagramSpecViewProjectionResult =
  | {
      ok: true;
      view: DiagramSpecView;
      spec: DiagramSpec;
      counts: DiagramSpecViewProjectionCounts;
    }
  | {
      ok: false;
      error: RepairableDiagnostic;
    };

interface ViewSelection {
  nodeIds: Set<string>;
  groupIds: Set<string>;
  edgeIds: Set<string>;
}

function arrayValues(values: readonly string[] | undefined): readonly string[] {
  return values ?? [];
}

function hasValues(values: readonly string[] | undefined): boolean {
  return arrayValues(values).length > 0;
}

function hasNodeCriteria(view: DiagramSpecView): boolean {
  return hasValues(view.groups) || hasValues(view.nodes) || hasValues(view.nodeKinds);
}

function hasEdgeCriteria(view: DiagramSpecView): boolean {
  return hasValues(view.edges) || hasValues(view.edgeKinds);
}

function addAncestorGroups(
  topology: DiagramSpecTopology,
  groupIds: Set<string>,
  objectId: string,
): void {
  let parentGroupId = topology.parentGroupIdsByObjectId.get(objectId);

  while (parentGroupId !== undefined) {
    groupIds.add(parentGroupId);
    parentGroupId = topology.parentGroupIdsByObjectId.get(parentGroupId);
  }
}

function containedObjects(
  topology: DiagramSpecTopology,
  groupId: string,
): NonNullable<
  ReturnType<DiagramSpecTopology["containedObjectsByGroupId"]["get"]>
> {
  return topology.containedObjectsByGroupId.get(groupId) ?? [];
}

function addContainedObject(
  topology: DiagramSpecTopology,
  selection: ViewSelection,
  object: ReturnType<typeof containedObjects>[number],
): void {
  if (object.objectType === "node") {
    selection.nodeIds.add(object.id);
    return;
  }

  addContainedGroup(topology, selection, object.id);
}

function addContainedGroup(
  topology: DiagramSpecTopology,
  selection: ViewSelection,
  groupId: string,
): void {
  if (selection.groupIds.has(groupId)) {
    return;
  }

  selection.groupIds.add(groupId);

  for (const object of containedObjects(topology, groupId)) {
    addContainedObject(topology, selection, object);
  }
}

function addGroupCriteria(
  topology: DiagramSpecTopology,
  selection: ViewSelection,
  groupIds: readonly string[],
): void {
  for (const groupId of groupIds) {
    addContainedGroup(topology, selection, groupId);
    addAncestorGroups(topology, selection.groupIds, groupId);
  }
}

function addNodeWithAncestors(
  topology: DiagramSpecTopology,
  selection: ViewSelection,
  nodeId: string,
): void {
  selection.nodeIds.add(nodeId);
  addAncestorGroups(topology, selection.groupIds, nodeId);
}

function addExplicitNodeCriteria(
  topology: DiagramSpecTopology,
  selection: ViewSelection,
  view: DiagramSpecView,
): void {
  for (const nodeId of arrayValues(view.nodes)) {
    addNodeWithAncestors(topology, selection, nodeId);
  }
}

function nodeMatchesKind(node: DiagramSpecNode, view: DiagramSpecView): boolean {
  return node.kind !== undefined && arrayValues(view.nodeKinds).includes(node.kind);
}

function addNodeKindCriteria(
  spec: DiagramSpec,
  topology: DiagramSpecTopology,
  selection: ViewSelection,
  view: DiagramSpecView,
): void {
  for (const node of spec.nodes) {
    if (!nodeMatchesKind(node, view)) continue;

    addNodeWithAncestors(topology, selection, node.id);
  }
}

function addNodeCriteria(
  spec: DiagramSpec,
  topology: DiagramSpecTopology,
  selection: ViewSelection,
  view: DiagramSpecView,
): void {
  addExplicitNodeCriteria(topology, selection, view);
  addNodeKindCriteria(spec, topology, selection, view);
}

function edgeMatchesCriteria(edge: DiagramSpecEdge, view: DiagramSpecView): boolean {
  return (
    arrayValues(view.edges).includes(edge.id) ||
    (edge.kind !== undefined && arrayValues(view.edgeKinds).includes(edge.kind))
  );
}

function canIncludeEdge(
  edge: DiagramSpecEdge,
  selection: ViewSelection,
): boolean {
  return selection.nodeIds.has(edge.from) && selection.nodeIds.has(edge.to);
}

function addEdgeWithEndpoints(
  edge: DiagramSpecEdge,
  topology: DiagramSpecTopology,
  selection: ViewSelection,
): void {
  selection.edgeIds.add(edge.id);
  selection.nodeIds.add(edge.from);
  selection.nodeIds.add(edge.to);
  addAncestorGroups(topology, selection.groupIds, edge.from);
  addAncestorGroups(topology, selection.groupIds, edge.to);
}

function addEdgeIfEndpointsSelected(
  edge: DiagramSpecEdge,
  selection: ViewSelection,
): void {
  if (canIncludeEdge(edge, selection)) {
    selection.edgeIds.add(edge.id);
  }
}

function addCriteriaMatchedEdge(
  edge: DiagramSpecEdge,
  topology: DiagramSpecTopology,
  selection: ViewSelection,
  nodeCriteriaPresent: boolean,
): void {
  if (nodeCriteriaPresent) {
    addEdgeIfEndpointsSelected(edge, selection);
    return;
  }

  addEdgeWithEndpoints(edge, topology, selection);
}

function addEdgesMatchingEdgeCriteria(
  spec: DiagramSpec,
  topology: DiagramSpecTopology,
  selection: ViewSelection,
  view: DiagramSpecView,
  nodeCriteriaPresent: boolean,
): void {
  for (const edge of spec.edges ?? []) {
    if (!edgeMatchesCriteria(edge, view)) continue;

    addCriteriaMatchedEdge(edge, topology, selection, nodeCriteriaPresent);
  }
}

function addEdgesBetweenSelectedNodes(
  spec: DiagramSpec,
  selection: ViewSelection,
): void {
  for (const edge of spec.edges ?? []) {
    addEdgeIfEndpointsSelected(edge, selection);
  }
}

function addEdgesForView(
  spec: DiagramSpec,
  topology: DiagramSpecTopology,
  selection: ViewSelection,
  view: DiagramSpecView,
): void {
  if (hasEdgeCriteria(view)) {
    addEdgesMatchingEdgeCriteria(spec, topology, selection, view, hasNodeCriteria(view));
    return;
  }

  addEdgesBetweenSelectedNodes(spec, selection);
}

function selectedNodes(
  spec: DiagramSpec,
  selection: ViewSelection,
): DiagramSpecNode[] {
  return spec.nodes.filter((node) => selection.nodeIds.has(node.id));
}

function selectedEdges(
  spec: DiagramSpec,
  selection: ViewSelection,
): DiagramSpecEdge[] {
  return (spec.edges ?? []).filter((edge) => selection.edgeIds.has(edge.id));
}

function createSelection(spec: DiagramSpec, view: DiagramSpecView): ViewSelection {
  const topology = createDiagramSpecTopology(spec);
  const selection: ViewSelection = {
    nodeIds: new Set(),
    groupIds: new Set(),
    edgeIds: new Set(),
  };

  addGroupCriteria(topology, selection, arrayValues(view.groups));
  addNodeCriteria(spec, topology, selection, view);
  addEdgesForView(spec, topology, selection, view);

  return selection;
}

function unknownViewError(
  spec: DiagramSpec,
  viewId: string,
): RepairableDiagnostic {
  return createUnknownDiagramSpecReferenceDiagnostic({
    path: "views",
    id: viewId,
    ids: (spec.views ?? []).map((view) => view.id),
    objectLabel: "view",
  });
}

function projectionSpec(
  spec: DiagramSpec,
  selection: ViewSelection,
): DiagramSpec {
  const nodes = selectedNodes(spec, selection);
  const groups = selectedDiagramSpecGroups(spec, selection);
  const edges = selectedEdges(spec, selection);

  return {
    ...spec,
    nodes,
    groups,
    edges,
  };
}

function findDiagramSpecView(
  spec: DiagramSpec,
  viewId: string,
): DiagramSpecView | undefined {
  return (spec.views ?? []).find((candidate) => candidate.id === viewId);
}

function projectionCounts(spec: DiagramSpec): DiagramSpecViewProjectionCounts {
  return {
    nodes: spec.nodes.length,
    edges: (spec.edges ?? []).length,
    groups: (spec.groups ?? []).length,
  };
}

function successfulProjectionResult(
  view: DiagramSpecView,
  selectedSpec: DiagramSpec,
): DiagramSpecViewProjectionResult {
  return {
    ok: true,
    view,
    spec: selectedSpec,
    counts: projectionCounts(selectedSpec),
  };
}

export function selectDiagramSpecView(
  spec: DiagramSpec,
  viewId: string,
): DiagramSpecViewProjectionResult {
  const view = findDiagramSpecView(spec, viewId);

  if (view === undefined) {
    return {
      ok: false,
      error: unknownViewError(spec, viewId),
    };
  }

  const selectedSpec = projectionSpec(spec, createSelection(spec, view));
  return successfulProjectionResult(view, selectedSpec);
}
