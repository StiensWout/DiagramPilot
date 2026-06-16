import type {
  DiagramSpec,
  DiagramSpecEdge,
  DiagramSpecMetadata,
  DiagramSpecNode,
} from "./diagramspec-topology.js";
import type { RepoDiscoverySummary } from "./repo-discovery.js";

export interface DiscoverSourceUpdateChangeSummary {
  added: number;
  removed: number;
  changed: number;
  unmatched: number;
}

export interface DiscoverSourceUpdateResult {
  changes: DiscoverSourceUpdateChangeSummary;
  spec: DiagramSpec;
}

export interface CodeDiscoverySourceOptions {
  includeFunctions: boolean;
}

type CodeSummary = Extract<RepoDiscoverySummary, { target: "code" }>;
type CodeFunction = NonNullable<CodeSummary["functions"]>[number];
type CodeModule = CodeSummary["modules"][number];
type InternalImport = CodeSummary["importEdges"][number] & {
  kind: "internal";
  to: string;
};
type Keyed = { id: string };
type Keyer<T extends Keyed> = (item: T) => string | undefined;
type Remapper<T extends Keyed> = (item: T, id: string) => T;

const sourceGlob = "**/*.{js,jsx,ts,tsx,mts,cts}";

function token(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/gu, "_")
      .replace(/^_+|_+$/gu, "") || "unknown"
  );
}

function uniqueId(base: string, seen: Map<string, number>): string {
  const count = seen.get(base) ?? 0;
  seen.set(base, count + 1);
  return count === 0 ? base : `${base}_${count + 1}`;
}

function moduleId(modulePath: string): string {
  return `file_${token(modulePath)}`;
}

function moduleNode(module: CodeModule): DiagramSpecNode {
  return {
    id: moduleId(module.path),
    label: module.path,
    kind: "module",
    metadata: { source: module.path },
  };
}

function internalImports(result: CodeSummary): readonly InternalImport[] {
  return result.importEdges.filter(
    (edge): edge is InternalImport =>
      edge.kind === "internal" && edge.to !== null,
  );
}

function moduleEdges(result: CodeSummary): DiagramSpecEdge[] {
  const seen = new Map<string, number>();

  return internalImports(result).map((edge) => {
    const from = moduleId(edge.from);
    const to = moduleId(edge.to);

    return {
      id: uniqueId(`import_${from}_to_${to}`, seen),
      from,
      to,
      label: edge.specifier,
      kind: "dependency",
      metadata: {
        source: edge.from,
        importSpecifier: edge.specifier,
      },
    };
  });
}

function functionNode(codeFunction: CodeFunction): DiagramSpecNode {
  return {
    id: codeFunction.id,
    label: codeFunction.name,
    kind: "function",
    metadata: {
      source: codeFunction.source,
      module: codeFunction.path,
      exported: codeFunction.exported,
    },
  };
}

function functionEdges(result: CodeSummary): DiagramSpecEdge[] {
  const seen = new Map<string, number>();

  return (result.functionCallEdges ?? []).map((edge) => ({
    id: uniqueId(`call_${edge.from}_to_${edge.to}`, seen),
    from: edge.from,
    to: edge.to,
    label: edge.callee,
    kind: "dependency",
    metadata: {
      source: edge.source,
      call: edge.callee,
    },
  }));
}

export function createCodeDiscoveryDiagramSpec(
  options: CodeDiscoverySourceOptions,
  result: CodeSummary,
): DiagramSpec {
  return options.includeFunctions
    ? {
        version: 1,
        title: "Function Map",
        direction: "right",
        nodes: (result.functions ?? []).map(functionNode),
        edges: functionEdges(result),
        metadata: {
          source: sourceGlob,
          generatedBy: "diagrampilot discover code --include-functions",
        },
      }
    : {
        version: 1,
        title: "Codebase Map",
        direction: "right",
        nodes: result.modules.map(moduleNode),
        edges: moduleEdges(result),
        metadata: {
          source: sourceGlob,
          generatedBy: "diagrampilot discover code",
        },
      };
}

function metadataString(
  metadata: DiagramSpecMetadata | undefined,
  key: string,
): string | undefined {
  const value = metadata?.[key];
  return typeof value === "string" ? value : undefined;
}

function nodeKey(node: DiagramSpecNode): string | undefined {
  const modulePath = metadataString(node.metadata, "module");
  if (node.kind === "function" && modulePath !== undefined) {
    return `function:${modulePath}:${node.label}`;
  }

  return packageOrSourceNodeKey(node.metadata);
}

function packageOrSourceNodeKey(
  metadata: DiagramSpecMetadata | undefined,
): string | undefined {
  const packageName =
    metadataString(metadata, "packageName") ?? metadataString(metadata, "package");
  if (packageName !== undefined) return `package:${packageName}`;

  const source = metadataString(metadata, "source");
  return source === undefined ? undefined : `source:${source}`;
}

function nodeKeysById(nodes: readonly DiagramSpecNode[]): ReadonlyMap<string, string> {
  const byId = new Map<string, string>();

  for (const node of nodes) {
    const key = nodeKey(node);
    if (key !== undefined) byId.set(node.id, key);
  }

  return byId;
}

function edgeKey(
  edge: DiagramSpecEdge,
  nodeKeys: ReadonlyMap<string, string>,
): string | undefined {
  const from = nodeKeys.get(edge.from);
  const to = nodeKeys.get(edge.to);
  if (from === undefined || to === undefined) return undefined;

  return edgeKeyForResolvedEndpoints(edge, from, to);
}

