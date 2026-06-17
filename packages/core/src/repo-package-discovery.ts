import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

import {
  createRelativePathIgnoreMatcher,
  normalizeRepoRelativePath,
} from "./path-ignore-patterns.js";

export type RepoPackageDependencySet =
  | "dependencies"
  | "devDependencies"
  | "peerDependencies"
  | "optionalDependencies";

export interface RepoDiscoveredPackageEntrypoints {
  main: string | null;
  module: string | null;
  types: string | null;
  exports: boolean;
}

export interface RepoDiscoveredPackageDependencySets {
  dependencies: readonly string[];
  devDependencies: readonly string[];
  peerDependencies: readonly string[];
  optionalDependencies: readonly string[];
}

export interface RepoDiscoveredPackage {
  path: string;
  manifestPath: string;
  name: string | null;
  version: string | null;
  private: boolean | null;
  packageManager: string | null;
  workspace: boolean;
  scripts: readonly string[];
  entrypoints: RepoDiscoveredPackageEntrypoints;
  dependencies: RepoDiscoveredPackageDependencySets;
}

export interface RepoDiscoveredPackageDependencyEdge {
  from: string;
  dependency: string;
  to: string | null;
  kind: "internal" | "external";
  dependencySet: RepoPackageDependencySet;
}

export interface RepoPackageDiscoveryDiagnostic {
  code:
    | "invalid-package-manifest"
    | "unsupported-package-manager"
    | "unsupported-workspace-declaration"
    | "unsupported-workspace-pattern";
  path?: string;
  message: string;
}

export interface RepoPackageDiscoverySummary {
  rootPackage: RepoDiscoveredPackage | null;
  workspacePackages: readonly RepoDiscoveredPackage[];
  dependencyEdges: readonly RepoDiscoveredPackageDependencyEdge[];
  diagnostics: readonly RepoPackageDiscoveryDiagnostic[];
}

export interface RepoPackageDiscoveryOptions {
  directory: string;
  exclude: readonly string[];
}

type PackageManifest = Record<string, unknown>;

