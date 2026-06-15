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

export type D2ImportFidelityKind = ImportFidelityKind;
export type D2ImportFidelityDiagnostic = ImportFidelityDiagnostic;
export type D2ImportFidelitySummary = ImportFidelitySummary;
export type D2ImportFidelityReport = ImportFidelityReport;

export type D2ImportResult =
  | {
      ok: true;
      format: "d2";
      spec: DiagramSpec;
      fidelity: D2ImportFidelityReport;
    }
  | {
      ok: false;
      format: "d2";
      message: string;
      fidelity: D2ImportFidelityReport;
    };

export interface ImportD2Options {
  title?: string;
}

interface MutableGroup {
  group: DiagramSpecGroup;
  contains: Set<string>;
}

interface D2ImporterState extends ImporterStateBase<MutableGroup> {
  nodesByRawPath: Map<string, DiagramSpecNode>;
  groupsByRawPath: Map<string, MutableGroup>;
  activeGroupPaths: string[];
  ignoredBlockDepth: number;
}

interface ParsedConnection {
  from: string;
  to: string;
  label?: string;
  directed: boolean;
  reversed: boolean;
  bidirectional: boolean;
}

const connectionPattern = /^(.+?)\s*(<->|->|<-|--)\s*(.+?)(?:\s*:\s*(.+))?$/u;
const attributePathPattern =
  /(?:^|\.)((?:style|shape|near|tooltip|link|icon|width|height|direction))(?:\.|$)/iu;
const quoteCharacters = new Set([`"`, "'", "`"]);

function addFidelity(state: D2ImporterState, diagnostic: ImportFidelityDiagnostic): void {
  addImportFidelity(state, diagnostic);
}

function unquoteText(value: string): string {
  const trimmed = value.trim();
  const quote = trimmed[0];
  if (!quoteCharacters.has(quote)) return trimmed;

  return trimmed.endsWith(quote) ? trimmed.slice(1, -1) : trimmed;
}

