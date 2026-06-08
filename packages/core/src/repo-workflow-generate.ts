import path from "node:path";

import type {
  RepoWorkflowConfigDiscoveryResult,
  RepoWorkflowConfigFailure,
  RepoWorkflowArtifactOutput,
  RepoWorkflowArtifactOutputFormat,
} from "./repo-workflow-config.js";
import {
  configuredExplicitSourcesForScope,
  configuredOutputsForSource,
  deriveConfiguredArtifactDisplayPath,
  mergeDiscoveredAndConfiguredSources,
  resolveConfiguredOutputPath,
} from "./repo-workflow-configured-artifacts.js";
import type { ConfiguredTextArtifactFormat } from "./repo-workflow-configured-artifact-result.js";
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

function normalizePathForDisplay(filePath: string): string {
  return filePath.split(path.sep).join("/");
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

function deriveSourcePath(
  scope: DiagramPilotSourceDiscoveryScope,
  absolutePath: string,
  relativePath: string,
  currentWorkingDirectory: string,
): string {
  if (scope.kind === "directory") {
    return relativePath;
  }

  return normalizePathForDisplay(
    path.relative(currentWorkingDirectory, absolutePath),
  );
}

function deriveArtifactDisplayPath(
  sourcePath: string,
  artifactPath: string,
  currentWorkingDirectory: string,
): string {
  const relativeArtifactPath = normalizePathForDisplay(
    path.relative(currentWorkingDirectory, artifactPath),
  );

  if (!relativeArtifactPath.startsWith("..")) {
    return relativeArtifactPath;
  }

  return sourcePath.replace(/\.dp\.(yaml|json)$/iu, ".svg");
}

function deriveConfigDisplayPath(
  configPath: string,
  currentWorkingDirectory: string,
): string {
  const relativeConfigPath = path.relative(currentWorkingDirectory, configPath);

  if (
    relativeConfigPath !== "" &&
    !relativeConfigPath.startsWith("..") &&
    !path.isAbsolute(relativeConfigPath)
  ) {
    return normalizePathForDisplay(relativeConfigPath);
  }

  return normalizePathForDisplay(configPath);
}

function isConfiguredTextArtifactFormat(
  format: RepoWorkflowArtifactOutputFormat,
): format is ConfiguredTextArtifactFormat {
  return format === "mermaid" || format === "d2" || format === "dot";
}

async function generateOutputContent(
  options: RepoWorkflowGenerateOptions,
  source: ValidGenerateSource,
  format: RepoWorkflowArtifactOutputFormat,
): Promise<string | Uint8Array | undefined> {
  if (format === "markdown") {
    return undefined;
  }

  if (format === "svg" || format === "png") {
    const svg = await options.renderSvgArtifact({
      source: source.source,
      provenanceSourcePath: source.sourcePath,
      spec: source.spec,
      diagramPilotVersion: options.diagramPilotVersion,
      renderer: options.renderer,
    });

    return format === "png" ? options.rasterizeSvgArtifact(svg) : svg;
  }

  if (isConfiguredTextArtifactFormat(format)) {
    return options.exportTextArtifact({
      format,
      spec: source.spec,
    });
  }

  return undefined;
}

function defaultSvgOutput(source: ValidGenerateSource): RepoWorkflowArtifactOutput {
  return {
    format: "svg",
    path: deriveExpectedSvgArtifactPath(source.sourceAbsolutePath),
  };
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
    configResult.config === undefined
      ? undefined
      : {
          ignorePatterns: configResult.config.sources.ignore,
          ignorePatternsRoot: configResult.config.directory,
        },
  );

  if (!discoveryResult.ok) {
    return {
      ok: false,
      ...(configResult.config === undefined
        ? {}
        : {
            config: {
              path: deriveConfigDisplayPath(
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
    const sourcePath = deriveSourcePath(
      discoveryResult.scope,
      source.absolutePath,
      source.relativePath,
      currentWorkingDirectory,
    );
    const loadResult = dependencies.loadValidatedDiagramSpec(source.absolutePath);

    if (!loadResult.ok) {
      const report = dependencies.createRepairableDiagnosticReport(
        loadResult.failure,
      );

      failures.push({
        sourcePath,
        errors: report.errors,
      });
      continue;
    }

    validSources.push({
      sourcePath,
      sourceAbsolutePath: source.absolutePath,
      source: loadResult.source,
      spec: loadResult.spec,
      outputs: configuredOutputsForSource(
        configResult.config,
        source.absolutePath,
      ),
    });
  }

  const config =
    configResult.config === undefined
      ? undefined
      : {
          path: deriveConfigDisplayPath(
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
    const outputs =
      source.outputs.length > 0 ? source.outputs : [defaultSvgOutput(source)];

    for (const output of outputs) {
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
          : deriveArtifactDisplayPath(
              source.sourcePath,
              absolutePath,
              currentWorkingDirectory,
            );

      try {
        const content = await generateOutputContent(options, source, output.format);

        if (content === undefined) {
          skipped.push({
            sourcePath: source.sourcePath,
            format: output.format,
            path: displayPath,
            reason: "unsupported-markdown-output",
            message:
              "Configured Markdown embed generation is handled by a later repo workflow capability.",
          });
          continue;
        }

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
