import { createDiagramSpecTopology } from "./diagramspec-topology.js";
import type {
  DiagramSpec,
  DiagramSpecDirection,
  DiagramSpecView,
} from "./diagramspec-topology.js";
import { selectDiagramSpecView } from "./diagramspec-views.js";
import type {
  RepoWorkflowArtifactOutput,
  RepoWorkflowConfigFailure,
} from "./repo-workflow-config.js";
import {
  checkConfiguredArtifactsForValidatedSource,
  configuredOutputsForSource,
} from "./repo-workflow-configured-artifacts.js";
import { checkDefaultSvgArtifactForLoadedSource } from "./repo-workflow-default-svg-artifact.js";
import type {
  ConfiguredTextArtifactFormat,
  RepoWorkflowCheckConfiguredArtifactResult,
} from "./repo-workflow-configured-artifact-result.js";
import {
  discoverRepoWorkflowContext,
  type RepoWorkflowContext,
  type RepoWorkflowContextDependencies,
} from "./repo-workflow-context.js";
import {
  loadRepoWorkflowSource,
  type LoadedRepoWorkflowSource,
} from "./repo-workflow-loaded-source.js";
import { deriveRepoWorkflowConfigDisplayPath } from "./repo-workflow-paths.js";
import type {
  DiagramPilotSourceDiscoveryFailure,
} from "./source-discovery.js";
import type {
  DiagramPilotSourceFile,
  RepairableDiagnosticReport,
  ValidatedDiagramSpecLoadFailure,
  ValidatedDiagramSpecLoadResult,
} from "./source-loading.js";
import type {
  StaleSvgArtifactResult,
  SvgArtifactFreshnessCheckResult,
  SvgArtifactProvenance,
  SvgArtifactRenderer,
} from "./svg-artifact-freshness.js";

export interface RepoWorkflowInspectOptions {
  scopePath?: string;
  diagramPilotVersion?: string;
  renderer: SvgArtifactRenderer;
  exportConfiguredTextArtifact?: ExportConfiguredTextArtifact;
}

type ExportConfiguredTextArtifact = (options: {
  format: ConfiguredTextArtifactFormat;
  profile?: RepoWorkflowArtifactOutput["profile"];
  spec: DiagramSpec;
}) => string;

export interface RepoWorkflowInspectDependencies
  extends RepoWorkflowContextDependencies {
  loadValidatedDiagramSpec(path: string): ValidatedDiagramSpecLoadResult;
  checkExpectedSvgArtifactFreshnessForValidatedSource(options: {
    source: DiagramPilotSourceFile;
    artifactPath?: string;
    provenanceSourcePath: string;
    diagramPilotVersion?: string;
    renderer: SvgArtifactRenderer;
    outputProfile?: RepoWorkflowArtifactOutput["profile"];
  }): Promise<SvgArtifactFreshnessCheckResult>;
  exportConfiguredTextArtifact?: ExportConfiguredTextArtifact;
  createRepairableDiagnosticReport(failure: ValidatedDiagramSpecLoadFailure): RepairableDiagnosticReport;
}

export interface RepoWorkflowInspectDiagramSummary {
  title: string;
  direction: DiagramSpecDirection | null;
  counts: {
    nodes: number;
    edges: number;
    groups: number;
  };
  stableIds: {
    nodes: string[];
    edges: string[];
    groups: string[];
  };
  topology: {
    rootNodeIds: string[];
    rootGroupIds: string[];
    maxDepth: number;
    containmentReferenceCount: number;
  };
  views: RepoWorkflowInspectViewSummary[];
}

export interface RepoWorkflowInspectViewSummary {
  id: string;
  label: string | null;
  description: string | null;
  filters: {
    groups: string[];
    nodes: string[];
    edges: string[];
    nodeKinds: string[];
    edgeKinds: string[];
  };
  counts: {
    nodes: number;
    edges: number;
    groups: number;
  };
}

export type RepoWorkflowInspectArtifactResult =
  | RepoWorkflowCheckConfiguredArtifactResult
  | {
      format: "svg";
      status: "fresh";
      path: string;
      provenance: SvgArtifactProvenance;
    }
  | {
      format: "svg";
      status:
        | "missing-artifact"
        | "unreadable-artifact"
        | "malformed-artifact"
        | "missing-provenance";
      path: string;
      message?: string;
    }
  | {
      format: "svg";
      status: "stale";
      path: string;
      reasons: StaleSvgArtifactResult["reasons"];
      expected: StaleSvgArtifactResult["expected"];
      actual: StaleSvgArtifactResult["actual"];
    }
  | {
      format: "svg";
      status: "unchecked";
      path: string;
      message: string;
    };

export interface RepoWorkflowInspectSourceResult {
  sourcePath: string;
  validation:
    | {
        ok: true;
        errors: [];
      }
    | {
        ok: false;
        errors: RepairableDiagnosticReport["errors"];
      };
  diagram?: RepoWorkflowInspectDiagramSummary;
  artifacts: RepoWorkflowInspectArtifactResult[];
}

