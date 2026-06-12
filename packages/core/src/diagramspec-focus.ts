import {
  createDiagramSpecTopology,
  type DiagramSpec,
  type DiagramSpecEdge,
  type DiagramSpecTopology,
  type DiagramSpecTopologyEntry,
} from "./diagramspec-topology.js";
import {
  createUnknownDiagramSpecReferenceDiagnostic,
  selectedDiagramSpecGroups,
} from "./diagramspec-projection.js";
import type { RepairableDiagnostic } from "./diagramspec-validation.js";

export interface DiagramSpecFocusOptions {
  aroundNodeId?: string;
  depth?: number;
  groupId?: string;
  hideEdgeLabels?: boolean;
}

export interface DiagramSpecFocusCounts {
  nodes: number;
  edges: number;
  groups: number;
}

export type DiagramSpecFocusResult =
  | {
      ok: true;
      spec: DiagramSpec;
      counts: DiagramSpecFocusCounts;
    }
  | {
      ok: false;
      error: RepairableDiagnostic;
    };

interface FocusSelection {
  nodeIds: Set<string>;
  groupIds: Set<string>;
}

interface NeighborhoodQueueItem {
  nodeId: string;
  depth: number;
}

type DiagramSpecFocusSelector = (
  spec: DiagramSpec,
  hideEdgeLabels: boolean,
) => DiagramSpecFocusResult;

function emptySelection(): FocusSelection {
  return {
    nodeIds: new Set(),
    groupIds: new Set(),
  };
}

function addAncestorGroups(
  topology: DiagramSpecTopology,
  selection: FocusSelection,
  objectId: string,
): void {
  let parentGroupId = topology.parentGroupIdsByObjectId.get(objectId);

  while (parentGroupId !== undefined) {
    selection.groupIds.add(parentGroupId);
    parentGroupId = topology.parentGroupIdsByObjectId.get(parentGroupId);
  }
}

function addContainedEntry(
  topology: DiagramSpecTopology,
  selection: FocusSelection,
  entry: DiagramSpecTopologyEntry,
): void {
  if (entry.objectType === "node") {
    selection.nodeIds.add(entry.id);
    return;
  }

  addContainedGroup(topology, selection, entry.id);
}

function addContainedGroup(
  topology: DiagramSpecTopology,
  selection: FocusSelection,
  groupId: string,
): void {
  if (selection.groupIds.has(groupId)) return;

  selection.groupIds.add(groupId);

  for (const entry of topology.containedObjectsByGroupId.get(groupId) ?? []) {
    addContainedEntry(topology, selection, entry);
  }
}

function addNodeWithAncestors(
  topology: DiagramSpecTopology,
  selection: FocusSelection,
  nodeId: string,
): void {
  selection.nodeIds.add(nodeId);
  addAncestorGroups(topology, selection, nodeId);
}

function addNeighbor(
  neighborsByNodeId: Map<string, string[]>,
  nodeId: string,
  neighborId: string,
): void {
  const neighbors = neighborsByNodeId.get(nodeId) ?? [];
  neighbors.push(neighborId);
  neighborsByNodeId.set(nodeId, neighbors);
}

function createNeighborsByNodeId(spec: DiagramSpec): Map<string, string[]> {
  const neighborsByNodeId = new Map<string, string[]>();

  for (const edge of spec.edges ?? []) {
    addNeighbor(neighborsByNodeId, edge.from, edge.to);
    addNeighbor(neighborsByNodeId, edge.to, edge.from);
  }

  return neighborsByNodeId;
}

function addNodeNeighborhood(
  spec: DiagramSpec,
  topology: DiagramSpecTopology,
  selection: FocusSelection,
  nodeId: string,
  maxDepth: number,
): void {
  const neighborsByNodeId = createNeighborsByNodeId(spec);
  const queue = [{ nodeId, depth: 0 }];
  const visitedNodeIds = new Set<string>();

  for (const item of queue) {
    if (!markNodeVisited(visitedNodeIds, item.nodeId)) continue;

    addNodeWithAncestors(topology, selection, item.nodeId);
    enqueueNodeNeighbors(queue, neighborsByNodeId, item, maxDepth);
  }
}

function markNodeVisited(visitedNodeIds: Set<string>, nodeId: string): boolean {
  if (visitedNodeIds.has(nodeId)) return false;

  visitedNodeIds.add(nodeId);
  return true;
}

function enqueueNodeNeighbors(
  queue: NeighborhoodQueueItem[],
  neighborsByNodeId: ReadonlyMap<string, readonly string[]>,
  item: NeighborhoodQueueItem,
  maxDepth: number,
): void {
  if (item.depth >= maxDepth) return;

  for (const neighborId of neighborsByNodeId.get(item.nodeId) ?? []) {
    queue.push({ nodeId: neighborId, depth: item.depth + 1 });
  }
}

