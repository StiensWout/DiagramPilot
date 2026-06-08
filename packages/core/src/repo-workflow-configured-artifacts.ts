import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import path from "node:path";

import type { DiagramSpec } from "./diagramspec-topology.js";
import type {
  RepoWorkflowArtifactMapping,
  RepoWorkflowArtifactOutput,
  RepoWorkflowArtifactOutputFormat,
  RepoWorkflowConfig,
} from "./repo-workflow-config.js";
import type {
  ConfiguredTextArtifactFormat,
  RepoWorkflowCheckConfiguredArtifactResult,
} from "./repo-workflow-configured-artifact-result.js";
import type {
  DiagramPilotSourceDiscoveryScope,
  DiscoveredDiagramPilotSourceFile,
} from "./source-discovery.js";
import type { DiagramPilotSourceFile } from "./source-loading.js";
import type {
  SvgArtifactFreshnessCheckResult,
  SvgArtifactRenderer,
} from "./svg-artifact-freshness.js";

export interface CheckConfiguredArtifactsForValidatedSourceOptions {
  config: RepoWorkflowConfig;
  source: DiagramPilotSourceFile;
  sourceAbsolutePath: string;
  provenanceSourcePath: string;
  spec: DiagramSpec;
  outputs: readonly RepoWorkflowArtifactOutput[];
  currentWorkingDirectory: string;
  diagramPilotVersion?: string;
  renderer: SvgArtifactRenderer;
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
}

function normalizePathForDisplay(filePath: string): string {
  return filePath.split(path.sep).join("/");
}

export function deriveConfiguredArtifactDisplayPath(
  configDirectory: string,
  artifactPath: string,
  currentWorkingDirectory: string,
): string {
  const relativeArtifactPath = normalizePathForDisplay(
    path.relative(currentWorkingDirectory, artifactPath),
  );

  if (!relativeArtifactPath.startsWith("..")) {
    return relativeArtifactPath;
  }

  return normalizePathForDisplay(path.relative(configDirectory, artifactPath));
}

function configRelativePath(configDirectory: string, absolutePath: string): string {
  return normalizePathForDisplay(path.relative(configDirectory, absolutePath));
}

function sourceStem(sourcePath: string): string {
  return path.posix.basename(sourcePath).replace(/\.dp\.yaml$/iu, "");
}