const dependencySets = [
  "dependencies",
  "devDependencies",
  "peerDependencies",
  "optionalDependencies",
] as const satisfies readonly RepoPackageDependencySet[];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function booleanValue(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function sortedRecordKeys(value: unknown): readonly string[] {
  return isRecord(value) ? Object.keys(value).sort() : [];
}

function normalizePackageRelativePath(filePath: string): string {
  const normalized = normalizeRepoRelativePath(filePath);
  return normalized === "" ? "." : normalized;
}

function packageDirectoryForManifestPath(manifestPath: string): string {
  const directory = path.posix.dirname(manifestPath);
  return directory === "." ? "." : directory;
}

function manifestPathForPackageDirectory(packageDirectory: string): string {
  return packageDirectory === "."
    ? "package.json"
    : `${packageDirectory}/package.json`;
}

function readPackageManifest(options: {
  absoluteManifestPath: string;
  diagnostics: RepoPackageDiscoveryDiagnostic[];
  manifestPath: string;
}): PackageManifest | undefined {
  try {
    const parsed = JSON.parse(readFileSync(options.absoluteManifestPath, "utf8"));
    if (isRecord(parsed)) return parsed;
  } catch (error) {
    options.diagnostics.push({
      code: "invalid-package-manifest",
      path: options.manifestPath,
      message: `Package manifest ${options.manifestPath} could not be parsed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    });
    return undefined;
  }

  options.diagnostics.push({
    code: "invalid-package-manifest",
    path: options.manifestPath,
    message: `Package manifest ${options.manifestPath} must contain a JSON object.`,
  });
  return undefined;
}

function entrypointsForManifest(
  manifest: PackageManifest,
): RepoDiscoveredPackageEntrypoints {
  return {
    main: stringValue(manifest.main),
    module: stringValue(manifest.module),
    types: stringValue(manifest.types ?? manifest.typings),
    exports: Object.hasOwn(manifest, "exports"),
  };
}

function dependencySetsForManifest(
  manifest: PackageManifest,
): RepoDiscoveredPackageDependencySets {
  return {
    dependencies: sortedRecordKeys(manifest.dependencies),
    devDependencies: sortedRecordKeys(manifest.devDependencies),
    peerDependencies: sortedRecordKeys(manifest.peerDependencies),
    optionalDependencies: sortedRecordKeys(manifest.optionalDependencies),
  };
}

function packageSummaryForManifest(options: {
  manifest: PackageManifest;
  manifestPath: string;
  workspace: boolean;
}): RepoDiscoveredPackage {
  return {
    path: packageDirectoryForManifestPath(options.manifestPath),
    manifestPath: options.manifestPath,
    name: stringValue(options.manifest.name),
    version: stringValue(options.manifest.version),
    private: booleanValue(options.manifest.private),
    packageManager: stringValue(options.manifest.packageManager),
    workspace: options.workspace,
    scripts: sortedRecordKeys(options.manifest.scripts),
    entrypoints: entrypointsForManifest(options.manifest),
    dependencies: dependencySetsForManifest(options.manifest),
  };
}

function unsupportedPackageManagerDiagnostic(
  rootPackage: RepoDiscoveredPackage,
): RepoPackageDiscoveryDiagnostic | undefined {
  const packageManager = rootPackage.packageManager;

  return packageManager !== null && !packageManager.startsWith("npm@")
    ? {
        code: "unsupported-package-manager",
        path: rootPackage.manifestPath,
        message: `Package manager ${packageManager} is not supported for package discovery; npm workspaces are supported.`,
      }
    : undefined;
}

function stringArrayValues(value: unknown): readonly string[] | undefined {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : undefined;
}

function workspacePatternValues(workspaces: unknown): readonly string[] | undefined {
  return (
    stringArrayValues(workspaces) ??
    (isRecord(workspaces) ? stringArrayValues(workspaces.packages) : undefined)
  );
}

function pushUnsupportedWorkspaceDeclarationDiagnostic(options: {
  diagnostics: RepoPackageDiscoveryDiagnostic[];
  manifestPath: string;
}): void {
  options.diagnostics.push({
    code: "unsupported-workspace-declaration",
    path: options.manifestPath,
    message:
      "Package discovery supports npm workspaces as a string array or an object with a packages array.",
  });
}

function workspacePatternsFromManifest(options: {
  diagnostics: RepoPackageDiscoveryDiagnostic[];
  manifest: PackageManifest;
  manifestPath: string;
}): readonly string[] {
  const workspaces = options.manifest.workspaces;
  if (workspaces === undefined) return [];

  const patterns = workspacePatternValues(workspaces);
  if (patterns !== undefined) return patterns;

  pushUnsupportedWorkspaceDeclarationDiagnostic(options);
  return [];
}

function normalizeWorkspacePattern(pattern: string): string {
  return pattern
    .replace(/\\/gu, "/")
    .replace(/^\.\//u, "")
    .replace(/\/package\.json$/u, "");
}

function unsupportedWorkspacePatternDiagnostic(options: {
  manifestPath: string;
  pattern: string;
}): RepoPackageDiscoveryDiagnostic {
  return {
    code: "unsupported-workspace-pattern",
    path: options.manifestPath,
    message: `Workspace pattern ${options.pattern} is not supported by package discovery.`,
  };
}

function childDirectories(directory: string): readonly string[] {
  if (!existsSync(directory)) return [];

  return readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function unsupportedNormalizedWorkspacePattern(pattern: string): boolean {
  return pattern === "" || pattern.includes("**");
}

function workspacePatternSegments(pattern: string): readonly string[] | undefined {
  if (unsupportedNormalizedWorkspacePattern(pattern)) return undefined;

  return pattern.split("/").filter((segment) => segment !== "");
}

function unsupportedWorkspacePatternSegment(segment: string): boolean {
  return segment.includes("*") || segment.includes("?");
}

function expandWorkspaceSegment(options: {
  directory: string;
  relativeDirectories: readonly string[];
  segment: string;
}): readonly string[] | undefined {
  if (options.segment === "*") {
    return options.relativeDirectories.flatMap((relativeDirectory) =>
      childDirectories(path.join(options.directory, relativeDirectory)).map((child) =>
        path.join(relativeDirectory, child),
      ),
    );
  }

  return unsupportedWorkspacePatternSegment(options.segment)
    ? undefined
    : options.relativeDirectories.map((relativeDirectory) =>
        path.join(relativeDirectory, options.segment),
      );
}

function pushUnsupportedWorkspacePatternDiagnostic(options: {
  diagnostics: RepoPackageDiscoveryDiagnostic[];
  manifestPath: string;
  pattern: string;
}): void {
  options.diagnostics.push(
    unsupportedWorkspacePatternDiagnostic({
      manifestPath: options.manifestPath,
      pattern: options.pattern,
    }),
  );
}

function expandWorkspacePattern(options: {
  directory: string;
  diagnostics: RepoPackageDiscoveryDiagnostic[];
  manifestPath: string;
  pattern: string;
}): readonly string[] {
  const normalizedPattern = normalizeWorkspacePattern(options.pattern);
  const segments = workspacePatternSegments(normalizedPattern);

  if (segments === undefined) {
    pushUnsupportedWorkspacePatternDiagnostic(options);
    return [];
  }

  let relativeDirectories: readonly string[] = [""];
  for (const segment of segments) {
    const expandedDirectories = expandWorkspaceSegment({
      directory: options.directory,
      relativeDirectories,
      segment,
    });
    if (expandedDirectories === undefined) {
      pushUnsupportedWorkspacePatternDiagnostic(options);
      return [];
    }
    relativeDirectories = expandedDirectories;
  }

  return relativeDirectories.map(normalizePackageRelativePath).sort();
}

function workspacePackageDirectories(options: {
  directory: string;
  diagnostics: RepoPackageDiscoveryDiagnostic[];
  rootManifest: PackageManifest | undefined;
  rootManifestPath: string;
}): readonly string[] {
  if (options.rootManifest === undefined) return [];

  const patterns = workspacePatternsFromManifest({
    diagnostics: options.diagnostics,
    manifest: options.rootManifest,
    manifestPath: options.rootManifestPath,
  });
  const directories = new Set<string>();

  for (const pattern of patterns) {
    for (const directory of expandWorkspacePattern({
      directory: options.directory,
      diagnostics: options.diagnostics,
      manifestPath: options.rootManifestPath,
      pattern,
    })) {
      directories.add(directory);
    }
  }

  return [...directories].sort();
}

function packageExists(options: {
  directory: string;
  manifestPath: string;
}): boolean {
  try {
    return statSync(path.join(options.directory, options.manifestPath)).isFile();
  } catch {
    return false;
  }
}

function discoverPackageAtManifestPath(options: {
  directory: string;
  diagnostics: RepoPackageDiscoveryDiagnostic[];
  manifestPath: string;
  workspace: boolean;
}): RepoDiscoveredPackage | undefined {
  const absoluteManifestPath = path.join(options.directory, options.manifestPath);
  if (!packageExists(options)) return undefined;

  const manifest = readPackageManifest({
    absoluteManifestPath,
    diagnostics: options.diagnostics,
    manifestPath: options.manifestPath,
  });

  return manifest === undefined
    ? undefined
    : packageSummaryForManifest({
        manifest,
        manifestPath: options.manifestPath,
        workspace: options.workspace,
      });
}

function packageIdentity(packageSummary: RepoDiscoveredPackage): string {
  return packageSummary.name ?? packageSummary.path;
}

function dependencyEdgeForPackageDependency(options: {
  dependency: string;
  dependencySet: RepoPackageDependencySet;
  packageByName: ReadonlyMap<string, RepoDiscoveredPackage>;
  packageSummary: RepoDiscoveredPackage;
}): RepoDiscoveredPackageDependencyEdge {
  const internalPackage = options.packageByName.get(options.dependency);

  return {
    from: packageIdentity(options.packageSummary),
    dependency: options.dependency,
    to: internalPackage === undefined ? null : packageIdentity(internalPackage),
    kind: internalPackage === undefined ? "external" : "internal",
    dependencySet: options.dependencySet,
  };
}

function dependencyEdgesForPackageDependencySet(options: {
  dependencySet: RepoPackageDependencySet;
  packageByName: ReadonlyMap<string, RepoDiscoveredPackage>;
  packageSummary: RepoDiscoveredPackage;
}): readonly RepoDiscoveredPackageDependencyEdge[] {
  return options.packageSummary.dependencies[options.dependencySet].map((dependency) =>
    dependencyEdgeForPackageDependency({
      dependency,
      dependencySet: options.dependencySet,
      packageByName: options.packageByName,
      packageSummary: options.packageSummary,
    }),
  );
}

function dependencyEdgesForPackage(options: {
  packageByName: ReadonlyMap<string, RepoDiscoveredPackage>;
  packageSummary: RepoDiscoveredPackage;
}): readonly RepoDiscoveredPackageDependencyEdge[] {
  return dependencySets.flatMap((dependencySet) =>
    dependencyEdgesForPackageDependencySet({
      dependencySet,
      packageByName: options.packageByName,
      packageSummary: options.packageSummary,
    }),
  );
}

function packageNameMap(
  packages: readonly RepoDiscoveredPackage[],
): ReadonlyMap<string, RepoDiscoveredPackage> {
  return new Map(
    packages
      .filter(
        (packageSummary): packageSummary is RepoDiscoveredPackage & { name: string } =>
          packageSummary.name !== null,
      )
      .map((packageSummary) => [packageSummary.name, packageSummary]),
  );
}

function dependencyEdgesForPackages(
  packages: readonly RepoDiscoveredPackage[],
): readonly RepoDiscoveredPackageDependencyEdge[] {
  const packageByName = packageNameMap(packages);

  return packages.flatMap((packageSummary) =>
    dependencyEdgesForPackage({ packageByName, packageSummary }),
  );
}

function ignoredPackageManifest(options: {
  isIgnored: (relativePath: string) => boolean;
  manifestPath: string;
}): boolean {
  return (
    options.isIgnored(options.manifestPath) ||
    options.isIgnored(packageDirectoryForManifestPath(options.manifestPath))
  );
}

function rootPackageManifest(options: {
  directory: string;
  diagnostics: RepoPackageDiscoveryDiagnostic[];
  rootPackage: RepoDiscoveredPackage | undefined;
  rootManifestPath: string;
}): PackageManifest | undefined {
  return options.rootPackage === undefined
    ? undefined
    : readPackageManifest({
        absoluteManifestPath: path.join(options.directory, options.rootManifestPath),
        diagnostics: options.diagnostics,
        manifestPath: options.rootManifestPath,
      });
}

function addPackageManagerDiagnostic(options: {
  diagnostics: RepoPackageDiscoveryDiagnostic[];
  rootPackage: RepoDiscoveredPackage | undefined;
}): void {
  const diagnostic =
    options.rootPackage === undefined
      ? undefined
      : unsupportedPackageManagerDiagnostic(options.rootPackage);

  if (diagnostic !== undefined) options.diagnostics.push(diagnostic);
}

function discoverWorkspacePackages(options: {
  directory: string;
  diagnostics: RepoPackageDiscoveryDiagnostic[];
  exclude: readonly string[];
  rootManifest: PackageManifest | undefined;
  rootManifestPath: string;
}): readonly RepoDiscoveredPackage[] {
  const isIgnored = createRelativePathIgnoreMatcher(options.exclude);

  return workspacePackageDirectories({
    directory: options.directory,
    diagnostics: options.diagnostics,
    rootManifest: options.rootManifest,
    rootManifestPath: options.rootManifestPath,
  })
    .map(manifestPathForPackageDirectory)
    .filter((manifestPath) => !ignoredPackageManifest({ isIgnored, manifestPath }))
    .map((manifestPath) =>
      discoverPackageAtManifestPath({
        directory: options.directory,
        diagnostics: options.diagnostics,
        manifestPath,
        workspace: true,
      }),
    )
    .filter(
      (packageSummary): packageSummary is RepoDiscoveredPackage =>
        packageSummary !== undefined,
    );
}

function discoveredPackageList(options: {
  rootPackage: RepoDiscoveredPackage | undefined;
  workspacePackages: readonly RepoDiscoveredPackage[];
}): readonly RepoDiscoveredPackage[] {
  return options.rootPackage === undefined
    ? options.workspacePackages
    : [options.rootPackage, ...options.workspacePackages];
}

export function discoverPackageManifests(
  options: RepoPackageDiscoveryOptions,
): RepoPackageDiscoverySummary {
  const diagnostics: RepoPackageDiscoveryDiagnostic[] = [];
  const rootManifestPath = "package.json";
  const rootPackage = discoverPackageAtManifestPath({
    directory: options.directory,
    diagnostics,
    manifestPath: rootManifestPath,
    workspace: false,
  });
  const rootManifest = rootPackageManifest({
    directory: options.directory,
    diagnostics,
    rootPackage,
    rootManifestPath,
  });
  addPackageManagerDiagnostic({ diagnostics, rootPackage });

  const workspacePackages = discoverWorkspacePackages({
    directory: options.directory,
    diagnostics,
    exclude: options.exclude,
    rootManifest,
    rootManifestPath,
  });
  const packages = discoveredPackageList({ rootPackage, workspacePackages });

  return {
    rootPackage: rootPackage ?? null,
    workspacePackages,
    dependencyEdges: dependencyEdgesForPackages(packages),
    diagnostics,
  };
}
