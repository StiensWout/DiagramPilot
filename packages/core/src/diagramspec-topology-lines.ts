import type {
  DiagramSpecGroup,
  DiagramSpecNode,
  DiagramSpecTopology,
} from "./diagramspec-topology.js";
import { walkDiagramSpecTopology } from "./diagramspec-topology.js";

export interface DiagramSpecTopologyLineFormatters {
  rootDepth?: number;
  node(node: DiagramSpecNode, depth: number): string;
  enterGroup(group: DiagramSpecGroup, depth: number): readonly string[];
  exitGroup(group: DiagramSpecGroup, depth: number): string;
}

export function formatDiagramSpecTopologyLines(
  topology: DiagramSpecTopology,
  formatters: DiagramSpecTopologyLineFormatters,
): string[] {
  const lines: string[] = [];

  walkDiagramSpecTopology(topology, {
    rootDepth: formatters.rootDepth,
    node: (node, depth) => {
      lines.push(formatters.node(node, depth));
    },
    enterGroup: (group, depth) => {
      lines.push(...formatters.enterGroup(group, depth));
    },
    exitGroup: (group, depth) => {
      lines.push(formatters.exitGroup(group, depth));
    },
  });

  return lines;
}