function sourceDirectory(sourcePath: string): string {
  const directory = path.posix.dirname(sourcePath);

  return directory === "." ? "" : directory;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function normalizeGlobPattern(pattern: string): string {
  return pattern
    .replace(/\\/gu, "/")
    .replace(/^\.\//u, "")
    .replace(/\/$/u, "/**");
}

function globPatternToRegExp(pattern: string): RegExp {
  const expression = normalizeGlobPattern(pattern)
    .split("/")
    .map((segment) => {
      if (segment === "**") {
        return ".*";
      }

      return escapeRegExp(segment)
        .replace(/\\\*/gu, "[^/]*")
        .replace(/\\\?/gu, "[^/]");
    })
    .join("/");

  return new RegExp(`^${expression}$`, "u");
}

export function resolveConfiguredOutputPath(
  config: RepoWorkflowConfig,
  sourceAbsolutePath: string,
  output: RepoWorkflowArtifactOutput,
): string {
  const sourcePath = configRelativePath(config.directory, sourceAbsolutePath);
  const values = {
    stem: sourceStem(sourcePath),
    sourceDir: sourceDirectory(sourcePath),
    sourcePath,
    format: output.format,
  };
  const resolvedPath = output.path.replace(
    /\{(?<variable>stem|sourceDir|sourcePath|format)\}/gu,
    (_match, variable: keyof typeof values) => values[variable],
  );

  return path.resolve(config.directory, resolvedPath);
}

function mappingMatchesSource(
  config: RepoWorkflowConfig,
  mapping: RepoWorkflowArtifactMapping,
  sourceAbsolutePath: string,
): boolean {
  if (mapping.source !== undefined) {
    return path.resolve(config.directory, mapping.source) === sourceAbsolutePath;
  }

  if (mapping.sourceGlob !== undefined) {
    return globPatternToRegExp(mapping.sourceGlob).test(
      configRelativePath(config.directory, sourceAbsolutePath),
    );
  }

  return false;
}

export function configuredOutputsForSource(
  config: RepoWorkflowConfig | undefined,
  sourceAbsolutePath: string,
): readonly RepoWorkflowArtifactOutput[] {
  if (config === undefined) {
    return [];
  }

  for (const mapping of config.artifacts) {
    if (mappingMatchesSource(config, mapping, sourceAbsolutePath)) {
      return mapping.outputs;
    }
  }

  return [];
}

function isPathInsideDirectory(directory: string, filePath: string): boolean {
  const relativePath = path.relative(directory, filePath);

  return (
    relativePath === "" ||
    (!relativePath.startsWith("..") && !path.isAbsolute(relativePath))
  );
}

function isExplicitSourceInScope(
  sourceAbsolutePath: string,
  scope: DiagramPilotSourceDiscoveryScope,
): boolean {
  const scopePath = path.resolve(scope.path);

  if (scope.kind === "file") {
    return sourceAbsolutePath === scopePath;
  }

  return isPathInsideDirectory(scopePath, sourceAbsolutePath);
}

export function configuredExplicitSourcesForScope(
  config: RepoWorkflowConfig | undefined,
  scope: DiagramPilotSourceDiscoveryScope,
): DiscoveredDiagramPilotSourceFile[] {
  if (config === undefined) {
    return [];
  }

  const sources: DiscoveredDiagramPilotSourceFile[] = [];

  for (const mapping of config.artifacts) {
    if (mapping.source === undefined) {
      continue;
    }

    const absolutePath = path.resolve(config.directory, mapping.source);

    if (!isExplicitSourceInScope(absolutePath, scope)) {
      continue;
    }

    const relativePath =
      scope.kind === "directory"
        ? normalizePathForDisplay(path.relative(scope.path, absolutePath))
        : normalizePathForDisplay(path.basename(absolutePath));

    sources.push({
      absolutePath,
      relativePath,
    });
  }

  return sources;
}

export function mergeDiscoveredAndConfiguredSources(
  discoveredSources: readonly DiscoveredDiagramPilotSourceFile[],
  configuredSources: readonly DiscoveredDiagramPilotSourceFile[],
): DiscoveredDiagramPilotSourceFile[] {
  const sourcesByPath = new Map<string, DiscoveredDiagramPilotSourceFile>();

  for (const source of [...discoveredSources, ...configuredSources]) {
    sourcesByPath.set(path.resolve(source.absolutePath), source);
  }

  return [...sourcesByPath.values()].sort((left, right) =>
    left.relativePath.localeCompare(right.relativePath),
  );
}

function isConfiguredTextArtifactFormat(
  format: RepoWorkflowArtifactOutputFormat,
): format is ConfiguredTextArtifactFormat {
  return format === "mermaid" || format === "d2" || format === "dot";
}

function sha256(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

function checkConfiguredPresenceOnlyArtifact(options: {
  format: RepoWorkflowArtifactOutputFormat;
  artifactPath: string;
  displayPath: string;
}): RepoWorkflowCheckConfiguredArtifactResult {
  try {
    const stat = statSync(options.artifactPath);

    if (!stat.isFile()) {
      return {
        format: options.format,
        status: "unreadable-artifact",
        path: options.displayPath,
        message: "Expected a file artifact.",
      };
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return {
        format: options.format,
        status: "missing-artifact",
        path: options.displayPath,
      };
    }

    const message =
      error instanceof Error
        ? error.message
        : `Unable to read ${options.artifactPath}`;

    return {
      format: options.format,
      status: "unreadable-artifact",
      path: options.displayPath,
      message,
    };
  }

  return {
    format: options.format,
    status: "fresh",
    path: options.displayPath,
    freshness: "presence-only",
  };
}

function checkConfiguredTextArtifact(options: {
  format: ConfiguredTextArtifactFormat;
  artifactPath: string;
  displayPath: string;
  expectedContent: string;
}): RepoWorkflowCheckConfiguredArtifactResult {
  let actualContent: string;

  try {
    actualContent = readFileSync(options.artifactPath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return {
        format: options.format,
        status: "missing-artifact",
        path: options.displayPath,
      };
    }

    const message =
      error instanceof Error
        ? error.message
        : `Unable to read ${options.artifactPath}`;

    return {
      format: options.format,
      status: "unreadable-artifact",
      path: options.displayPath,
      message,
    };
  }

  if (actualContent !== options.expectedContent) {
    return {
      format: options.format,
      status: "stale",
      path: options.displayPath,
      reasons: ["content-mismatch"],
      expectedSha256: sha256(options.expectedContent),
      actualSha256: sha256(actualContent),
    };
  }

  return {
    format: options.format,
    status: "fresh",
    path: options.displayPath,
    freshness: "content",
  };
}

function mapConfiguredSvgArtifactResult(
  artifact: SvgArtifactFreshnessCheckResult,
  displayPath: string,
): RepoWorkflowCheckConfiguredArtifactResult {
  if (artifact.status === "fresh") {
    return {
      format: "svg",
      status: "fresh",
      path: displayPath,
      provenance: artifact.provenance,
    };
  }

  if (artifact.status === "stale") {
    return {
      format: "svg",
      status: "stale",
      path: displayPath,
      reasons: artifact.reasons,
      expected: artifact.expected,
      actual: artifact.actual,
    };
  }

  if (
    artifact.status === "unreadable-artifact" ||
    artifact.status === "malformed-artifact"
  ) {
    return {
      format: "svg",
      status: artifact.status,
      path: displayPath,
      message: artifact.message,
    };
  }

  if (artifact.status === "unchecked") {
    return {
      format: "svg",
      status: "unchecked",
      path: displayPath,
      message: "Configured SVG artifact freshness was not checked.",
    };
  }

  return {
    format: "svg",
    status: artifact.status,
    path: displayPath,
  };
}

export async function checkConfiguredArtifactsForValidatedSource(
  options: CheckConfiguredArtifactsForValidatedSourceOptions,
): Promise<RepoWorkflowCheckConfiguredArtifactResult[]> {
  const results: RepoWorkflowCheckConfiguredArtifactResult[] = [];

  for (const output of options.outputs) {
    const artifactPath = resolveConfiguredOutputPath(
      options.config,
      options.sourceAbsolutePath,
      output,
    );
    const displayPath = normalizePathForDisplay(
      deriveConfiguredArtifactDisplayPath(
        options.config.directory,
        artifactPath,
        options.currentWorkingDirectory,
      ),
    );

    if (output.format === "svg") {
      const artifact =
        await options.checkExpectedSvgArtifactFreshnessForValidatedSource({
          source: options.source,
          artifactPath,
          provenanceSourcePath: options.provenanceSourcePath,
          diagramPilotVersion: options.diagramPilotVersion,
          renderer: options.renderer,
        });

      results.push(mapConfiguredSvgArtifactResult(artifact, displayPath));
      continue;
    }

    if (isConfiguredTextArtifactFormat(output.format)) {
      if (options.exportConfiguredTextArtifact === undefined) {
        results.push({
          format: output.format,
          status: "unchecked",
          path: displayPath,
          message: "Configured text artifact freshness requires an exporter.",
        });
        continue;
      }

      results.push(
        checkConfiguredTextArtifact({
          format: output.format,
          artifactPath,
          displayPath,
          expectedContent: options.exportConfiguredTextArtifact({
            format: output.format,
            spec: options.spec,
          }),
        }),
      );
      continue;
    }

    results.push(
      checkConfiguredPresenceOnlyArtifact({
        format: output.format,
        artifactPath,
        displayPath,
      }),
    );
  }

  return results;
}
