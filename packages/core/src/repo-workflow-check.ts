import type {
  RepoWorkflowConfig,
  RepoWorkflowConfigDiscoveryResult,
  RepoWorkflowConfigFailure,
} from "./repo-workflow-config.js";
import {
  checkConfiguredArtifactsForValidatedSource,
  configuredExplicitSourcesForScope,
  configuredOutputsForSource,
  configuredSourceDiscoveryOptions,
  mergeDiscoveredAndConfiguredSources,
} from "./repo-workflow-configured-artifacts.js";
import type {
  ConfiguredTextArtifactFormat,
  RepoWorkflowCheckConfiguredArtifactResult,
} from "./repo-workflow-configured-artifact-result.js";
import {
  loadRepoWorkflowSource,
  type LoadedRepoWorkflowSource,
} from "./repo-workflow-loaded-source.js";
import {
  deriveDefaultArtifactDisplayPath,
  deriveRepoWorkflowConfigDisplayPath,
} from "./repo-workflow-paths.js";
import type {
  DiscoveredDiagramPilotSourceFile,
  DiagramPilotSourceDiscoveryFailure,
  DiagramPilotSourceDiscoveryOptions,
  DiagramPilotSourceDiscoveryResult,
  DiagramPilotSourceDiscoveryScope,
} from "./source-discovery.js";
import type {
  DiagramPilotSourceFile,
  RepairableDiagnosticReport,
  ValidatedDiagramSpecLoadFailure,
  ValidatedDiagramSpecLoadResult,
} from "./source-loading.js";
import type { DiagramSpec } from "./diagramspec-topology.js";
import type {
  StaleSvgArtifactResult,
  SvgArtifactFreshnessCheckResult,
  SvgArtifactProvenance,
  SvgArtifactRenderer,
} from "./svg-artifact-freshness.js";

export interface RepoWorkflowCheckOptions {
  scopePath?: string;
  diagramPilotVersion?: string;
  renderer: SvgArtifactRenderer;
  exportConfiguredTextArtifact?(options: {
    format: ConfiguredTextArtifactFormat;
    spec: DiagramSpec;
  }): string;
}

export interface RepoWorkflowCheckDependencies {
  discoverRepoWorkflowConfig?(
    scopePath?: string,
  ): Promise<RepoWorkflowConfigDiscoveryResult>;
  discoverDiagramPilotSourceFiles(
    scopePath?: string,
    options?: DiagramPilotSourceDiscoveryOptions,
  ): Promise<DiagramPilotSourceDiscoveryResult>;
  loadValidatedDiagramSpec(path: string): ValidatedDiagramSpecLoadResult;
  checkExpectedSvgArtifactFreshnessForValidatedSource(options: {
    source: DiagramPilotSourceFile;
    artifactPath?: string;
    provenanceSourcePath: string;
    diagramPilotVersion?: string;
    renderer: SvgArtifactRenderer;
  }): Promise<SvgArtifactFreshnessCheckResult>;
  exportConfiguredTextArtifact?(options: {
    format: ConfiguredTextArtifactFormat;
    spec: DiagramSpec;
  }): string;
  createRepairableDiagnosticReport(
    failure: ValidatedDiagramSpecLoadFailure,
  ): RepairableDiagnosticReport;
  getCurrentWorkingDirectory(): string;
}

export interface RepoWorkflowCheckSummary {
  checkedSourceCount: number;
  freshSourceCount: number;
  issueCount: number;
}

export interface RepoWorkflowCheckSourceResult {
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
  artifact:
    | {
        status: "fresh";
        path: string;
        provenance: SvgArtifactProvenance;
      }
    | {
        status:
          | "missing-artifact"
          | "unreadable-artifact"
          | "malformed-artifact"
          | "missing-provenance";
        path: string;
        message?: string;
      }
    | {
        status: "stale";
        path: string;
        reasons: StaleSvgArtifactResult["reasons"];
        expected: StaleSvgArtifactResult["expected"];
        actual: StaleSvgArtifactResult["actual"];
      }
    | {
        status: "unchecked";
      }
    | RepoWorkflowCheckConfiguredArtifactResult;
  artifacts?: RepoWorkflowCheckConfiguredArtifactResult[];
}

export type RepoWorkflowCheckResult =
  | {
      ok: true;
      config?: {
        path: string;
      };
      scope: DiagramPilotSourceDiscoveryScope;
      summary: RepoWorkflowCheckSummary;
      sources: RepoWorkflowCheckSourceResult[];
    }
  | {
      ok: false;
      failure: DiagramPilotSourceDiscoveryFailure | RepoWorkflowConfigFailure;
    };

function isWorkflowIssue(source: RepoWorkflowCheckSourceResult): boolean {
  if (source.artifacts !== undefined) {
    return (
      source.validation.ok === false ||
      source.artifacts.some((artifact) => artifact.status !== "fresh")
    );
  }

  return source.validation.ok === false || source.artifact.status !== "fresh";
}

