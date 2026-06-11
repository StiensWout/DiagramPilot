import type {
  RepoWorkflowConfig,
  RepoWorkflowConfigDiscoveryResult,
  RepoWorkflowConfigFailure,
  RepoWorkflowArtifactOutput,
  RepoWorkflowArtifactOutputFormat,
} from "./repo-workflow-config.js";
import {
  configuredExplicitSourcesForScope,
  configuredOutputsForSource,
  configuredSourceDiscoveryOptions,
  mergeDiscoveredAndConfiguredSources,
} from "./repo-workflow-configured-artifacts.js";
import type { ConfiguredTextArtifactFormat } from "./repo-workflow-configured-artifact-result.js";
import {
  generateWrittenArtifactsForSource,
  type ValidGenerateSource,
} from "./repo-workflow-generate-output.js";
import { loadRepoWorkflowSource } from "./repo-workflow-loaded-source.js";
import {
  deriveRepoWorkflowConfigDisplayPath,
} from "./repo-workflow-paths.js";
import type { DiagramSpec } from "./diagramspec-topology.js";
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
import type { SvgArtifactRenderer } from "./svg-artifact-freshness.js";

export interface RepoWorkflowGenerateOptions {
  scopePath?: string;
  diagramPilotVersion?: string;
  renderer: SvgArtifactRenderer;
  renderSvgArtifact(options: {
    source: DiagramPilotSourceFile;
    provenanceSourcePath: string;
    profile?: RepoWorkflowArtifactOutput["profile"];
    spec: DiagramSpec;
    diagramPilotVersion?: string;
    renderer: SvgArtifactRenderer;
  }): Promise<string>;
  rasterizeSvgArtifact(svg: string): Uint8Array;
  exportTextArtifact(options: {
    format: ConfiguredTextArtifactFormat;
    profile?: RepoWorkflowArtifactOutput["profile"];
    spec: DiagramSpec;
  }): string;
}

export interface RepoWorkflowGenerateDependencies {
  discoverRepoWorkflowConfig?(
    scopePath?: string,
  ): Promise<RepoWorkflowConfigDiscoveryResult>;
  discoverDiagramPilotSourceFiles(
    scopePath?: string,
    options?: DiagramPilotSourceDiscoveryOptions,
  ): Promise<DiagramPilotSourceDiscoveryResult>;
  loadValidatedDiagramSpec(path: string): ValidatedDiagramSpecLoadResult;
  createRepairableDiagnosticReport(
    failure: ValidatedDiagramSpecLoadFailure,
  ): RepairableDiagnosticReport;
  getCurrentWorkingDirectory(): string;
}

export interface RepoWorkflowGenerateSummary {
  checkedSourceCount: number;
  writtenArtifactCount: number;
  skippedArtifactCount: number;
  failureCount: number;
}

export interface RepoWorkflowGenerateWrittenArtifact {
  sourcePath: string;
  format: RepoWorkflowArtifactOutputFormat;
  path: string;
  absolutePath: string;
  content: string | Uint8Array;
}

export interface RepoWorkflowGenerateSkippedArtifact {
  sourcePath: string;
  format: RepoWorkflowArtifactOutputFormat;
  path: string;
  reason: "unsupported-markdown-output";
  message: string;
}

export interface RepoWorkflowGenerateSourceFailure {
  sourcePath: string;
  errors: RepairableDiagnosticReport["errors"];
}

export interface RepoWorkflowGenerateOperationFailure {
  kind: "generation-failed";
  path: string;
  message: string;
}

export type RepoWorkflowGenerateFailure =
  | DiagramPilotSourceDiscoveryFailure
  | RepoWorkflowConfigFailure
  | RepoWorkflowGenerateOperationFailure;

export type RepoWorkflowGenerateResult =
  | {
      ok: true;
      config?: {
        path: string;
      };
      scope: DiagramPilotSourceDiscoveryScope;
      summary: RepoWorkflowGenerateSummary;
      written: RepoWorkflowGenerateWrittenArtifact[];
      skipped: RepoWorkflowGenerateSkippedArtifact[];
      failures: [];
    }
  | {
      ok: false;
      config?: {
        path: string;
      };
      scope?: DiagramPilotSourceDiscoveryScope;
      summary: RepoWorkflowGenerateSummary;
      written: [];
      skipped: RepoWorkflowGenerateSkippedArtifact[];
      failures: RepoWorkflowGenerateSourceFailure[];
      failure?: RepoWorkflowGenerateFailure;
    };