function unknownGroupError(
  spec: DiagramSpec,
  groupId: string,
): RepairableDiagnostic {
  return createUnknownDiagramSpecReferenceDiagnostic({
    path: "groups",
    id: groupId,
    ids: (spec.groups ?? []).map((group) => group.id),
    objectLabel: "group",
  });
}

function unknownNodeError(
  spec: DiagramSpec,
  nodeId: string,
): RepairableDiagnostic {
  return createUnknownDiagramSpecReferenceDiagnostic({
    path: "nodes",
    id: nodeId,
    ids: spec.nodes.map((node) => node.id),
    objectLabel: "node",
  });
}

function selectedEdges(
  spec: DiagramSpec,
  selection: FocusSelection,
): DiagramSpecEdge[] {
  return (spec.edges ?? []).filter(
    (edge) => selection.nodeIds.has(edge.from) && selection.nodeIds.has(edge.to),
  );
}

function edgeWithoutLabel(edge: DiagramSpecEdge): DiagramSpecEdge {
  const { label: _label, ...edgeWithoutLabelValue } = edge;
  return edgeWithoutLabelValue;
}

function applyEdgeLabelVisibility(
  edges: readonly DiagramSpecEdge[],
  hideEdgeLabels: boolean,
): DiagramSpecEdge[] {
  return hideEdgeLabels ? edges.map(edgeWithoutLabel) : [...edges];
}

function projectionSpec(
  spec: DiagramSpec,
  selection: FocusSelection,
  hideEdgeLabels: boolean,
): DiagramSpec {
  const nodes = spec.nodes.filter((node) => selection.nodeIds.has(node.id));
  const groups = selectedDiagramSpecGroups(spec, selection);
  const edges = applyEdgeLabelVisibility(
    selectedEdges(spec, selection),
    hideEdgeLabels,
  );

  return {
    ...spec,
    nodes,
    groups,
    edges,
  };
}

function edgeLabelProjectionSpec(
  spec: DiagramSpec,
  hideEdgeLabels: boolean,
): DiagramSpec {
  if (!hideEdgeLabels) return spec;

  return {
    ...spec,
    edges: applyEdgeLabelVisibility(spec.edges ?? [], true),
  };
}

function focusCounts(spec: DiagramSpec): DiagramSpecFocusCounts {
  return {
    nodes: spec.nodes.length,
    edges: (spec.edges ?? []).length,
    groups: (spec.groups ?? []).length,
  };
}

function successfulFocusResult(spec: DiagramSpec): DiagramSpecFocusResult {
  return {
    ok: true,
    spec,
    counts: focusCounts(spec),
  };
}

function focusAroundNode(
  spec: DiagramSpec,
  aroundNodeId: string,
  depth: number,
  hideEdgeLabels: boolean,
): DiagramSpecFocusResult {
  const topology = createDiagramSpecTopology(spec);

  if (!topology.nodesById.has(aroundNodeId)) {
    return {
      ok: false,
      error: unknownNodeError(spec, aroundNodeId),
    };
  }

  const selection = emptySelection();
  addNodeNeighborhood(spec, topology, selection, aroundNodeId, depth);

  return successfulFocusResult(
    projectionSpec(spec, selection, hideEdgeLabels),
  );
}

function focusGroup(
  spec: DiagramSpec,
  groupId: string,
  hideEdgeLabels: boolean,
): DiagramSpecFocusResult {
  const topology = createDiagramSpecTopology(spec);

  if (!topology.groupsById.has(groupId)) {
    return {
      ok: false,
      error: unknownGroupError(spec, groupId),
    };
  }

  const selection = emptySelection();
  addContainedGroup(topology, selection, groupId);
  addAncestorGroups(topology, selection, groupId);

  return successfulFocusResult(
    projectionSpec(spec, selection, hideEdgeLabels),
  );
}

function allFocusSelector(
  spec: DiagramSpec,
  hideEdgeLabels: boolean,
): DiagramSpecFocusResult {
  return successfulFocusResult(edgeLabelProjectionSpec(spec, hideEdgeLabels));
}

function aroundFocusSelector(
  nodeId: string,
  depth: number,
): DiagramSpecFocusSelector {
  return (spec, hideEdgeLabels) =>
    focusAroundNode(spec, nodeId, depth, hideEdgeLabels);
}

function groupFocusSelector(groupId: string): DiagramSpecFocusSelector {
  return (spec, hideEdgeLabels) => focusGroup(spec, groupId, hideEdgeLabels);
}

function focusSelector(options: DiagramSpecFocusOptions): DiagramSpecFocusSelector {
  if (options.aroundNodeId !== undefined) {
    return aroundFocusSelector(options.aroundNodeId, options.depth ?? 1);
  }

  return options.groupId === undefined
    ? allFocusSelector
    : groupFocusSelector(options.groupId);
}

export function selectFocusedDiagramSpec(
  spec: DiagramSpec,
  options: DiagramSpecFocusOptions,
): DiagramSpecFocusResult {
  const hideEdgeLabels = options.hideEdgeLabels ?? false;
  return focusSelector(options)(spec, hideEdgeLabels);
}