function edgeKeyForResolvedEndpoints(
  edge: DiagramSpecEdge,
  from: string,
  to: string,
): string {
  const scopedKey = [
    scopedMetadataEdgeKey(edge, from, to, "importSpecifier", "import"),
    scopedMetadataEdgeKey(edge, from, to, "call", "call"),
  ].find((key) => key !== undefined);

  return scopedKey ?? `edge:${from}->${to}:${edge.kind ?? ""}:${edge.label ?? ""}`;
}

function scopedMetadataEdgeKey(
  edge: DiagramSpecEdge,
  from: string,
  to: string,
  metadataKey: string,
  keyPrefix: string,
): string | undefined {
  const value = metadataString(edge.metadata, metadataKey);
  return value === undefined ? undefined : `${keyPrefix}:${from}->${to}:${value}`;
}

function counts<T extends Keyed>(
  items: readonly T[],
  keyForItem: Keyer<T>,
): ReadonlyMap<string, number> {
  const result = new Map<string, number>();

  for (const item of items) {
    const key = keyForItem(item);
    if (key !== undefined) result.set(key, (result.get(key) ?? 0) + 1);
  }

  return result;
}

function uniqueExisting<T extends Keyed>(options: {
  existing: readonly T[];
  existingCounts: ReadonlyMap<string, number>;
  existingKey: Keyer<T>;
  nextCounts: ReadonlyMap<string, number>;
}): ReadonlyMap<string, T> {
  const result = new Map<string, T>();

  for (const item of options.existing) {
    const key = options.existingKey(item);
    if (isUniqueUpdateKey(key, options.existingCounts, options.nextCounts)) {
      result.set(key, item);
    }
  }

  return result;
}

function isUniqueUpdateKey(
  key: string | undefined,
  existingCounts: ReadonlyMap<string, number>,
  nextCounts: ReadonlyMap<string, number>,
): key is string {
  return (
    key !== undefined &&
    existingCounts.get(key) === 1 &&
    nextCounts.get(key) === 1
  );
}

function changed(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) !== JSON.stringify(right);
}

function addChanges(
  left: DiscoverSourceUpdateChangeSummary,
  right: DiscoverSourceUpdateChangeSummary,
): DiscoverSourceUpdateChangeSummary {
  return {
    added: left.added + right.added,
    removed: left.removed + right.removed,
    changed: left.changed + right.changed,
    unmatched: left.unmatched + right.unmatched,
  };
}

function updateItems<T extends Keyed>(options: {
  existing: readonly T[];
  existingKey: Keyer<T>;
  next: readonly T[];
  nextKey: Keyer<T>;
  remap: Remapper<T>;
}): {
  changes: DiscoverSourceUpdateChangeSummary;
  items: T[];
  remappedIds: ReadonlyMap<string, string>;
} {
  const existingByKey = uniqueExisting({
    existing: options.existing,
    existingCounts: counts(options.existing, options.existingKey),
    existingKey: options.existingKey,
    nextCounts: counts(options.next, options.nextKey),
  });
  const matched = new Set<string>();
  const remappedIds = new Map<string, string>();
  const changes = { added: 0, removed: 0, changed: 0, unmatched: 0 };
  const items = options.next.map((item) => {
    const key = options.nextKey(item);
    const existing = key === undefined ? undefined : existingByKey.get(key);

    if (existing === undefined) {
      changes.added += 1;
      changes.unmatched += 1;
      remappedIds.set(item.id, item.id);
      return item;
    }

    matched.add(existing.id);
    remappedIds.set(item.id, existing.id);

    const nextItem = options.remap(item, existing.id);
    if (changed(existing, nextItem)) changes.changed += 1;
    return nextItem;
  });

  for (const item of options.existing) {
    if (!matched.has(item.id)) changes.removed += 1;
  }

  return { changes, items, remappedIds };
}

function remapNode(node: DiagramSpecNode, id: string): DiagramSpecNode {
  return { ...node, id };
}

function remapEdge(
  edge: DiagramSpecEdge,
  id: string,
  nodeIds: ReadonlyMap<string, string>,
): DiagramSpecEdge {
  return {
    ...edge,
    id,
    from: nodeIds.get(edge.from) ?? edge.from,
    to: nodeIds.get(edge.to) ?? edge.to,
  };
}

export function applyDiscoverSourceUpdate(
  existingSpec: DiagramSpec,
  nextSpec: DiagramSpec,
): DiscoverSourceUpdateResult {
  const nodeUpdate = updateItems({
    existing: existingSpec.nodes,
    existingKey: nodeKey,
    next: nextSpec.nodes,
    nextKey: nodeKey,
    remap: remapNode,
  });
  const existingNodeKeys = nodeKeysById(existingSpec.nodes);
  const nextNodeKeys = nodeKeysById(nextSpec.nodes);
  const edgeUpdate = updateItems({
    existing: existingSpec.edges ?? [],
    existingKey: (edge) => edgeKey(edge, existingNodeKeys),
    next: nextSpec.edges ?? [],
    nextKey: (edge) => edgeKey(edge, nextNodeKeys),
    remap: (edge, id) => remapEdge(edge, id, nodeUpdate.remappedIds),
  });

  return {
    changes: addChanges(nodeUpdate.changes, edgeUpdate.changes),
    spec: {
      ...nextSpec,
      nodes: nodeUpdate.items,
      edges: edgeUpdate.items,
    },
  };
}