export interface RepoWorkflowInspectSummary {
  discoveredSourceCount: number;
  validSourceCount: number;
  invalidSourceCount: number;
  artifactExpectationCount: number;
  artifactIssueCount: number;
}

export type RepoWorkflowInspectResult =
  | {
      ok: true;
      config?: {
        path: string;
      };
      scope: RepoWorkflowContext["scope"];
      summary: RepoWorkflowInspectSummary;
      sources: RepoWorkflowInspectSourceResult[];
    }
  | {
      ok: false;
      failure: DiagramPilotSourceDiscoveryFailure | RepoWorkflowConfigFailure;
    };

type RepoWorkflowInspectContext = RepoWorkflowContext;

interface RepoWorkflowSourceInspectOptions {
  source: RepoWorkflowInspectContext["sources"][number];
  inspectOptions: RepoWorkflowInspectOptions;
  dependencies: RepoWorkflowInspectDependencies;
  context: RepoWorkflowInspectContext;
}

type LoadedRepoWorkflowSourceSuccess = Extract<LoadedRepoWorkflowSource, { ok: true }>;
type InspectEvidenceSvgArtifact = Extract<
  SvgArtifactFreshnessCheckResult,
  {
    status:
      | "missing-artifact"
      | "unreadable-artifact"
      | "malformed-artifact"
      | "missing-provenance";
  }
>;

function inspectDiagram(spec: DiagramSpec): RepoWorkflowInspectDiagramSummary {
  const topology = createDiagramSpecTopology(spec);
  const groups = spec.groups ?? [];
  const edges = spec.edges ?? [];
  const maxDepth = topology.traversal.reduce(
    (highestDepth, entry) => Math.max(highestDepth, entry.depth),
    0,
  );

  return {
    title: spec.title,
    direction: spec.direction ?? null,
    counts: {
      nodes: spec.nodes.length,
      edges: edges.length,
      groups: groups.length,
    },
    stableIds: {
      nodes: spec.nodes.map((node) => node.id),
      edges: edges.map((edge) => edge.id),
      groups: groups.map((group) => group.id),
    },
    topology: {
      rootNodeIds: topology.rootNodes.map((node) => node.id),
      rootGroupIds: topology.rootGroups.map((group) => group.id),
      maxDepth,
      containmentReferenceCount: topology.containmentReferences.length,
    },
    views: inspectViews(spec),
  };
}

function viewFilterValues(
  view: DiagramSpecView,
  field: keyof RepoWorkflowInspectViewSummary["filters"],
): string[] {
  return [...(view[field] ?? [])];
}

function inspectViews(spec: DiagramSpec): RepoWorkflowInspectViewSummary[] {
  return (spec.views ?? []).map((view) => {
    const projection = selectDiagramSpecView(spec, view.id);
    const counts = projection.ok
      ? projection.counts
      : { nodes: 0, edges: 0, groups: 0 };

    return {
      id: view.id,
      label: view.label ?? null,
      description: view.description ?? null,
      filters: {
        groups: viewFilterValues(view, "groups"),
        nodes: viewFilterValues(view, "nodes"),
        edges: viewFilterValues(view, "edges"),
        nodeKinds: viewFilterValues(view, "nodeKinds"),
        edgeKinds: viewFilterValues(view, "edgeKinds"),
      },
      counts,
    };
  });
}

function mapInspectSvgArtifactResult(
  artifact: SvgArtifactFreshnessCheckResult,
  path: string,
): RepoWorkflowInspectArtifactResult {
  if (artifact.status === "fresh") {
    return {
      format: "svg",
      status: "fresh",
      path,
      provenance: artifact.provenance,
    };
  }

  if (artifact.status === "stale") {
    return {
      format: "svg",
      status: "stale",
      path,
      reasons: artifact.reasons,
      expected: artifact.expected,
      actual: artifact.actual,
    };
  }

  if (artifact.status === "unchecked") {
    return {
      format: "svg",
      status: "unchecked",
      path,
      message: "SVG artifact freshness was not checked.",
    };
  }

  return mapInspectEvidenceSvgArtifactResult(artifact, path);
}

function mapInspectEvidenceSvgArtifactResult(
  artifact: InspectEvidenceSvgArtifact,
  path: string,
): RepoWorkflowInspectArtifactResult {
  return {
    format: "svg",
    status: artifact.status,
    path,
    ...("message" in artifact ? { message: artifact.message } : {}),
  };
}