interface RepoWorkflowResultConfig {
  path: string;
}

interface GenerateSourceCollection {
  validSources: ValidGenerateSource[];
  failures: RepoWorkflowGenerateSourceFailure[];
}

interface GenerateWorkflowContext {
  config?: RepoWorkflowConfig;
  displayConfig?: RepoWorkflowResultConfig;
  currentWorkingDirectory: string;
  scope: DiagramPilotSourceDiscoveryScope;
  discoveredSources: readonly DiscoveredDiagramPilotSourceFile[];
}

function emptySummary(): RepoWorkflowGenerateSummary {
  return {
    checkedSourceCount: 0,
    writtenArtifactCount: 0,
    skippedArtifactCount: 0,
    failureCount: 0,
  };
}

function summarize(options: {
  checkedSourceCount: number;
  writtenCount: number;
  skippedCount: number;
  failureCount: number;
}): RepoWorkflowGenerateSummary {
  return {
    checkedSourceCount: options.checkedSourceCount,
    writtenArtifactCount: options.writtenCount,
    skippedArtifactCount: options.skippedCount,
    failureCount: options.failureCount,
  };
}

function configResultForDisplay(
  configPath: string | undefined,
  currentWorkingDirectory: string,
): RepoWorkflowResultConfig | undefined {
  return configPath === undefined
    ? undefined
    : {
        path: deriveRepoWorkflowConfigDisplayPath(
          configPath,
          currentWorkingDirectory,
        ),
      };
}

function resultConfigFields(config?: RepoWorkflowResultConfig): {
  config?: RepoWorkflowResultConfig;
} {
  return config === undefined ? {} : { config };
}

function collectValidGenerateSources(options: {
  sources: readonly DiscoveredDiagramPilotSourceFile[];
  scope: DiagramPilotSourceDiscoveryScope;
  config?: RepoWorkflowConfig;
  currentWorkingDirectory: string;
  dependencies: RepoWorkflowGenerateDependencies;
}): GenerateSourceCollection {
  const validSources: ValidGenerateSource[] = [];
  const failures: RepoWorkflowGenerateSourceFailure[] = [];

  for (const source of options.sources) {
    const loadedSource = loadRepoWorkflowSource({
      source,
      scope: options.scope,
      currentWorkingDirectory: options.currentWorkingDirectory,
      dependencies: options.dependencies,
    });

    if (!loadedSource.ok) {
      failures.push({
        sourcePath: loadedSource.sourcePath,
        errors: loadedSource.errors,
      });
      continue;
    }

    validSources.push({
      sourcePath: loadedSource.sourcePath,
      sourceAbsolutePath: loadedSource.sourceAbsolutePath,
      source: loadedSource.source,
      spec: loadedSource.spec,
      outputs: configuredOutputsForSource(
        options.config,
        loadedSource.sourceAbsolutePath,
      ),
    });
  }

  return {
    validSources,
    failures,
  };
}

function generationFailureResult(options: {
  config?: RepoWorkflowResultConfig;
  scope: DiagramPilotSourceDiscoveryScope;
  checkedSourceCount: number;
  displayPath: string;
  error: unknown;
}): RepoWorkflowGenerateResult {
  const message =
    options.error instanceof Error
      ? options.error.message
      : `Unable to generate ${options.displayPath}.`;

  return {
    ok: false,
    ...resultConfigFields(options.config),
    scope: options.scope,
    summary: summarize({
      checkedSourceCount: options.checkedSourceCount,
      writtenCount: 0,
      skippedCount: 0,
      failureCount: 1,
    }),
    written: [],
    skipped: [],
    failures: [],
    failure: {
      kind: "generation-failed",
      path: options.displayPath,
      message: `Unable to generate ${options.displayPath}: ${message}`,
    },
  };
}

async function discoverGenerateWorkflowContext(
  options: RepoWorkflowGenerateOptions,
  dependencies: RepoWorkflowGenerateDependencies,
): Promise<
  | {
      ok: true;
      context: GenerateWorkflowContext;
    }
  | {
      ok: false;
      result: RepoWorkflowGenerateResult;
    }
