import { validateDiagramSpec } from "./diagramspec-validation.js";
import {
  addImportFidelity,
  cleanImportLine,
  createImportedDiagramSpec,
  createImportFidelityReport,
  createUniqueStableId,
} from "./source-import-common.js";
import {
  normalizeMermaidLabel,
  parseEdge,
  parseNodeReference,
} from "./source-import-mermaid-syntax.js";
import type {
  DiagramSpec,
  DiagramSpecDirection,
  DiagramSpecEdge,
  DiagramSpecGroup,
  DiagramSpecNode,
} from "./diagramspec-topology.js";
import type {
  ImportFidelityDiagnostic,
  ImportFidelityKind,
  ImportFidelityReport,
  ImportFidelitySummary,
  ImporterStateBase,
} from "./source-import-common.js";
import type { ParsedNodeReference } from "./source-import-mermaid-syntax.js";

export type {
  ImportFidelityDiagnostic,
  ImportFidelityKind,
  ImportFidelityReport,
  ImportFidelitySummary,
};

export type MermaidImportResult =
  | {
      ok: true;
      format: "mermaid";
      spec: DiagramSpec;
      fidelity: ImportFidelityReport;
    }
  | {
      ok: false;
      format: "mermaid";
      message: string;
      fidelity: ImportFidelityReport;
    };

export interface ImportMermaidOptions {
  title?: string;
}

interface MutableGroup {
  group: DiagramSpecGroup;
  contains: Set<string>;
}

interface MermaidImporterState extends ImporterStateBase<MutableGroup> {
  direction?: DiagramSpecDirection;
  nodesByRawId: Map<string, DiagramSpecNode>;
  groupsByRawId: Map<string, MutableGroup>;
  activeGroupIds: string[];
  sawDeclaration: boolean;
}

const directionByMermaidDirection: Readonly<Record<string, DiagramSpecDirection>> = {
  BT: "up",
  LR: "right",
  RL: "left",
  TB: "down",
  TD: "down",
};

const unsupportedLinePatterns = [
  /^accDescr\b/iu,
  /^accTitle\b/iu,
  /^class\b/iu,
  /^classDef\b/iu,
  /^click\b/iu,
  /^linkStyle\b/iu,
  /^style\b/iu,
] as const;

function addFidelity(state: MermaidImporterState, diagnostic: ImportFidelityDiagnostic): void {
  addImportFidelity(state, diagnostic);
}

function addNodeToActiveGroup(
  state: MermaidImporterState,
  nodeId: string,
): void {
  const activeGroupId = state.activeGroupIds.at(-1);
  if (activeGroupId === undefined) return;

  const activeGroup = state.groups.find((item) => item.group.id === activeGroupId);
  if (activeGroup === undefined || activeGroup.contains.has(nodeId)) return;

  activeGroup.contains.add(nodeId);
  activeGroup.group.contains.push(nodeId);
}

function ensureNode(
  state: MermaidImporterState,
  reference: ParsedNodeReference,
): DiagramSpecNode {
  const existing = state.nodesByRawId.get(reference.rawId);
  return existing === undefined
    ? createNode(state, reference)
    : updateExistingNode(state, existing, reference);
}

function createNode(
  state: MermaidImporterState,
  reference: ParsedNodeReference,
): DiagramSpecNode {
  const node: DiagramSpecNode = {
    id: createUniqueStableId(state.usedStableIds, reference.rawId, "node"),
    label: reference.label ?? reference.rawId,
  };
  state.nodesByRawId.set(reference.rawId, node);
  state.nodes.push(node);
  addNodeToActiveGroup(state, node.id);
  addFidelity(state, {
    kind: "preserved",
    construct: "node",
    message: `Preserved Mermaid node ${reference.rawId}.`,
    source: reference.rawId,
  });

  if (reference.approximatedShape !== undefined) {
    addFidelity(state, {
      kind: "approximated",
      construct: "node shape",
      message: `Imported Mermaid ${reference.approximatedShape} shape as a plain DiagramPilot node.`,
      source: reference.rawId,
    });
  }

  return node;
}

function updateExistingNode(
  state: MermaidImporterState,
  node: DiagramSpecNode,
  reference: ParsedNodeReference,
): DiagramSpecNode {
  if (reference.label !== undefined && node.label !== reference.label) {
    node.label = reference.label;
    addFidelity(state, {
      kind: "preserved",
      construct: "node label",
      message: `Updated Mermaid node ${reference.rawId} label.`,
      source: reference.rawId,
    });
  }

  addNodeToActiveGroup(state, node.id);
  return node;
}

