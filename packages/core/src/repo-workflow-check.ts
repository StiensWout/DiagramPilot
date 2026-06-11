import type {
  RepoWorkflowConfig,
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
  mapArtifactResult,
  summarizeSources,
} from "./repo-workflow-check-results.js";
import {
  loadRepoWorkflowSource,
  type LoadedRepoWorkflowSource,
} from "./repo-workflow-loaded-source.js";
import {
  deriveRepoWorkflowConfigDisplayPath,
} from "./repo-workflow-paths.js";
import type { DiagramPilotSourceDiscoveryFailure } from "./source-discovery.js";
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

export interface RepoWorkflowCheckDependencies
  extends RepoWorkflowContextDependencies {
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
      scope: RepoWorkflowContext["scope"];
      summary: RepoWorkflowCheckSummary;
      sources: RepoWorkflowCheckSourceResult[];
    }
  | {
      ok: false;
      failure: DiagramPilotSourceDiscoveryFailure | RepoWorkflowConfigFailure;
    };

export async function checkDiagramPilotRepoWorkflowWithDependencies(
  options: RepoWorkflowCheckOptions,
  dependencies: RepoWorkflowCheckDependencies,
): Promise<RepoWorkflowCheckResult> {
  const contextResult = await discoverRepoWorkflowContext(
    options.scopePath,
    dependencies,
  );

  return contextResult.ok
    ? checkRepoWorkflowSources(options, dependencies, contextResult.context)
    : {
        ok: false,
        failure: contextResult.failure,
      };
}

type RepoWorkflowCheckContext = RepoWorkflowContext;

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
  const { artifact } = await checkDefaultSvgArtifactForLoadedSource({
    config: options.context.config,
    currentWorkingDirectory: options.context.currentWorkingDirectory,
    diagramPilotVersion: options.checkOptions.diagramPilotVersion,
    renderer: options.checkOptions.renderer,
    loadedSource,
    checkExpectedSvgArtifactFreshnessForValidatedSource:
      options.dependencies.checkExpectedSvgArtifactFreshnessForValidatedSource,
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