> {
  const configResult = await discoverGenerateWorkflowConfigFile(
    options,
    dependencies,
  );

  if (!configResult.ok) {
    return generateWorkflowConfigFailureResult(configResult.failure);
  }

  const currentWorkingDirectory = dependencies.getCurrentWorkingDirectory();
  const displayConfig = configResultForDisplay(
    configResult.config?.path,
    currentWorkingDirectory,
  );
  const discoveryResult = await dependencies.discoverDiagramPilotSourceFiles(
    options.scopePath,
    configuredSourceDiscoveryOptions(configResult.config),
  );

  if (!discoveryResult.ok) {
    return generateWorkflowDiscoveryFailureResult(
      displayConfig,
      discoveryResult.failure,
    );
  }

  const configuredSources = configuredExplicitSourcesForScope(
    configResult.config,
    discoveryResult.scope,
  );
  const discoveredSources = mergeDiscoveredAndConfiguredSources(
    discoveryResult.sources,
    configuredSources,
  );

  return {
    ok: true,
    context: {
      config: configResult.config,
      displayConfig,
      currentWorkingDirectory,
      scope: discoveryResult.scope,
      discoveredSources,
    },
  };
}

async function discoverGenerateWorkflowConfigFile(
  options: RepoWorkflowGenerateOptions,
  dependencies: RepoWorkflowGenerateDependencies,
) {
  return dependencies.discoverRepoWorkflowConfig === undefined
    ? { ok: true as const }
    : await dependencies.discoverRepoWorkflowConfig(options.scopePath);
}

function generateWorkflowConfigFailureResult(
  failure: RepoWorkflowConfigFailure,
): { ok: false; result: RepoWorkflowGenerateResult } {
  return {
    ok: false,
    result: {
      ok: false,
      summary: emptySummary(),
      written: [],
      skipped: [],
      failures: [],
      failure,
    },
  };
}

function generateWorkflowDiscoveryFailureResult(
  displayConfig: RepoWorkflowResultConfig | undefined,
  failure: RepoWorkflowGenerateFailure,
): { ok: false; result: RepoWorkflowGenerateResult } {
  return {
    ok: false,
    result: {
      ok: false,
      ...resultConfigFields(displayConfig),
      summary: emptySummary(),
      written: [],
      skipped: [],
      failures: [],
      failure,
    },
  };
}

async function generateWorkflowArtifacts(options: {
  generateOptions: RepoWorkflowGenerateOptions;
  dependencies: RepoWorkflowGenerateDependencies;
  context: GenerateWorkflowContext;
}): Promise<RepoWorkflowGenerateResult> {
  const context = options.context;
  const { validSources, failures } = collectValidGenerateSources({
    sources: context.discoveredSources,
    scope: context.scope,
    config: context.config,
    currentWorkingDirectory: context.currentWorkingDirectory,
    dependencies: options.dependencies,
  });

  if (failures.length > 0) {
    return {
      ok: false,
      ...resultConfigFields(context.displayConfig),
      scope: context.scope,
      summary: summarize({
        checkedSourceCount: context.discoveredSources.length,
        writtenCount: 0,
        skippedCount: 0,
        failureCount: failures.length,
      }),
      written: [],
      skipped: [],
      failures,
    };
  }

  const written: RepoWorkflowGenerateWrittenArtifact[] = [];
  const skipped: RepoWorkflowGenerateSkippedArtifact[] = [];

  for (const source of validSources) {
    const sourceResult = await generateWrittenArtifactsForSource({
      generateOptions: options.generateOptions,
      config: context.config,
      source,
      currentWorkingDirectory: context.currentWorkingDirectory,
    });

    if (!sourceResult.ok) {
      return generationFailureResult({
        config: context.displayConfig,
        scope: context.scope,
        checkedSourceCount: context.discoveredSources.length,
        displayPath: sourceResult.displayPath,
        error: sourceResult.error,
      });
    }

    written.push(...sourceResult.written);
  }

  return {
    ok: true,
    ...resultConfigFields(context.displayConfig),
    scope: context.scope,
    summary: summarize({
      checkedSourceCount: context.discoveredSources.length,
      writtenCount: written.length,
      skippedCount: skipped.length,
      failureCount: 0,
    }),
    written,
    skipped,
    failures: [],
  };
}

export async function generateDiagramPilotRepoWorkflowWithDependencies(
  options: RepoWorkflowGenerateOptions,
  dependencies: RepoWorkflowGenerateDependencies,
): Promise<RepoWorkflowGenerateResult> {
  const contextResult = await discoverGenerateWorkflowContext(
    options,
    dependencies,
  );

  return contextResult.ok
    ? generateWorkflowArtifacts({
        generateOptions: options,
        dependencies,
        context: contextResult.context,
      })
    : contextResult.result;
}