function isFreshSource(source: RepoWorkflowCheckSourceResult): boolean {
  if (source.validation.ok === false) {
    return false;
  }

  if (source.artifacts !== undefined) {
    return source.artifacts.every((artifact) => artifact.status === "fresh");
  }

  return source.artifact.status === "fresh";
}

function summarizeSources(
  sources: readonly RepoWorkflowCheckSourceResult[],
): RepoWorkflowCheckSummary {
  return {
    checkedSourceCount: sources.length,
    freshSourceCount: sources.filter(isFreshSource).length,
    issueCount: sources.filter(isWorkflowIssue).length,
  };
}

function mapArtifactResult(
  sourcePath: string,
  artifact: SvgArtifactFreshnessCheckResult,
  currentWorkingDirectory: string,
): RepoWorkflowCheckSourceResult["artifact"] {
  if (artifact.status === "unchecked") {
    return {
      status: "unchecked",
    };
  }

  const artifactPath = deriveDefaultArtifactDisplayPath(
    sourcePath,
    artifact.artifactPath,
    currentWorkingDirectory,
  );

  return mapCheckedArtifactResult(artifact, artifactPath);
}

function mapCheckedArtifactResult(
  artifact: Exclude<SvgArtifactFreshnessCheckResult, { status: "unchecked" }>,
  artifactPath: string,
): RepoWorkflowCheckSourceResult["artifact"] {
  if (artifact.status === "fresh") {
    return {
      status: "fresh",
      path: artifactPath,
      provenance: artifact.provenance,
    };
  }

  if (artifact.status === "stale") {
    return {
      status: "stale",
      path: artifactPath,
      reasons: artifact.reasons,
      expected: artifact.expected,
      actual: artifact.actual,
    };
  }

  if (isMessageArtifactResult(artifact)) {
    return {
      status: artifact.status,
      path: artifactPath,
      message: artifact.message,
    };
  }

  return {
    status: artifact.status,
    path: artifactPath,
  };
}

function isMessageArtifactResult(
  artifact: Exclude<SvgArtifactFreshnessCheckResult, { status: "unchecked" }>,
): artifact is Extract<
  SvgArtifactFreshnessCheckResult,
  { status: "unreadable-artifact" | "malformed-artifact" }
> {
  return (
    artifact.status === "unreadable-artifact" ||
    artifact.status === "malformed-artifact"
  );
}

export async function checkDiagramPilotRepoWorkflowWithDependencies(
  options: RepoWorkflowCheckOptions,
  dependencies: RepoWorkflowCheckDependencies,
): Promise<RepoWorkflowCheckResult> {
  const contextResult = await discoverRepoWorkflowCheckContext(
    options,
    dependencies,
  );

  return contextResult.ok
    ? checkRepoWorkflowSources(options, dependencies, contextResult.context)
    : contextResult.result;
}

interface RepoWorkflowCheckContext {
  config?: RepoWorkflowConfig;
  currentWorkingDirectory: string;
  scope: DiagramPilotSourceDiscoveryScope;
  sources: readonly DiscoveredDiagramPilotSourceFile[];
}

interface RepoWorkflowSourceCheckOptions {
  source: RepoWorkflowCheckContext["sources"][number];
  checkOptions: RepoWorkflowCheckOptions;
  dependencies: RepoWorkflowCheckDependencies;
  context: RepoWorkflowCheckContext;
}

type ConfiguredOutputsForSource = ReturnType<typeof configuredOutputsForSource>;
type LoadedRepoWorkflowSourceSuccess = Extract<
  LoadedRepoWorkflowSource,
  { ok: true }
>;

async function discoverRepoWorkflowCheckContext(
  options: RepoWorkflowCheckOptions,
  dependencies: RepoWorkflowCheckDependencies,
): Promise<
  | {
      ok: true;
      context: RepoWorkflowCheckContext;
    }
  | {
      ok: false;
      result: RepoWorkflowCheckResult;
    }
> {
  const configResult =
    dependencies.discoverRepoWorkflowConfig === undefined
      ? { ok: true as const }
      : await dependencies.discoverRepoWorkflowConfig(options.scopePath);

  if (!configResult.ok) {
    return {
      ok: false,
      result: {
        ok: false,
        failure: configResult.failure,
      },
    };
  }

  const discoveryResult = await dependencies.discoverDiagramPilotSourceFiles(
    options.scopePath,
    configuredSourceDiscoveryOptions(configResult.config),
  );

  if (!discoveryResult.ok) {
    return {
      ok: false,
      result: {
        ok: false,
        failure: discoveryResult.failure,
      },
    };
  }

  const currentWorkingDirectory = dependencies.getCurrentWorkingDirectory();
  const discoveredSources = mergeDiscoveredAndConfiguredSources(
    discoveryResult.sources,
    configuredExplicitSourcesForScope(configResult.config, discoveryResult.scope),
  );

  return {
    ok: true,
    context: {
      config: configResult.config,
      currentWorkingDirectory,
      scope: discoveryResult.scope,
      sources: discoveredSources,
    },
  };
}

