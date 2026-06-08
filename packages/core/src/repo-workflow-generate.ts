import type {
  RepoWorkflowConfigDiscoveryResult,
  RepoWorkflowConfigFailure,
  RepoWorkflowArtifactOutput,
  RepoWorkflowArtifactOutputFormat,
} from "./repo-workflow-config.js";
import {
  configuredExplicitSourcesForScope,
  configuredOutputsForSource,
  configuredSourceDiscoveryOptions,
  deriveConfiguredArtifactDisplayPath,
  mergeDiscoveredAndConfiguredSources,
  resolveConfiguredOutputPath,
} from "./repo-workflow-configured-artifacts.js";
import type { ConfiguredTextArtifactFormat } from "./repo-workflow-configured-artifact-result.js";
import {
  createMarkdownEmbedContent,
  createMarkdownEmbedReferences,
  type MarkdownEmbedReferencedArtifact,
} from "./repo-workflow-markdown-embed.js";
import { loadRepoWorkflowSource } from "./repo-workflow-loaded-source.js";
import {
  deriveDefaultArtifactDisplayPath,
  deriveRepoWorkflowConfigDisplayPath,
  normalizePathForDisplay,
} from "./repo-workflow-paths.js";
import type { DiagramSpec } from "./diagramspec-topology.js";
import type {
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
import {
  deriveExpectedSvgArtifactPath,
  type SvgArtifactRenderer,
} from "./svg-artifact-freshness.js";

export interface RepoWorkflowGenerateOptions {
  scopePath?: string;
  diagramPilotVersion?: string;
  renderer: SvgArtifactRenderer;
  renderSvgArtifact(options: {
    source: DiagramPilotSourceFile;
    provenanceSourcePath: string;
    spec: DiagramSpec;
    diagramPilotVersion?: string;
    renderer: SvgArtifactRenderer;
  }): Promise<string>;
  rasterizeSvgArtifact(svg: string): Uint8Array;
  exportTextArtifact(options: {
    format: ConfiguredTextArtifactFormat;
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

interface ValidGenerateSource {
  sourcePath: string;
  sourceAbsolutePath: string;
  source: DiagramPilotSourceFile;
  spec: DiagramSpec;
  outputs: readonly RepoWorkflowArtifactOutput[];
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

function isConfiguredTextArtifactFormat(
  format: RepoWorkflowArtifactOutputFormat,
): format is ConfiguredTextArtifactFormat {
  return format === "mermaid" || format === "d2" || format === "dot";
}

async function generateOutputContent(
  options: RepoWorkflowGenerateOptions,
  source: ValidGenerateSource,
  output: RepoWorkflowArtifactOutput,
  absolutePath: string,
  references: readonly MarkdownEmbedReferencedArtifact[],
): Promise<string | Uint8Array> {
  if (output.format === "markdown") {
    return createMarkdownEmbedContent({
      spec: source.spec,
      embedPath: absolutePath,
      references,
    });
  }

  if (output.format === "svg" || output.format === "png") {
    const svg = await options.renderSvgArtifact({
      source: source.source,
      provenanceSourcePath: source.sourcePath,
      spec: source.spec,
      diagramPilotVersion: options.diagramPilotVersion,
      renderer: options.renderer,
    });

    return output.format === "png" ? options.rasterizeSvgArtifact(svg) : svg;
  }

  if (isConfiguredTextArtifactFormat(output.format)) {
    return options.exportTextArtifact({
      format: output.format,
      spec: source.spec,
    });
  }

  throw new Error(`Unsupported configured output format: ${output.format}`);
}

function defaultSvgOutput(source: ValidGenerateSource): RepoWorkflowArtifactOutput {
  return {
    format: "svg",
    path: deriveExpectedSvgArtifactPath(source.sourceAbsolutePath),
  };
}

function outputsInWriteOrder(
  outputs: readonly RepoWorkflowArtifactOutput[],
): RepoWorkflowArtifactOutput[] {
  return [
    ...outputs.filter((output) => output.format !== "markdown"),
    ...outputs.filter((output) => output.format === "markdown"),
  ];
}

export async function generateDiagramPilotRepoWorkflowWithDependencies(
  options: RepoWorkflowGenerateOptions,
  dependencies: RepoWorkflowGenerateDependencies,
): Promise<RepoWorkflowGenerateResult> {
  const configResult =
    dependencies.discoverRepoWorkflowConfig === undefined
      ? { ok: true as const }
      : await dependencies.discoverRepoWorkflowConfig(options.scopePath);

  if (!configResult.ok) {
    return {
      ok: false,
      summary: emptySummary(),
      written: [],
      skipped: [],
      failures: [],
      failure: configResult.failure,
    };
  }

  const discoveryResult = await dependencies.discoverDiagramPilotSourceFiles(
    options.scopePath,
    configuredSourceDiscoveryOptions(configResult.config),
  );

  if (!discoveryResult.ok) {
    return {
      ok: false,
      ...(configResult.config === undefined
        ? {}
        : {
            config: {
              path: deriveRepoWorkflowConfigDisplayPath(
                configResult.config.path,
                dependencies.getCurrentWorkingDirectory(),
              ),
            },
          }),
      summary: emptySummary(),
      written: [],
      skipped: [],
      failures: [],
      failure: discoveryResult.failure,
    };
  }

  const currentWorkingDirectory = dependencies.getCurrentWorkingDirectory();
  const configuredSources = configuredExplicitSourcesForScope(
    configResult.config,
    discoveryResult.scope,
  );
  const discoveredSources = mergeDiscoveredAndConfiguredSources(
    discoveryResult.sources,
    configuredSources,
  );
  const validSources: ValidGenerateSource[] = [];
  const failures: RepoWorkflowGenerateSourceFailure[] = [];

  for (const source of discoveredSources) {
    const loadedSource = loadRepoWorkflowSource({
      source,
      scope: discoveryResult.scope,
      currentWorkingDirectory,
      dependencies,
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
        configResult.config,
        loadedSource.sourceAbsolutePath,
      ),
    });
  }

  const config =
    configResult.config === undefined
      ? undefined
      : {
          path: deriveRepoWorkflowConfigDisplayPath(
            configResult.config.path,
            currentWorkingDirectory,
          ),
        };

  if (failures.length > 0) {
    return {
      ok: false,
      ...(config === undefined ? {} : { config }),
      scope: discoveryResult.scope,
      summary: summarize({
        checkedSourceCount: discoveredSources.length,
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
    const sourceConfig = configResult.config;
    const outputs =
      source.outputs.length > 0 ? source.outputs : [defaultSvgOutput(source)];
    const orderedOutputs = outputsInWriteOrder(outputs);
    const references =
      source.outputs.length > 0 && sourceConfig !== undefined
        ? createMarkdownEmbedReferences({
            outputs,
            resolvePath: (output) =>
              resolveConfiguredOutputPath(
                sourceConfig,
                source.sourceAbsolutePath,
                output,
              ),
          })
        : [];

    for (const output of orderedOutputs) {
      const absolutePath =
        source.outputs.length > 0 && configResult.config !== undefined
          ? resolveConfiguredOutputPath(
              configResult.config,
              source.sourceAbsolutePath,
              output,
            )
          : output.path;
      const displayPath =
        source.outputs.length > 0 && configResult.config !== undefined
          ? normalizePathForDisplay(
              deriveConfiguredArtifactDisplayPath(
                configResult.config.directory,
                absolutePath,
                currentWorkingDirectory,
              ),
            )
          : deriveDefaultArtifactDisplayPath(
              source.sourcePath,
              absolutePath,
              currentWorkingDirectory,
            );

      try {
        const content = await generateOutputContent(
          options,
          source,
          output,
          absolutePath,
          references,
        );

        written.push({
          sourcePath: source.sourcePath,
          format: output.format,
          path: displayPath,
          absolutePath,
          content,
        });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : `Unable to generate ${displayPath}.`;

        return {
          ok: false,
          ...(config === undefined ? {} : { config }),
          scope: discoveryResult.scope,
          summary: summarize({
            checkedSourceCount: discoveredSources.length,
            writtenCount: 0,
            skippedCount: 0,
            failureCount: 1,
          }),
          written: [],
          skipped: [],
          failures: [],
          failure: {
            kind: "generation-failed",
            path: displayPath,
            message: `Unable to generate ${displayPath}: ${message}`,
          },
        };
      }
    }
  }

  return {
    ok: true,
    ...(config === undefined ? {} : { config }),
    scope: discoveryResult.scope,
    summary: summarize({
      checkedSourceCount: discoveredSources.length,
      writtenCount: written.length,
      skippedCount: skipped.length,
      failureCount: 0,
    }),
    written,
    skipped,
    failures: [],
  };
}
