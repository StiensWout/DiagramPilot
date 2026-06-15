import { validateDiagramSpec } from "./diagramspec-validation.js";
import {
  addImportFidelity,
  cleanImportLine,
  createImportedDiagramSpec,
  createImportFidelityReport,
  createUniqueStableId,
} from "./source-import-common.js";
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

export type DotImportFidelityKind = ImportFidelityKind;
export type DotImportFidelityDiagnostic = ImportFidelityDiagnostic;
export type DotImportFidelitySummary = ImportFidelitySummary;
export type DotImportFidelityReport = ImportFidelityReport;

export type DotImportResult =
  | {
      ok: true;
      format: "dot";
      spec: DiagramSpec;
      fidelity: DotImportFidelityReport;
    }
  | {
      ok: false;
      format: "dot";
      message: string;
      fidelity: DotImportFidelityReport;
    };

export interface ImportDotOptions {
  title?: string;
}

interface MutableGroup {
  group: DiagramSpecGroup;
  contains: Set<string>;
}

interface DotImporterState extends ImporterStateBase<MutableGroup> {
  direction?: DiagramSpecDirection;
  nodesByRawId: Map<string, DiagramSpecNode>;
  groupsByRawId: Map<string, MutableGroup>;
  activeGroupIds: string[];
  sawDeclaration: boolean;
  directedGraph: boolean;
}

interface ParsedAttributeList {
  label?: string;
  rankdir?: DiagramSpecDirection;
  unsupportedKeys: string[];
}

interface ParsedEdge {
  from: string;
  to: string;
  label?: string;
  directed: boolean;
  unsupportedKeys: string[];
}

const directionByRankdir: Readonly<Record<string, DiagramSpecDirection>> = {
  BT: "up",
  LR: "right",
  RL: "left",
  TB: "down",
};