function createEdge(
  state: MermaidImporterState,
  from: DiagramSpecNode,
  to: DiagramSpecNode,
  label: string | undefined,
  directed: boolean,
  source: string,
): void {
  const edge: DiagramSpecEdge = {
    id: createUniqueStableId(
      state.usedStableIds,
      `${from.id}_to_${to.id}`,
      "edge",
    ),
    from: from.id,
    to: to.id,
  };

  if (label !== undefined && label !== "") edge.label = label;
  if (!directed) edge.directed = false;

  state.edges.push(edge);
  addFidelity(state, {
    kind: "preserved",
    construct: "edge",
    message: `Preserved Mermaid edge ${from.id} to ${to.id}.`,
    source,
  });
}

function importEdge(state: MermaidImporterState, line: string): boolean {
  const edge = parseEdge(line);
  if (edge === undefined) return false;

  const fromRef = parseNodeReference(edge.from);
  const toRef = parseNodeReference(edge.to);
  if (fromRef === undefined || toRef === undefined) {
    addFidelity(state, {
      kind: "dropped",
      construct: "edge",
      message: "Dropped Mermaid edge with unsupported endpoint syntax.",
      source: line,
    });
    return true;
  }

  const from = ensureNode(state, fromRef);
  const to = ensureNode(state, toRef);
  createEdge(state, from, to, edge.label, edge.directed, line);
  return true;
}

function importDeclaration(state: MermaidImporterState, line: string): boolean {
  const match = /^(?:flowchart|graph)\s+([A-Za-z]{2})\b/iu.exec(line);
  if (match === null) return false;

  state.sawDeclaration = true;
  const direction = directionByMermaidDirection[match[1].toUpperCase()];
  if (direction === undefined) {
    state.direction = "right";
    addFidelity(state, {
      kind: "approximated",
      construct: "direction",
      message: `Unsupported Mermaid direction ${match[1]} imported as right.`,
      source: line,
    });
    return true;
  }

  state.direction = direction;
  addFidelity(state, {
    kind: "preserved",
    construct: "direction",
    message: `Preserved Mermaid direction ${match[1].toUpperCase()} as ${direction}.`,
    source: line,
  });
  return true;
}