function validationFailureSourceResult(loadedSource: {
  sourcePath: string;
  errors: RepoWorkflowCheckSourceResult["validation"]["errors"];
}): RepoWorkflowCheckSourceResult {
  return {
    sourcePath: loadedSource.sourcePath,
    validation: {
      ok: false,
      errors: loadedSource.errors,
    },
    artifact: {
      status: "unchecked",
    },
  };
}

function hasConfiguredOutputsForSource(
  context: RepoWorkflowCheckContext,
  configuredOutputs: ConfiguredOutputsForSource,
): context is RepoWorkflowCheckContext & { config: RepoWorkflowConfig } {
  return configuredOutputs.length > 0 && context.config !== undefined;
}

async function configuredArtifactSourceResult(
  options: RepoWorkflowSourceCheckOptions,
  loadedSource: LoadedRepoWorkflowSourceSuccess,
  configuredOutputs: ConfiguredOutputsForSource,
): Promise<RepoWorkflowCheckSourceResult> {
  const artifacts = await checkConfiguredArtifactsForValidatedSource({
    config: options.context.config as RepoWorkflowConfig,
    source: loadedSource.source,
    sourceAbsolutePath: loadedSource.sourceAbsolutePath,
    provenanceSourcePath: loadedSource.sourcePath,
    spec: loadedSource.spec,
    outputs: configuredOutputs,
    currentWorkingDirectory: options.context.currentWorkingDirectory,
    diagramPilotVersion: options.checkOptions.diagramPilotVersion,
    renderer: options.checkOptions.renderer,
    checkExpectedSvgArtifactFreshnessForValidatedSource:
      options.dependencies.checkExpectedSvgArtifactFreshnessForValidatedSource,
    exportConfiguredTextArtifact:
      options.dependencies.exportConfiguredTextArtifact,
  });
  const [artifact] = artifacts;

  return {
    sourcePath: loadedSource.sourcePath,
    validation: {
      ok: true,
      errors: [],
    },
    artifact: artifact ?? {
      status: "unchecked",
    },
    artifacts,
  };
}

async function defaultSvgArtifactSourceResult(
  options: RepoWorkflowSourceCheckOptions,
  loadedSource: LoadedRepoWorkflowSourceSuccess,
): Promise<RepoWorkflowCheckSourceResult> {
  const artifact =
    await options.dependencies.checkExpectedSvgArtifactFreshnessForValidatedSource({
      source: loadedSource.source,
      provenanceSourcePath: loadedSource.sourcePath,
      diagramPilotVersion: options.checkOptions.diagramPilotVersion,
      renderer: options.checkOptions.renderer,
    });

  return {
    sourcePath: loadedSource.sourcePath,
    validation: {
      ok: true,
      errors: [],
    },
    artifact: mapArtifactResult(
      loadedSource.sourcePath,
      artifact,
      options.context.currentWorkingDirectory,
    ),
  };
}

async function checkRepoWorkflowSource(
  options: RepoWorkflowSourceCheckOptions,
): Promise<RepoWorkflowCheckSourceResult> {
  const loadedSource = loadRepoWorkflowSource({
    source: options.source,
    scope: options.context.scope,
    currentWorkingDirectory: options.context.currentWorkingDirectory,
    dependencies: options.dependencies,
  });

  if (!loadedSource.ok) {
    return validationFailureSourceResult(loadedSource);
  }

  const configuredOutputs = configuredOutputsForSource(
    options.context.config,
    loadedSource.sourceAbsolutePath,
  );

  if (hasConfiguredOutputsForSource(options.context, configuredOutputs)) {
    return configuredArtifactSourceResult(
      options,
      loadedSource,
      configuredOutputs,
    );
  }

  return defaultSvgArtifactSourceResult(options, loadedSource);
}

async function checkRepoWorkflowSources(
  options: RepoWorkflowCheckOptions,
  dependencies: RepoWorkflowCheckDependencies,
  context: RepoWorkflowCheckContext,
): Promise<RepoWorkflowCheckResult> {
  const sources: RepoWorkflowCheckSourceResult[] = [];

  for (const source of context.sources) {
    sources.push(
      await checkRepoWorkflowSource({
        source,
        checkOptions: options,
        dependencies,
        context,
      }),
    );
  }

  return {
    ok: true,
    ...(context.config === undefined
      ? {}
      : {
          config: {
            path: deriveRepoWorkflowConfigDisplayPath(
              context.config.path,
              context.currentWorkingDirectory,
            ),
          },
        }),
    scope: context.scope,
    summary: summarizeSources(sources),
    sources,
  };
}