const graphDeclarationPattern = /^(?:strict\s+)?(di)?graph(?:\s+.+?)?\s*\{$/iu;
const subgraphOpenPattern = /^subgraph(?:\s+(.+?))?\s*\{$/iu;
const edgePattern = /^(.+?)\s*(->|--)\s*(.+?)(?:\s+(\[.*\]))?$/u;
const nodePattern = /^(.+?)(?:\s+(\[.*\]))?$/u;
const unsupportedAttributeKeys = new Set([
  "arrowhead",
  "arrowsize",
  "color",
  "fillcolor",
  "fontname",
  "fontsize",
  "height",
  "margin",
  "penwidth",
  "pos",
  "shape",
  "splines",
  "style",
  "width",
]);

function addFidelity(state: DotImporterState, diagnostic: ImportFidelityDiagnostic): void {
  addImportFidelity(state, diagnostic);
}

function unquoteText(value: string): string {
  const trimmed = value.trim();
  const quote = trimmed[0];

  return quote === `"` && trimmed.endsWith(quote)
    ? trimmed.slice(1, -1).replace(/\\"/gu, `"`)
    : trimmed;
}

function normalizeDotId(value: string): string {
  return unquoteText(value.trim().replace(/;$/u, "").trim());
}

function activeGroup(state: DotImporterState): MutableGroup | undefined {
  const activeGroupId = state.activeGroupIds.at(-1);
  return activeGroupId === undefined
    ? undefined
    : state.groups.find((item) => item.group.id === activeGroupId);
}

function addToGroup(
  group: MutableGroup | undefined,
  objectId: string,
): void {
  if (group === undefined || group.contains.has(objectId)) return;

  group.contains.add(objectId);
  group.group.contains.push(objectId);
}

function addNodeToActiveGroup(state: DotImporterState, nodeId: string): void {
  addToGroup(activeGroup(state), nodeId);
}

function addGroupToActiveParent(state: DotImporterState, groupId: string): void {
  addToGroup(activeGroup(state), groupId);
}

function createNode(
  state: DotImporterState,
  rawId: string,
  label?: string,
): DiagramSpecNode {
  const node: DiagramSpecNode = {
    id: createUniqueStableId(state.usedStableIds, rawId, "node"),
    label: label ?? rawId,
  };
  state.nodesByRawId.set(rawId, node);
  state.nodes.push(node);
  addNodeToActiveGroup(state, node.id);
  addFidelity(state, {
    kind: "preserved",
    construct: "node",
    message: `Preserved DOT node ${rawId}.`,
    source: rawId,
  });
  return node;
}

function ensureNode(
  state: DotImporterState,
  rawId: string,
  label?: string,
): DiagramSpecNode {
  const existing = state.nodesByRawId.get(rawId);
  if (existing === undefined) return createNode(state, rawId, label);

  if (label !== undefined && existing.label !== label) {
    existing.label = label;
    addFidelity(state, {
      kind: "preserved",
      construct: "node label",
      message: `Updated DOT node ${rawId} label.`,
      source: rawId,
    });
  }

  addNodeToActiveGroup(state, existing.id);
  return existing;
}

function getOrCreateGroup(
  state: DotImporterState,
  rawId: string,
  source: string,
): MutableGroup {
  const existing = state.groupsByRawId.get(rawId);
  if (existing !== undefined) return existing;

  const stableLabel = rawId.replace(/^cluster_/iu, "");
  const mutableGroup: MutableGroup = {
    group: {
      id: createUniqueStableId(
        state.usedStableIds,
        rawId.replace(/^cluster_/iu, ""),
        "group",
      ),
      label: stableLabel,
      contains: [],
    },
    contains: new Set<string>(),
  };
  state.groupsByRawId.set(rawId, mutableGroup);
  state.groups.push(mutableGroup);
  addGroupToActiveParent(state, mutableGroup.group.id);
  addFidelity(state, {
    kind: "preserved",
    construct: "cluster",
    message: `Preserved DOT cluster ${rawId}.`,
    source,
  });
  return mutableGroup;
}

function parseAttributeList(attributeList: string | undefined): ParsedAttributeList {
  const parsed = createEmptyAttributeList();
  if (attributeList === undefined) return parsed;

  const inner = attributeList.trim().replace(/^\[/u, "").replace(/\]$/u, "");
  const attributes = inner
    .split(/[;,]/u)
    .map((item) => item.trim())
    .filter((item) => item !== "");

  for (const attribute of attributes) {
    applyParsedAttribute(parsed, attribute);
  }

  return parsed;
}

function createEmptyAttributeList(): ParsedAttributeList {
  return { unsupportedKeys: [] };
}

function applyParsedAttribute(
  parsed: ParsedAttributeList,
  attribute: string,
): void {
  const assignment = parseAttributeAssignment(attribute);
  if (assignment === undefined) {
    parsed.unsupportedKeys.push(attribute);
    return;
  }

  if (assignment.key === "label") {
    parsed.label = assignment.value;
    return;
  }

  if (assignment.key === "rankdir") {
    parsed.rankdir = directionByRankdir[assignment.value.toUpperCase()];
    return;
  }

  addUnsupportedAttribute(parsed, assignment.key);
}

function parseAttributeAssignment(
  attribute: string,
): { key: string; value: string } | undefined {
  const separatorIndex = attribute.indexOf("=");
  if (separatorIndex === -1) return undefined;

  return {
    key: attribute.slice(0, separatorIndex).trim().toLowerCase(),
    value: normalizeDotId(attribute.slice(separatorIndex + 1)),
  };
}

function addUnsupportedAttribute(
  parsed: ParsedAttributeList,
  key: string,
): void {
  if (unsupportedAttributeKeys.has(key)) parsed.unsupportedKeys.push(key);
}

function reportUnsupportedAttributes(
  state: DotImporterState,
  keys: readonly string[],
  source: string,
): void {
  if (keys.length === 0) return;

  addFidelity(state, {
    kind: "dropped",
    construct: "DOT styling or layout",
    message: `Dropped DOT styling, layout, or unsupported attributes: ${keys.join(", ")}.`,
    source,
  });
}

function importGraphDeclaration(state: DotImporterState, line: string): boolean {
  const match = graphDeclarationPattern.exec(line);
  if (match === null) return false;

  state.sawDeclaration = true;
  state.directedGraph = match[1] !== undefined;
  addFidelity(state, {
    kind: "preserved",
    construct: "graph declaration",
    message: `Preserved DOT ${state.directedGraph ? "digraph" : "graph"} declaration.`,
    source: line,
  });
  return true;
}

function importGraphClose(state: DotImporterState, line: string): boolean {
  if (line !== "}") return false;

  state.activeGroupIds.pop();
  return true;
}

function importSubgraphOpen(state: DotImporterState, line: string): boolean {
  const match = subgraphOpenPattern.exec(line);
  if (match === null) return false;

  const rawId = normalizeDotId(match[1] ?? `subgraph_${state.groups.length + 1}`);
  const group = getOrCreateGroup(state, rawId, line);
  state.activeGroupIds.push(group.group.id);
  return true;
}

function importRankdir(state: DotImporterState, line: string): boolean {
  const match = /^rankdir\s*=\s*(.+)$/iu.exec(line);
  if (match === null) return false;

  const rawRankdir = normalizeDotId(match[1]).toUpperCase();
  const direction = directionByRankdir[rawRankdir];
  if (direction === undefined) {
    state.direction = "right";
    addFidelity(state, {
      kind: "approximated",
      construct: "direction",
      message: `Unsupported DOT rankdir ${rawRankdir} imported as right.`,
      source: line,
    });
    return true;
  }

  state.direction = direction;
  addFidelity(state, {
    kind: "preserved",
    construct: "direction",
    message: `Preserved DOT rankdir ${rawRankdir} as ${direction}.`,
    source: line,
  });
  return true;
}

function importGroupLabel(state: DotImporterState, line: string): boolean {
  const group = activeGroup(state);
  const match = /^label\s*=\s*(.+)$/iu.exec(line);
  if (group === undefined || match === null) return false;

  group.group.label = normalizeDotId(match[1]);
  addFidelity(state, {
    kind: "preserved",
    construct: "cluster label",
    message: `Preserved DOT cluster label ${group.group.label}.`,
    source: line,
  });
  return true;
}

function parseEdge(line: string): ParsedEdge | undefined {
  const match = edgePattern.exec(line);
  if (match === null) return undefined;

  const attributes = parseAttributeList(match[4]);
  return {
    from: normalizeDotId(match[1]),
    to: normalizeDotId(match[3]),
    label: attributes.label,
    directed: match[2] === "->",
    unsupportedKeys: attributes.unsupportedKeys,
  };
}

function importEdge(state: DotImporterState, line: string): boolean {
  const parsed = parseEdge(line);
  if (parsed === undefined) return false;

  if (hasSubgraphEndpoint(parsed)) {
    reportSubgraphEdgeShorthand(state, line);
    return true;
  }

  const from = ensureNode(state, parsed.from);
  const to = ensureNode(state, parsed.to);
  state.edges.push(createDotEdge(state, parsed, from, to));
  addFidelity(state, {
    kind: "preserved",
    construct: "edge",
    message: `Preserved DOT edge ${from.id} to ${to.id}.`,
    source: line,
  });
  reportUnsupportedAttributes(state, parsed.unsupportedKeys, line);
  return true;
}

function hasSubgraphEndpoint(parsed: ParsedEdge): boolean {
  return /[{}]/u.test(parsed.from) || /[{}]/u.test(parsed.to);
}

function reportSubgraphEdgeShorthand(
  state: DotImporterState,
  line: string,
): void {
  addFidelity(state, {
    kind: "dropped",
    construct: "DOT syntax",
    message: "Dropped DOT subgraph edge shorthand.",
    source: line,
  });
}

function createDotEdge(
  state: DotImporterState,
  parsed: ParsedEdge,
  from: DiagramSpecNode,
  to: DiagramSpecNode,
): DiagramSpecEdge {
  const edge: DiagramSpecEdge = {
    id: createUniqueStableId(
      state.usedStableIds,
      `${from.id}_to_${to.id}`,
      "edge",
    ),
    from: from.id,
    to: to.id,
  };
  if (parsed.label !== undefined) edge.label = parsed.label;
  if (!parsed.directed) edge.directed = false;
  return edge;
}

function importDefaultAttribute(state: DotImporterState, line: string): boolean {
  const match = /^(?:graph|node|edge)\s+(\[.*\])$/iu.exec(line);
  if (match === null) return false;

  const attributes = parseAttributeList(match[1]);
  reportUnsupportedAttributes(state, attributes.unsupportedKeys, line);

  if (attributes.rankdir !== undefined) {
    state.direction = attributes.rankdir;
    addFidelity(state, {
      kind: "preserved",
      construct: "direction",
      message: `Preserved DOT rankdir as ${attributes.rankdir}.`,
      source: line,
    });
  }

  return true;
}

function importNode(state: DotImporterState, line: string): boolean {
  const match = nodePattern.exec(line);
  if (match === null) return false;

  const rawId = normalizeDotId(match[1]);
  if (isInvalidNodeId(rawId)) return false;

  const attributes = parseAttributeList(match[2]);
  if (isAttributeOnlyNodeStatement(attributes)) {
    reportUnsupportedAttributes(state, attributes.unsupportedKeys, line);
    return true;
  }

  ensureNode(state, rawId, attributes.label);
  reportUnsupportedAttributes(state, attributes.unsupportedKeys, line);
  return true;
}

function isInvalidNodeId(rawId: string): boolean {
  return rawId === "" || rawId.includes("=");
}

function isAttributeOnlyNodeStatement(attributes: ParsedAttributeList): boolean {
  return attributes.label === undefined && attributes.unsupportedKeys.length > 0;
}

function importFallbackLine(state: DotImporterState, line: string): void {
  addFidelity(state, {
    kind: "dropped",
    construct: "DOT syntax",
    message: "Dropped unsupported DOT syntax.",
    source: line,
  });
}

type DotLineImporter = (state: DotImporterState, line: string) => boolean;

const dotLineImporters: DotLineImporter[] = [
  importGraphDeclaration,
  importGraphClose,
  importSubgraphOpen,
  importRankdir,
  importGroupLabel,
  importDefaultAttribute,
  importEdge,
  importNode,
];

function importKnownLine(state: DotImporterState, line: string): boolean {
  for (const importer of dotLineImporters) {
    if (importer(state, line)) return true;
  }

  return false;
}

function importLine(state: DotImporterState, rawLine: string): void {
  const line = cleanImportLine(rawLine, ["#", "//"]);
  if (line === "") return;
  if (importKnownLine(state, line)) return;

  importFallbackLine(state, line);
}

function createImportedSpec(state: DotImporterState): DiagramSpec {
  return createImportedDiagramSpec({
    title: state.title,
    direction: state.direction ?? "down",
    nodes: state.nodes,
    groups: state.groups.map((item) => item.group),
    edges: state.edges,
  });
}

function createEmptyState(options: ImportDotOptions): DotImporterState {
  return {
    title: options.title ?? "Imported DOT Diagram",
    nodes: [],
    edges: [],
    groups: [],
    nodesByRawId: new Map(),
    groupsByRawId: new Map(),
    usedStableIds: new Set(),
    activeGroupIds: [],
    fidelity: [],
    sawDeclaration: false,
    directedGraph: true,
  };
}

function importDotLines(state: DotImporterState, input: string): void {
  for (const line of input.split(/\r\n|\r|\n/u)) {
    importLine(state, line);
  }
}

function importFailureResult(
  message: string,
  fidelity: DotImportFidelityReport,
): DotImportResult {
  return {
    ok: false,
    format: "dot",
    message,
    fidelity,
  };
}

function validatedImportResult(
  spec: DiagramSpec,
  fidelity: DotImportFidelityReport,
): DotImportResult {
  const validation = validateDiagramSpec(spec);
  if (!validation.ok) {
    return importFailureResult(
      validation.errors[0]?.message ??
        "Imported DOT diagram did not produce a valid DiagramPilot Source File.",
      fidelity,
    );
  }

  return {
    ok: true,
    format: "dot",
    spec,
    fidelity,
  };
}

export function importDotDiagram(
  input: string,
  options: ImportDotOptions = {},
): DotImportResult {
  const state = createEmptyState(options);
  importDotLines(state, input);

  const fidelity = createImportFidelityReport(state.fidelity);
  if (!state.sawDeclaration) {
    return importFailureResult(
      "DOT import requires a graph or digraph declaration.",
      fidelity,
    );
  }

  return validatedImportResult(createImportedSpec(state), fidelity);
}