function parseSubgraphReference(line: string): ParsedNodeReference | undefined {
  const value = line.replace(/^subgraph\s+/iu, "").trim();
  const parsed = parseNodeReference(value);
  if (parsed !== undefined && parsed.label !== undefined) return parsed;

  const label = normalizeMermaidLabel(value.replace(/^\s*["']|["']\s*$/gu, ""));
  return label === ""
    ? undefined
    : {
        rawId: label,
        label,
      };
}

function importSubgraph(state: MermaidImporterState, line: string): boolean {
  if (!/^subgraph\b/iu.test(line)) return false;

  const reference = parseSubgraphReference(line);
  if (reference === undefined) {
    addFidelity(state, {
      kind: "dropped",
      construct: "subgraph",
      message: "Dropped Mermaid subgraph with unsupported syntax.",
      source: line,
    });
    return true;
  }

  const mutableGroup = getOrCreateGroup(state, reference, line);
  addGroupToActiveParent(state, mutableGroup.group.id);
  state.activeGroupIds.push(mutableGroup.group.id);
  return true;
}

function getOrCreateGroup(
  state: MermaidImporterState,
  reference: ParsedNodeReference,
  source: string,
): MutableGroup {
  const existing = state.groupsByRawId.get(reference.rawId);
  if (existing !== undefined) return existing;

  const mutableGroup: MutableGroup = {
    group: {
      id: createUniqueStableId(state.usedStableIds, reference.rawId, "group"),
      label: reference.label ?? reference.rawId,
      contains: [],
    },
    contains: new Set<string>(),
  };
  state.groupsByRawId.set(reference.rawId, mutableGroup);
  state.groups.push(mutableGroup);
  addFidelity(state, {
    kind: "preserved",
    construct: "subgraph",
    message: `Preserved Mermaid subgraph ${reference.rawId}.`,
    source,
  });
  return mutableGroup;
}

function findGroupByStableId(
  state: MermaidImporterState,
  groupId: string,
): MutableGroup | undefined {
  return state.groups.find((item) => item.group.id === groupId);
}

function addGroupToActiveParent(
  state: MermaidImporterState,
  groupId: string,
): void {
  const parentGroupId = state.activeGroupIds.at(-1);
  if (parentGroupId === undefined) return;

  const parentGroup = findGroupByStableId(state, parentGroupId);
  if (parentGroup === undefined || parentGroup.contains.has(groupId)) return;

  parentGroup.contains.add(groupId);
  parentGroup.group.contains.push(groupId);
}

function importSubgraphEnd(state: MermaidImporterState, line: string): boolean {
  if (line !== "end") return false;

  if (state.activeGroupIds.length === 0) {
    addFidelity(state, {
      kind: "dropped",
      construct: "subgraph end",
      message: "Dropped unmatched Mermaid subgraph end.",
      source: line,
    });
    return true;
  }

  state.activeGroupIds.pop();
  return true;
}

function isUnsupportedMermaidLine(line: string): boolean {
  return unsupportedLinePatterns.some((pattern) => pattern.test(line));
}

function importNodeLine(state: MermaidImporterState, line: string): boolean {
  const reference = parseNodeReference(line);
  if (reference === undefined) return false;

  ensureNode(state, reference);
  return true;
}

type MermaidLineImporter = (state: MermaidImporterState, line: string) => boolean;

const mermaidLineImporters: MermaidLineImporter[] = [
  importDeclaration,
  importSubgraph,
  importSubgraphEnd,
  importEdge,
];

function dropCommentLine(
  state: MermaidImporterState,
  trimmedLine: string,
): boolean {
  if (!trimmedLine.startsWith("%%")) return false;

  addFidelity(state, {
    kind: "dropped",
    construct: "comment",
    message: "Dropped Mermaid comment or directive.",
    source: trimmedLine,
  });
  return true;
}

function importKnownLine(state: MermaidImporterState, line: string): boolean {
  for (const importer of mermaidLineImporters) {
    if (importer(state, line)) return true;
  }

  return false;
}

function importFallbackLine(state: MermaidImporterState, line: string): void {
  if (isUnsupportedMermaidLine(line)) {
    addFidelity(state, {
      kind: "dropped",
      construct: "Mermaid styling or interaction",
      message: "Dropped Mermaid styling, class, accessibility, or interaction syntax.",
      source: line,
    });
    return;
  }

  if (importNodeLine(state, line)) return;

  addFidelity(state, {
    kind: "dropped",
    construct: "Mermaid syntax",
    message: "Dropped unsupported Mermaid syntax.",
    source: line,
  });
}

function importLine(state: MermaidImporterState, rawLine: string): void {
  const line = normalizedImportLine(state, rawLine);
  if (line === undefined) return;
  if (importKnownLine(state, line)) return;

  importFallbackLine(state, line);
}

function normalizedImportLine(
  state: MermaidImporterState,
  rawLine: string,
): string | undefined {
  const trimmedLine = rawLine.trim();
  if (trimmedLine === "") return undefined;
  if (dropCommentLine(state, trimmedLine)) return undefined;

  const line = cleanImportLine(rawLine, ["%%"]);
  return line === "" ? undefined : line;
}

function createImportedSpec(state: MermaidImporterState): DiagramSpec {
  return createImportedDiagramSpec({
    title: state.title,
    direction: state.direction ?? "right",
    nodes: state.nodes,
    groups: state.groups.map((item) => item.group),
    edges: state.edges,
  });
}

function createEmptyState(options: ImportMermaidOptions): MermaidImporterState {
  return {
    title: options.title ?? "Imported Mermaid Diagram",
    nodes: [],
    edges: [],
    groups: [],
    nodesByRawId: new Map(),
    groupsByRawId: new Map(),
    usedStableIds: new Set(),
    activeGroupIds: [],
    fidelity: [],
    sawDeclaration: false,
  };
}

function importMermaidLines(state: MermaidImporterState, input: string): void {
  for (const line of input.split(/\r\n|\r|\n/u)) {
    importLine(state, line);
  }
}

function importFailureResult(
  message: string,
  fidelity: ImportFidelityReport,
): MermaidImportResult {
  return {
    ok: false,
    format: "mermaid",
    message,
    fidelity,
  };
}

function validatedImportResult(
  spec: DiagramSpec,
  fidelity: ImportFidelityReport,
): MermaidImportResult {
  const validation = validateDiagramSpec(spec);
  if (!validation.ok) {
    return importFailureResult(
      validation.errors[0]?.message ??
        "Imported Mermaid diagram did not produce a valid DiagramPilot Source File.",
      fidelity,
    );
  }

  return {
    ok: true,
    format: "mermaid",
    spec,
    fidelity,
  };
}

export function importMermaidDiagram(
  input: string,
  options: ImportMermaidOptions = {},
): MermaidImportResult {
  const state = createEmptyState(options);
  importMermaidLines(state, input);

  const fidelity = createImportFidelityReport(state.fidelity);
  if (!state.sawDeclaration) {
    return importFailureResult(
      "Mermaid import requires a flowchart or graph declaration.",
      fidelity,
    );
  }

  return validatedImportResult(createImportedSpec(state), fidelity);
}
