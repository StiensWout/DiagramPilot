import { stringify } from "yaml";

import type {
  DiagramSpec,
  DiagramSpecEdge,
  DiagramSpecGroup,
  DiagramSpecNode,
  DiagramSpecView,
} from "./diagramspec-topology.js";

function setIfDefined(
  target: Record<string, unknown>,
  key: string,
  value: unknown,
): void {
  if (value !== undefined) target[key] = value;
}

function orderedNode(node: DiagramSpecNode): Record<string, unknown> {
  const ordered: Record<string, unknown> = {
    id: node.id,
    label: node.label,
  };
  setIfDefined(ordered, "kind", node.kind);
  setIfDefined(ordered, "description", node.description);
  setIfDefined(ordered, "icon", node.icon);
  setIfDefined(ordered, "metadata", node.metadata);
  return ordered;
}

function orderedGroup(group: DiagramSpecGroup): Record<string, unknown> {
  const ordered: Record<string, unknown> = {
    id: group.id,
    label: group.label,
  };
  setIfDefined(ordered, "contains", group.contains);
  setIfDefined(ordered, "kind", group.kind);
  setIfDefined(ordered, "description", group.description);
  setIfDefined(ordered, "icon", group.icon);
  setIfDefined(ordered, "metadata", group.metadata);
  return ordered;
}

function orderedEdge(edge: DiagramSpecEdge): Record<string, unknown> {
  const ordered: Record<string, unknown> = {
    id: edge.id,
    from: edge.from,
    to: edge.to,
  };
  setIfDefined(ordered, "label", edge.label);
  setIfDefined(ordered, "kind", edge.kind);
  setIfDefined(ordered, "description", edge.description);
  setIfDefined(ordered, "directed", edge.directed);
  setIfDefined(ordered, "metadata", edge.metadata);
  return ordered;
}

function orderedView(view: DiagramSpecView): Record<string, unknown> {
  const ordered: Record<string, unknown> = {
    id: view.id,
  };
  setIfDefined(ordered, "label", view.label);
  setIfDefined(ordered, "description", view.description);
  setIfDefined(ordered, "groups", view.groups);
  setIfDefined(ordered, "nodes", view.nodes);
  setIfDefined(ordered, "edges", view.edges);
  setIfDefined(ordered, "nodeKinds", view.nodeKinds);
  setIfDefined(ordered, "edgeKinds", view.edgeKinds);
  setIfDefined(ordered, "metadata", view.metadata);
  return ordered;
}

export function serializeDiagramPilotSourceFile(spec: DiagramSpec): string {
  const ordered: Record<string, unknown> = {
    version: spec.version,
    title: spec.title,
  };
  setIfDefined(ordered, "description", spec.description);
  setIfDefined(ordered, "direction", spec.direction);
  ordered.nodes = spec.nodes.map(orderedNode);
  setIfDefined(ordered, "groups", spec.groups?.map(orderedGroup));
  setIfDefined(ordered, "edges", spec.edges?.map(orderedEdge));
  setIfDefined(ordered, "views", spec.views?.map(orderedView));
  setIfDefined(ordered, "metadata", spec.metadata);

  return stringify(ordered, { lineWidth: 0 });
}
