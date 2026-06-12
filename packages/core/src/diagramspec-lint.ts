import type { DiagramSpec } from "./diagramspec-topology.js";

export type DiagramSpecLintRuleId =
  | "orphan-node"
  | "unlabeled-edge"
  | "missing-edge-kind"
  | "duplicate-node-label"
  | "duplicate-group-label"
  | "oversized-group"
  | "high-fan-in"
  | "high-fan-out"
  | "large-dense-diagram";

export type DiagramSpecLintSeverity = "warning";

export interface DiagramSpecLintWarning {
  path: string;
  ruleId: DiagramSpecLintRuleId;
  severity: DiagramSpecLintSeverity;
  message: string;
  suggestion: string;
}

export interface DiagramSpecLintResult {
  ok: boolean;
  summary: {
    warningCount: number;
  };
  warnings: DiagramSpecLintWarning[];
}

export const DIAGRAM_SPEC_LINT_THRESHOLDS = {
  groupDirectChildCount: 12,
  nodeFanIn: 6,
  nodeFanOut: 6,
  diagramObjectCount: 50,
  denseDiagramMinimumNodeCount: 20,
  edgeToNodeRatio: 1.5,
} as const;

function connectedNodeIds(spec: DiagramSpec): ReadonlySet<string> {
  const connectedIds = new Set<string>();

  for (const edge of spec.edges ?? []) {
    connectedIds.add(edge.from);
    connectedIds.add(edge.to);
  }

  return connectedIds;
}

function orphanNodeWarnings(spec: DiagramSpec): DiagramSpecLintWarning[] {
  const connectedIds = connectedNodeIds(spec);

  return spec.nodes.flatMap((node, index) =>
    connectedIds.has(node.id)
      ? []
      : [
          {
            path: `nodes[${index}]`,
            ruleId: "orphan-node",
            severity: "warning",
            message: `Node "${node.id}" is not connected to any edge.`,
            suggestion: `Connect ${node.id} with at least one edge or remove it if it is not part of the architecture.`,
          },
        ],
  );
}

function hasText(value: string | undefined): boolean {
  return value !== undefined && value.trim().length > 0;
}

function unlabeledEdgeWarnings(spec: DiagramSpec): DiagramSpecLintWarning[] {
  return (spec.edges ?? []).flatMap((edge, index) =>
    hasText(edge.label)
      ? []
      : [
          {
            path: `edges[${index}].label`,
            ruleId: "unlabeled-edge",
            severity: "warning",
            message: `Edge "${edge.id}" does not have a label.`,
            suggestion:
              "Add a concise label that describes the protocol, event, or data flow.",
          },
        ],
  );
}

function missingEdgeKindWarnings(spec: DiagramSpec): DiagramSpecLintWarning[] {
  return (spec.edges ?? []).flatMap((edge, index) =>
    hasText(edge.kind)
      ? []
      : [
          {
            path: `edges[${index}].kind`,
            ruleId: "missing-edge-kind",
            severity: "warning",
            message: `Edge "${edge.id}" does not have a kind.`,
            suggestion:
              "Add an edge kind such as request, event, data_flow, dependency, or observability.",
          },
        ],
  );
}

function normalizedLabel(label: string): string {
  return label.trim().toLowerCase();
}

function duplicateLabelWarnings<TItem extends { label: string }>(options: {
  collectionName: "groups" | "nodes";
  items: readonly TItem[];
  objectLabel: "Group" | "Node";
  ruleId: Extract<
    DiagramSpecLintRuleId,
    "duplicate-group-label" | "duplicate-node-label"
  >;
  suggestion: string;
}): DiagramSpecLintWarning[] {
  const firstLabelPaths = new Map<string, string>();
  const warnings: DiagramSpecLintWarning[] = [];

  options.items.forEach((item, index) => {
    const labelKey = normalizedLabel(item.label);
    const path = `${options.collectionName}[${index}].label`;
    const firstPath = firstLabelPaths.get(labelKey);

    if (firstPath === undefined) {
      firstLabelPaths.set(labelKey, path);
      return;
    }

    warnings.push({
      path,
      ruleId: options.ruleId,
      severity: "warning",
      message: `${options.objectLabel} label "${item.label}" also appears at ${firstPath}.`,
      suggestion: options.suggestion,
    });
  });

  return warnings;
}

function duplicateNodeLabelWarnings(spec: DiagramSpec): DiagramSpecLintWarning[] {
  return duplicateLabelWarnings({
    collectionName: "nodes",
    items: spec.nodes,
    objectLabel: "Node",
    ruleId: "duplicate-node-label",
    suggestion:
      "Use distinct node labels or add clarifying words so reviewers can tell the concepts apart.",
  });
}

function duplicateGroupLabelWarnings(spec: DiagramSpec): DiagramSpecLintWarning[] {
  return duplicateLabelWarnings({
    collectionName: "groups",
    items: spec.groups ?? [],
    objectLabel: "Group",
    ruleId: "duplicate-group-label",
    suggestion:
      "Use distinct group labels or add clarifying words so reviewers can tell the boundaries apart.",
  });
}

function oversizedGroupWarnings(spec: DiagramSpec): DiagramSpecLintWarning[] {
  return (spec.groups ?? []).flatMap((group, index) => {
    const childCount = group.contains.length;

    return childCount <= DIAGRAM_SPEC_LINT_THRESHOLDS.groupDirectChildCount
      ? []
      : [
          {
            path: `groups[${index}].contains`,
            ruleId: "oversized-group",
            severity: "warning",
            message: `Group "${group.id}" contains ${childCount} direct objects; the lint threshold is ${DIAGRAM_SPEC_LINT_THRESHOLDS.groupDirectChildCount}.`,
            suggestion:
              "Split the group into smaller groups or split the source before review.",
          },
        ];
  });
}

