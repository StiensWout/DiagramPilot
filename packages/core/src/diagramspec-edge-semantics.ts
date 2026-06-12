export interface DiagramSpecKnownEdgeKind {
  id: string;
  label: string;
  description: string;
  stroke: string;
  dash?: string;
}

export const diagramSpecKnownEdgeKinds = [
  {
    id: "request",
    label: "Request",
    description: "Synchronous request or response flow.",
    stroke: "#2563eb",
  },
  {
    id: "event",
    label: "Event",
    description: "Asynchronous event publication or consumption.",
    stroke: "#7c3aed",
    dash: "6",
  },
  {
    id: "data_flow",
    label: "Data Flow",
    description: "Data movement, replication, or transformation.",
    stroke: "#0891b2",
  },
  {
    id: "dependency",
    label: "Dependency",
    description: "Build-time, runtime, or operational dependency.",
    stroke: "#64748b",
    dash: "4",
  },
  {
    id: "command",
    label: "Command",
    description: "State-changing command or instruction.",
    stroke: "#ea580c",
  },
  {
    id: "query",
    label: "Query",
    description: "Read-only lookup or retrieval.",
    stroke: "#16a34a",
  },
  {
    id: "write",
    label: "Write",
    description: "Persistent state write.",
    stroke: "#dc2626",
  },
  {
    id: "identity",
    label: "Identity",
    description: "Authentication or identity assertion flow.",
    stroke: "#4f46e5",
  },
  {
    id: "authorization",
    label: "Authorization",
    description: "Permission, policy, or access-control decision.",
    stroke: "#9333ea",
  },
  {
    id: "observability",
    label: "Observability",
    description: "Logging, metrics, tracing, or alerting signal.",
    stroke: "#0f766e",
    dash: "3",
  },
  {
    id: "deployment",
    label: "Deployment",
    description: "Release, provisioning, or infrastructure deployment flow.",
    stroke: "#475569",
  },
  {
    id: "incident",
    label: "Incident",
    description: "Incident response, escalation, or remediation flow.",
    stroke: "#be123c",
  },
] as const satisfies readonly DiagramSpecKnownEdgeKind[];

const knownEdgeKindsById: ReadonlyMap<string, DiagramSpecKnownEdgeKind> = new Map(
  diagramSpecKnownEdgeKinds.map((kind) => [kind.id, kind]),
);

export function getDiagramSpecKnownEdgeKind(
  kind: string | undefined,
): DiagramSpecKnownEdgeKind | undefined {
  if (kind === undefined) return undefined;

  return knownEdgeKindsById.get(kind);
}