async function inspectDefaultSvgArtifact(
  options: RepoWorkflowSourceInspectOptions,
  loadedSource: LoadedRepoWorkflowSourceSuccess,
): Promise<RepoWorkflowInspectArtifactResult[]> {
  const { artifact, plannedOutput } = await checkDefaultSvgArtifactForLoadedSource({
    config: options.context.config,
    currentWorkingDirectory: options.context.currentWorkingDirectory,
    diagramPilotVersion: options.inspectOptions.diagramPilotVersion,
    renderer: options.inspectOptions.renderer,
    loadedSource,
    checkExpectedSvgArtifactFreshnessForValidatedSource:
      options.dependencies.checkExpectedSvgArtifactFreshnessForValidatedSource,
  });

  return [mapInspectSvgArtifactResult(artifact, plannedOutput.displayPath)];
}

async function inspectConfiguredArtifacts(
  options: RepoWorkflowSourceInspectOptions,
  loadedSource: LoadedRepoWorkflowSourceSuccess,
  configuredOutputs: ReturnType<typeof configuredOutputsForSource>,
): Promise<RepoWorkflowInspectArtifactResult[]> {
  if (options.context.config === undefined) {
    return [];
  }

  return checkConfiguredArtifactsForValidatedSource({
    config: options.context.config,
    source: loadedSource.source,
    sourceAbsolutePath: loadedSource.sourceAbsolutePath,
    provenanceSourcePath: loadedSource.sourcePath,
    spec: loadedSource.spec,
    outputs: configuredOutputs,
    currentWorkingDirectory: options.context.currentWorkingDirectory,
    diagramPilotVersion: options.inspectOptions.diagramPilotVersion,
    renderer: options.inspectOptions.renderer,
    checkExpectedSvgArtifactFreshnessForValidatedSource:
      options.dependencies.checkExpectedSvgArtifactFreshnessForValidatedSource,
    exportConfiguredTextArtifact:
      options.dependencies.exportConfiguredTextArtifact,
  });
}

async function inspectValidSource(
  options: RepoWorkflowSourceInspectOptions,
  loadedSource: LoadedRepoWorkflowSourceSuccess,
): Promise<RepoWorkflowInspectSourceResult> {
  const configuredOutputs = configuredOutputsForSource(
    options.context.config,
    loadedSource.sourceAbsolutePath,
  );
  const artifacts =
    configuredOutputs.length > 0
      ? await inspectConfiguredArtifacts(options, loadedSource, configuredOutputs)
      : await inspectDefaultSvgArtifact(options, loadedSource);

  return {
    sourcePath: loadedSource.sourcePath,
    validation: {
      ok: true,
      errors: [],
    },
    diagram: inspectDiagram(loadedSource.spec),
    artifacts,
  };
}

async function inspectSource(
  options: RepoWorkflowSourceInspectOptions,
): Promise<RepoWorkflowInspectSourceResult> {
  const loadedSource = loadRepoWorkflowSource({
    source: options.source,
    scope: options.context.scope,
    currentWorkingDirectory: options.context.currentWorkingDirectory,
    dependencies: options.dependencies,
  });

  if (!loadedSource.ok) {
    return {
      sourcePath: loadedSource.sourcePath,
      validation: { ok: false, errors: loadedSource.errors },
      artifacts: [],
    };
  }

  return inspectValidSource(options, loadedSource);
}

function isArtifactIssue(artifact: RepoWorkflowInspectArtifactResult): boolean {
  return artifact.status !== "fresh";
}

function summarizeInspectSources(
  sources: readonly RepoWorkflowInspectSourceResult[],
): RepoWorkflowInspectSummary {
  const artifacts = sources.flatMap((source) => source.artifacts);
  const validSourceCount = sources.filter((source) => source.validation.ok).length;

  return {
    discoveredSourceCount: sources.length,
    validSourceCount,
    invalidSourceCount: sources.length - validSourceCount,
    artifactExpectationCount: artifacts.length,
    artifactIssueCount: artifacts.filter(isArtifactIssue).length,
  };
}

export async function inspectDiagramPilotRepoWorkflowWithDependencies(
  options: RepoWorkflowInspectOptions,
  dependencies: RepoWorkflowInspectDependencies,
): Promise<RepoWorkflowInspectResult> {
  const contextResult = await discoverRepoWorkflowContext(
    options.scopePath,
    dependencies,
  );

  if (!contextResult.ok) {
    return {
      ok: false,
      failure: contextResult.failure,
    };
  }

  const sources: RepoWorkflowInspectSourceResult[] = [];

  for (const source of contextResult.context.sources) {
    sources.push(
      await inspectSource({
        source,
        inspectOptions: options,
        dependencies,
        context: contextResult.context,
      }),
    );
  }

  return {
    ok: true,
    ...(contextResult.context.config === undefined
      ? {}
      : {
          config: {
            path: deriveRepoWorkflowConfigDisplayPath(
              contextResult.context.config.path,
              contextResult.context.currentWorkingDirectory,
            ),
          },
        }),
    scope: contextResult.context.scope,
    summary: summarizeInspectSources(sources),
    sources,
  };
}
