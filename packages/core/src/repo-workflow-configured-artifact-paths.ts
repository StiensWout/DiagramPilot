import path from "node:path";

import type {
  RepoWorkflowArtifactMapping,
  RepoWorkflowArtifactOutput,
  RepoWorkflowConfig,
} from "./repo-workflow-config.js";
import { normalizePathForDisplay } from "./repo-workflow-paths.js";
import type {
  DiagramPilotSourceDiscoveryOptions,
  DiagramPilotSourceDiscoveryScope,
  DiscoveredDiagramPilotSourceFile,
} from "./source-discovery.js";

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

export function configuredSourceDiscoveryOptions(
  config: RepoWorkflowConfig | undefined,
): DiagramPilotSourceDiscoveryOptions | undefined {
  if (config === undefined) {
    return undefined;
  }

  return {
    ignorePatterns: config.sources.ignore,
    ignorePatternsRoot: config.directory,
  };
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

function explicitSourceRelativePath(
  scope: DiagramPilotSourceDiscoveryScope,
  absolutePath: string,
): string {
  if (scope.kind === "directory") {
    return normalizePathForDisplay(path.relative(scope.path, absolutePath));
  }

  return normalizePathForDisplay(path.basename(absolutePath));
}

function configuredExplicitSourceForMapping(
  config: RepoWorkflowConfig,
  mapping: RepoWorkflowArtifactMapping,
  scope: DiagramPilotSourceDiscoveryScope,
): DiscoveredDiagramPilotSourceFile[] {
  if (mapping.source === undefined) {
    return [];
  }

  const absolutePath = path.resolve(config.directory, mapping.source);

  if (!isExplicitSourceInScope(absolutePath, scope)) {
    return [];
  }

  return [
    {
      absolutePath,
      relativePath: explicitSourceRelativePath(scope, absolutePath),
    },
  ];
}

export function configuredExplicitSourcesForScope(
  config: RepoWorkflowConfig | undefined,
  scope: DiagramPilotSourceDiscoveryScope,
): DiscoveredDiagramPilotSourceFile[] {
  if (config === undefined) {
    return [];
  }

  return config.artifacts.flatMap((mapping) =>
    configuredExplicitSourceForMapping(config, mapping, scope),
  );
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