function incrementCount(counts: Map<string, number>, id: string): void {
  counts.set(id, (counts.get(id) ?? 0) + 1);
}

function edgeEndpointCounts(
  spec: DiagramSpec,
  endpoint: "from" | "to",
): ReadonlyMap<string, number> {
  const counts = new Map<string, number>();

  for (const edge of spec.edges ?? []) {
    incrementCount(counts, edge[endpoint]);
  }

  return counts;
}

function incomingEdgeCounts(spec: DiagramSpec): ReadonlyMap<string, number> {
  return edgeEndpointCounts(spec, "to");
}

function outgoingEdgeCounts(spec: DiagramSpec): ReadonlyMap<string, number> {
  return edgeEndpointCounts(spec, "from");
}

function highFanInWarnings(spec: DiagramSpec): DiagramSpecLintWarning[] {
  const incomingCounts = incomingEdgeCounts(spec);

  return spec.nodes.flatMap((node, index) => {
    const count = incomingCounts.get(node.id) ?? 0;

    return count <= DIAGRAM_SPEC_LINT_THRESHOLDS.nodeFanIn
      ? []
      : [
          {
            path: `nodes[${index}]`,
            ruleId: "high-fan-in",
            severity: "warning",
            message: `Node "${node.id}" has ${count} incoming edges; the lint threshold is ${DIAGRAM_SPEC_LINT_THRESHOLDS.nodeFanIn}.`,
            suggestion:
              "Split the diagram or add grouping around this node before review.",
          },
        ];
  });
}

function highFanOutWarnings(spec: DiagramSpec): DiagramSpecLintWarning[] {
  const outgoingCounts = outgoingEdgeCounts(spec);

  return spec.nodes.flatMap((node, index) => {
    const count = outgoingCounts.get(node.id) ?? 0;

    return count <= DIAGRAM_SPEC_LINT_THRESHOLDS.nodeFanOut
      ? []
      : [
          {
            path: `nodes[${index}]`,
            ruleId: "high-fan-out",
            severity: "warning",
            message: `Node "${node.id}" has ${count} outgoing edges; the lint threshold is ${DIAGRAM_SPEC_LINT_THRESHOLDS.nodeFanOut}.`,
            suggestion:
              "Split the diagram or add grouping around this node before review.",
          },
        ];
  });
}

function edgeToNodeRatio(spec: DiagramSpec): number {
  if (spec.nodes.length === 0) return 0;

  return (spec.edges ?? []).length / spec.nodes.length;
}

interface LargeDenseDiagramStats {
  objectCount: number;
  ratio: number;
}

function largeDenseDiagramStats(spec: DiagramSpec): LargeDenseDiagramStats {
  const edgeCount = (spec.edges ?? []).length;
  const groupCount = (spec.groups ?? []).length;

  return {
    objectCount: spec.nodes.length + edgeCount + groupCount,
    ratio: edgeToNodeRatio(spec),
  };
}

function exceedsObjectCountThreshold(stats: LargeDenseDiagramStats): boolean {
  return stats.objectCount > DIAGRAM_SPEC_LINT_THRESHOLDS.diagramObjectCount;
}

function exceedsDensityThreshold(
  spec: DiagramSpec,
  stats: LargeDenseDiagramStats,
): boolean {
  const hasEnoughNodes =
    spec.nodes.length >=
    DIAGRAM_SPEC_LINT_THRESHOLDS.denseDiagramMinimumNodeCount;

  return hasEnoughNodes && stats.ratio > DIAGRAM_SPEC_LINT_THRESHOLDS.edgeToNodeRatio;
}

function exceedsLargeDenseDiagramThresholds(
  spec: DiagramSpec,
  stats: LargeDenseDiagramStats,
): boolean {
  return (
    exceedsObjectCountThreshold(stats) || exceedsDensityThreshold(spec, stats)
  );
}

function largeDenseDiagramWarnings(spec: DiagramSpec): DiagramSpecLintWarning[] {
  const stats = largeDenseDiagramStats(spec);

  if (!exceedsLargeDenseDiagramThresholds(spec, stats)) return [];

  return [
    {
      path: "$",
      ruleId: "large-dense-diagram",
      severity: "warning",
      message: `Diagram has ${stats.objectCount} objects and ${stats.ratio.toFixed(2)} edges per node; lint thresholds are ${DIAGRAM_SPEC_LINT_THRESHOLDS.diagramObjectCount} objects or ${DIAGRAM_SPEC_LINT_THRESHOLDS.edgeToNodeRatio} edges per node for diagrams with at least ${DIAGRAM_SPEC_LINT_THRESHOLDS.denseDiagramMinimumNodeCount} nodes.`,
      suggestion:
        "Split the diagram into smaller source files or reduce edge density before committing.",
    },
  ];
}

export function lintDiagramSpec(spec: DiagramSpec): DiagramSpecLintResult {
  const warnings = [
    ...orphanNodeWarnings(spec),
    ...unlabeledEdgeWarnings(spec),
    ...missingEdgeKindWarnings(spec),
    ...duplicateNodeLabelWarnings(spec),
    ...duplicateGroupLabelWarnings(spec),
    ...oversizedGroupWarnings(spec),
    ...highFanInWarnings(spec),
    ...highFanOutWarnings(spec),
    ...largeDenseDiagramWarnings(spec),
  ];

  return {
    ok: warnings.length === 0,
    summary: {
      warningCount: warnings.length,
    },
    warnings,
  };
}