function normalizeD2Label(value: string): string {
  return unquoteText(value)
    .replace(/\\"/gu, `"`)
    .replace(/\\'/gu, "'")
    .trim();
}

function currentGroupPath(state: D2ImporterState): string | undefined {
  return state.activeGroupPaths.at(-1);
}

function rawPathForKey(state: D2ImporterState, key: string): string {
  const normalizedKey = normalizeD2Label(key);
  const activeGroupPath = currentGroupPath(state);

  return activeGroupPath === undefined || normalizedKey.includes(".")
    ? normalizedKey
    : `${activeGroupPath}.${normalizedKey}`;
}

function parentRawPath(rawPath: string): string | undefined {
  const lastDotIndex = rawPath.lastIndexOf(".");
  return lastDotIndex === -1 ? undefined : rawPath.slice(0, lastDotIndex);
}

function addToGroup(
  state: D2ImporterState,
  group: MutableGroup | undefined,
  objectId: string,
): void {
  if (group === undefined || group.contains.has(objectId)) return;

  group.contains.add(objectId);
  group.group.contains.push(objectId);
}

function addObjectToParentGroup(
  state: D2ImporterState,
  rawPath: string,
  objectId: string,
): void {
  const parentPath = parentRawPath(rawPath);
  if (parentPath !== undefined) {
    addToGroup(state, state.groupsByRawPath.get(parentPath), objectId);
    return;
  }

  const activeGroupId = currentGroupPath(state);
  if (activeGroupId === undefined) return;

  addToGroup(state, state.groupsByRawPath.get(activeGroupId), objectId);
}

function createNode(
  state: D2ImporterState,
  rawPath: string,
  label?: string,
): DiagramSpecNode {
  const node: DiagramSpecNode = {
    id: createUniqueStableId(state.usedStableIds, rawPath, "node"),
    label: label ?? rawPath.split(".").at(-1) ?? rawPath,
  };
  state.nodesByRawPath.set(rawPath, node);
  state.nodes.push(node);
  addObjectToParentGroup(state, rawPath, node.id);
  addFidelity(state, {
    kind: "preserved",
    construct: "node",
    message: `Preserved D2 node ${rawPath}.`,
    source: rawPath,
  });
  return node;
}

function ensureNode(
  state: D2ImporterState,
  rawPath: string,
  label?: string,
): DiagramSpecNode {
  const existing = state.nodesByRawPath.get(rawPath);
  if (existing === undefined) return createNode(state, rawPath, label);

  if (label !== undefined && existing.label !== label) {
    existing.label = label;
    addFidelity(state, {
      kind: "preserved",
      construct: "node label",
      message: `Updated D2 node ${rawPath} label.`,
      source: rawPath,
    });
  }

  addObjectToParentGroup(state, rawPath, existing.id);
  return existing;
}

function getOrCreateGroup(
  state: D2ImporterState,
  rawPath: string,
  label?: string,
  source?: string,
): MutableGroup {
  const existing = state.groupsByRawPath.get(rawPath);
  if (existing !== undefined) return existing;

  const mutableGroup: MutableGroup = {
    group: {
      id: createUniqueStableId(state.usedStableIds, rawPath, "group"),
      label: label ?? rawPath.split(".").at(-1) ?? rawPath,
      contains: [],
    },
    contains: new Set<string>(),
  };
  state.groupsByRawPath.set(rawPath, mutableGroup);
  state.groups.push(mutableGroup);
  addObjectToParentGroup(state, rawPath, mutableGroup.group.id);
  addFidelity(state, {
    kind: "preserved",
    construct: "container",
    message: `Preserved D2 container ${rawPath}.`,
    source,
  });
  return mutableGroup;
}

function parseGroupOpen(line: string): { key: string; label?: string } | undefined {
  if (!line.endsWith("{")) return undefined;

  const expression = line.slice(0, -1).trim();
  const separatorIndex = expression.indexOf(":");
  if (separatorIndex === -1) return { key: expression };

  return {
    key: expression.slice(0, separatorIndex).trim(),
    label: normalizeD2Label(expression.slice(separatorIndex + 1)),
  };
}

function importGroupOpen(state: D2ImporterState, line: string): boolean {
  const group = parseGroupOpen(line);
  if (group === undefined) return false;

  const rawPath = rawPathForKey(state, group.key);
  getOrCreateGroup(state, rawPath, group.label, line);
  state.activeGroupPaths.push(rawPath);
  return true;
}

function importGroupClose(state: D2ImporterState, line: string): boolean {
  if (line !== "}") return false;

  if (state.activeGroupPaths.length === 0) {
    addFidelity(state, {
      kind: "dropped",
      construct: "container close",
      message: "Dropped unmatched D2 container close.",
      source: line,
    });
    return true;
  }

  state.activeGroupPaths.pop();
  return true;
}

function importIgnoredBlockLine(state: D2ImporterState, line: string): boolean {
  if (state.ignoredBlockDepth === 0) return false;

  if (line.endsWith("{")) state.ignoredBlockDepth += 1;
  if (line === "}") state.ignoredBlockDepth -= 1;
  return true;
}

function importUnsupportedBlock(state: D2ImporterState, line: string): boolean {
  if (!/^(?:vars|classes)\s*:/iu.test(line)) return false;

  addFidelity(state, {
    kind: "dropped",
    construct: "D2 variable or class",
    message: "Dropped D2 variables or classes.",
    source: line,
  });

  if (line.endsWith("{")) state.ignoredBlockDepth = 1;
  return true;
}

function parseConnection(line: string): ParsedConnection | undefined {
  const match = connectionPattern.exec(line);
  if (match === null) return undefined;

  const operator = match[2];
  return {
    from: match[1].trim(),
    to: match[3].trim(),
    label: parsedConnectionLabel(match[4]),
    directed: isDirectedConnectionOperator(operator),
    reversed: operator === "<-",
    bidirectional: operator === "<->",
  };
}

function parsedConnectionLabel(value: string | undefined): string | undefined {
  if (value === undefined || value.trim() === "") return undefined;
  return normalizeD2Label(value);
}

function isDirectedConnectionOperator(operator: string): boolean {
  return operator === "->" || operator === "<-";
}

function importConnection(state: D2ImporterState, line: string): boolean {
  const connection = parseConnection(line);
  if (connection === undefined) return false;

  const fromPath = rawPathForKey(
    state,
    connection.reversed ? connection.to : connection.from,
  );
  const toPath = rawPathForKey(
    state,
    connection.reversed ? connection.from : connection.to,
  );
  const from = ensureNode(state, fromPath);
  const to = ensureNode(state, toPath);
  state.edges.push(createConnectionEdge(state, from, to, connection));
  addFidelity(state, {
    kind: "preserved",
    construct: "edge",
    message: `Preserved D2 edge ${from.id} to ${to.id}.`,
    source: line,
  });
  reportBidirectionalConnection(state, connection, line);
  return true;
}

function createConnectionEdge(
  state: D2ImporterState,
  from: DiagramSpecNode,
  to: DiagramSpecNode,
  connection: ParsedConnection,
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
  if (connection.label !== undefined) edge.label = connection.label;
  if (!connection.directed) edge.directed = false;
  return edge;
}

function reportBidirectionalConnection(
  state: D2ImporterState,
  connection: ParsedConnection,
  line: string,
): void {
  if (!connection.bidirectional) return;

  addFidelity(state, {
    kind: "approximated",
    construct: "edge direction",
    message: "Imported D2 bidirectional connection as an undirected DiagramPilot edge.",
    source: line,
  });
}

function isAttributeLine(line: string): boolean {
  const key = line.split(":", 1)[0] ?? "";
  return attributePathPattern.test(key);
}

function importAttributeLine(state: D2ImporterState, line: string): boolean {
  if (!isAttributeLine(line)) return false;

  addFidelity(state, {
    kind: "dropped",
    construct: "D2 styling or layout",
    message: "Dropped D2 styling, shape, layout, icon, tooltip, or link syntax.",
    source: line,
  });
  return true;
}

function parseNodeLine(line: string): { key: string; label?: string } | undefined {
  const separatorIndex = line.indexOf(":");
  if (separatorIndex === -1) return { key: line };

  return {
    key: line.slice(0, separatorIndex).trim(),
    label: normalizeD2Label(line.slice(separatorIndex + 1)),
  };
}

function importNodeLine(state: D2ImporterState, line: string): boolean {
  const parsed = parseNodeLine(line);
  if (parsed === undefined || parsed.key === "") return false;

  ensureNode(state, rawPathForKey(state, parsed.key), parsed.label);
  return true;
}

function importFallbackLine(state: D2ImporterState, line: string): void {
  if (line.startsWith("...")) {
    addFidelity(state, {
      kind: "dropped",
      construct: "D2 import",
      message: "Dropped D2 import or spread syntax.",
      source: line,
    });
    return;
  }

  addFidelity(state, {
    kind: "dropped",
    construct: "D2 syntax",
    message: "Dropped unsupported D2 syntax.",
    source: line,
  });
}

type D2LineImporter = (state: D2ImporterState, line: string) => boolean;

const d2LineImporters: D2LineImporter[] = [
  importIgnoredBlockLine,
  importGroupClose,
  importUnsupportedBlock,
  importGroupOpen,
  importConnection,
  importAttributeLine,
  importNodeLine,
];

function importKnownLine(state: D2ImporterState, line: string): boolean {
  for (const importer of d2LineImporters) {
    if (importer(state, line)) return true;
  }

  return false;
}

function importLine(state: D2ImporterState, rawLine: string): void {
  const line = cleanImportLine(rawLine, ["#"]);
  if (line === "") return;
  if (importKnownLine(state, line)) return;

  importFallbackLine(state, line);
}

function createImportedSpec(state: D2ImporterState): DiagramSpec {
  return createImportedDiagramSpec({
    title: state.title,
    direction: "right",
    nodes: state.nodes,
    groups: state.groups.map((item) => item.group),
    edges: state.edges,
  });
}

function createEmptyState(options: ImportD2Options): D2ImporterState {
  return {
    title: options.title ?? "Imported D2 Diagram",
    nodes: [],
    edges: [],
    groups: [],
    nodesByRawPath: new Map(),
    groupsByRawPath: new Map(),
    usedStableIds: new Set(),
    activeGroupPaths: [],
    ignoredBlockDepth: 0,
    fidelity: [],
  };
}

function importD2Lines(state: D2ImporterState, input: string): void {
  for (const line of input.split(/\r\n|\r|\n/u)) {
    importLine(state, line);
  }
}

function importFailureResult(
  message: string,
  fidelity: D2ImportFidelityReport,
): D2ImportResult {
  return {
    ok: false,
    format: "d2",
    message,
    fidelity,
  };
}

function validatedImportResult(
  spec: DiagramSpec,
  fidelity: D2ImportFidelityReport,
): D2ImportResult {
  const validation = validateDiagramSpec(spec);
  if (!validation.ok) {
    return importFailureResult(
      validation.errors[0]?.message ??
        "Imported D2 diagram did not produce a valid DiagramPilot Source File.",
      fidelity,
    );
  }

  return {
    ok: true,
    format: "d2",
    spec,
    fidelity,
  };
}

export function importD2Diagram(
  input: string,
  options: ImportD2Options = {},
): D2ImportResult {
  const state = createEmptyState(options);
  importD2Lines(state, input);

  const fidelity = createImportFidelityReport(state.fidelity);
  if (state.nodes.length === 0 && state.groups.length === 0) {
    return importFailureResult(
      "D2 import did not find any supported nodes or containers.",
      fidelity,
    );
  }

  return validatedImportResult(createImportedSpec(state), fidelity);
}
