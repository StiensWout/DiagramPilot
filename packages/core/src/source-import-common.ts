import type {
  DiagramSpec,
  DiagramSpecDirection,
  DiagramSpecEdge,
  DiagramSpecGroup,
  DiagramSpecNode,
} from "./diagramspec-topology.js";

export type ImportFidelityKind = "preserved" | "approximated" | "dropped";

export interface ImportFidelityDiagnostic {
  kind: ImportFidelityKind;
  construct: string;
  message: string;
  source?: string;
}

export interface ImportFidelitySummary {
  preserved: number;
  approximated: number;
  dropped: number;
}

export interface ImportFidelityReport {
  summary: ImportFidelitySummary;
  diagnostics: ImportFidelityDiagnostic[];
}

export interface ImportedDiagramSpecOptions {
  title: string;
  direction: DiagramSpecDirection;
  nodes: DiagramSpecNode[];
  edges?: DiagramSpecEdge[];
  groups?: DiagramSpecGroup[];
}

export interface ImporterStateBase<TGroup> {
  title: string;
  nodes: DiagramSpecNode[];
  edges: DiagramSpecEdge[];
  groups: TGroup[];
  usedStableIds: Set<string>;
  fidelity: ImportFidelityDiagnostic[];
}

export function createImportFidelityReport(
  diagnostics: ImportFidelityDiagnostic[],
): ImportFidelityReport {
  return {
    summary: {
      preserved: diagnostics.filter((item) => item.kind === "preserved").length,
      approximated: diagnostics.filter((item) => item.kind === "approximated")
        .length,
      dropped: diagnostics.filter((item) => item.kind === "dropped").length,
    },
    diagnostics,
  };
}

export function addImportFidelity(
  state: { fidelity: ImportFidelityDiagnostic[] },
  diagnostic: ImportFidelityDiagnostic,
): void {
  state.fidelity.push(diagnostic);
}

export function cleanImportLine(
  line: string,
  commentMarkers: readonly string[],
): string {
  const markerIndexes = commentMarkers
    .map((marker) => line.indexOf(marker))
    .filter((index) => index !== -1);
  const commentIndex = Math.min(...markerIndexes);
  const uncommented = commentIndex === Infinity ? line : line.slice(0, commentIndex);
  return uncommented.trim().replace(/;$/u, "").trim();
}

function createStableIdBase(value: string, fallbackPrefix: string): string {
  const normalized = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "_")
    .replace(/^_+|_+$/gu, "")
    .replace(/_+/gu, "_");
  const fallback = normalized === "" ? fallbackPrefix : normalized;
  return /^[a-z]/u.test(fallback) ? fallback : `${fallbackPrefix}_${fallback}`;
}

export function createUniqueStableId(
  usedStableIds: Set<string>,
  value: string,
  fallbackPrefix: string,
): string {
  const base = createStableIdBase(value, fallbackPrefix);
  let candidate = base;
  let suffix = 2;

  while (usedStableIds.has(candidate)) {
    candidate = `${base}_${suffix}`;
    suffix += 1;
  }

  usedStableIds.add(candidate);
  return candidate;
}

export function createImportedDiagramSpec(
  options: ImportedDiagramSpecOptions,
): DiagramSpec {
  const spec: DiagramSpec = {
    version: 1,
    title: options.title,
    direction: options.direction,
    nodes: options.nodes,
  };

  setGroupsIfNonEmpty(spec, options.groups);
  setEdgesIfNonEmpty(spec, options.edges);
  return spec;
}

function setGroupsIfNonEmpty(
  target: DiagramSpec,
  groups: DiagramSpecGroup[] | undefined,
): void {
  if (groups !== undefined && groups.length > 0) target.groups = groups;
}

function setEdgesIfNonEmpty(
  target: DiagramSpec,
  edges: DiagramSpecEdge[] | undefined,
): void {
  if (edges !== undefined && edges.length > 0) target.edges = edges;
}
