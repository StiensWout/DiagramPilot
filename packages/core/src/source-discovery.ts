import { readdirSync, statSync, type Stats } from "node:fs";
import path from "node:path";

export interface DiscoveredDiagramPilotSourceFile {
  absolutePath: string;
  relativePath: string;
}

export interface DiagramPilotSourceDiscoveryScope {
  kind: "directory" | "file";
  path: string;
}

export interface DiagramPilotSourceDiscoveryFailure {
  kind: "path-not-found" | "unsupported-source-path";
  path: string;
  message: string;
}

export type DiagramPilotSourceDiscoveryResult =
  | {
      ok: true;
      scope: DiagramPilotSourceDiscoveryScope;
      sources: readonly DiscoveredDiagramPilotSourceFile[];
    }
  | {
      ok: false;
      failure: DiagramPilotSourceDiscoveryFailure;
    };

export interface DiagramPilotSourceDiscoveryOptions {
  ignorePatterns?: readonly string[];
  ignorePatternsRoot?: string;
}

function isDiagramPilotSourcePath(filePath: string): boolean {
  return /\.dp\.yaml$/iu.test(filePath);
}

function unsupportedSourceFileMessage(filePath: string): string {
  if (filePath.toLowerCase().endsWith(".dp.json")) {
    return `Unsupported DiagramPilot source file: ${filePath}. YAML is the supported source format; use a *.dp.yaml source file.`;
  }

  return `Unsupported DiagramPilot source file: ${filePath}`;
}

const ignoredDiagramPilotDiscoveryDirectories = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  "coverage",
  ".next",
  ".vite",
  ".turbo",
]);

function normalizeRelativePath(filePath: string): string {
  return filePath.split(path.sep).join("/");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function normalizeIgnorePattern(pattern: string): string {
  return pattern
    .replace(/\\/gu, "/")
    .replace(/^\.\//u, "")
    .replace(/\/$/u, "/**");
}

function globPatternToRegExp(pattern: string): RegExp {
  const normalizedPattern = normalizeIgnorePattern(pattern);
  const hasDirectoryBoundary = normalizedPattern.includes("/");
  const expression = normalizedPattern
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

  if (hasDirectoryBoundary) {
    return new RegExp(`^${expression}$`, "u");
  }

  return new RegExp(`(?:^|/)${expression}$`, "u");
}

function createSourceIgnoreMatcher(
  options: DiagramPilotSourceDiscoveryOptions,
): (absolutePath: string, fallbackRelativePath: string) => boolean {
  const patterns = options.ignorePatterns ?? [];

  if (patterns.length === 0) {
    return () => false;
  }

  const root = options.ignorePatternsRoot;
  const expressions = patterns.map(globPatternToRegExp);

  return (absolutePath, fallbackRelativePath) => {
    const relativePath = normalizeRelativePath(
      root === undefined
        ? fallbackRelativePath
        : path.relative(root, absolutePath),
    );

    return expressions.some((expression) => expression.test(relativePath));
  };
}

function shouldVisitDirectory(entryName: string): boolean {
  return !ignoredDiagramPilotDiscoveryDirectories.has(entryName);
}

function sourceFileForEntry(options: {
  scopePath: string;
  absolutePath: string;
  entryName: string;
  isFile: boolean;
  isIgnoredSourcePath(
    absolutePath: string,
    fallbackRelativePath: string,
  ): boolean;
}): DiscoveredDiagramPilotSourceFile | undefined {
  if (!options.isFile || !isDiagramPilotSourcePath(options.entryName)) {
    return undefined;
  }

  const relativePath = normalizeRelativePath(
    path.relative(options.scopePath, options.absolutePath),
  );

  if (options.isIgnoredSourcePath(options.absolutePath, relativePath)) {
    return undefined;
  }

  return {
    absolutePath: options.absolutePath,
    relativePath,
  };
}

function collectSourceDiscoveryEntry(options: {
  entryName: string;
  isDirectory: boolean;
  isFile: boolean;
  absolutePath: string;
  scopePath: string;
  isIgnoredSourcePath(
    absolutePath: string,
    fallbackRelativePath: string,
  ): boolean;
  visitDirectory(directoryPath: string): void;
}): DiscoveredDiagramPilotSourceFile | undefined {
  if (options.isDirectory) {
    if (shouldVisitDirectory(options.entryName)) {
      options.visitDirectory(options.absolutePath);
    }

    return undefined;
  }

  return sourceFileForEntry({
    scopePath: options.scopePath,
    absolutePath: options.absolutePath,
    entryName: options.entryName,
    isFile: options.isFile,
    isIgnoredSourcePath: options.isIgnoredSourcePath,
  });
}

function pathNotFoundDiscoveryResult(
  scopePath: string,
): DiagramPilotSourceDiscoveryResult {
  return {
    ok: false,
    failure: {
      kind: "path-not-found",
      path: scopePath,
      message: `Path does not exist: ${scopePath}`,
    },
  };
}

function unsupportedSourcePathDiscoveryResult(
  scopePath: string,
  message: string,
): DiagramPilotSourceDiscoveryResult {
  return {
    ok: false,
    failure: {
      kind: "unsupported-source-path",
      path: scopePath,
      message,
    },
  };
}

function statSourceScope(scopePath: string): Stats | undefined {
  let stat;

  try {
    stat = statSync(scopePath);
  } catch {
    return undefined;
  }

  return stat;
}

function fileScopeDiscoveryResult(
  scopePath: string,
): DiagramPilotSourceDiscoveryResult {
  if (!isDiagramPilotSourcePath(scopePath)) {
    return unsupportedSourcePathDiscoveryResult(
      scopePath,
      unsupportedSourceFileMessage(scopePath),
    );
  }

  return {
    ok: true,
    scope: {
      kind: "file",
      path: scopePath,
    },
    sources: [
      {
        absolutePath: scopePath,
        relativePath: normalizeRelativePath(path.basename(scopePath)),
      },
    ],
  };
}

function unsupportedNonDirectoryScopeResult(
  scopePath: string,
): DiagramPilotSourceDiscoveryResult {
  return unsupportedSourcePathDiscoveryResult(
    scopePath,
    `Unsupported DiagramPilot source path: ${scopePath}`,
  );
}

function directoryScopeDiscoveryResult(
  scopePath: string,
  options: DiagramPilotSourceDiscoveryOptions,
): DiagramPilotSourceDiscoveryResult {
  const sources: DiscoveredDiagramPilotSourceFile[] = [];
  const isIgnoredSourcePath = createSourceIgnoreMatcher(options);

  function visitDirectory(directoryPath: string): void {
    for (const entry of readdirSync(directoryPath, { withFileTypes: true })) {
      const absolutePath = path.join(directoryPath, entry.name);
      const source = collectSourceDiscoveryEntry({
        entryName: entry.name,
        isDirectory: entry.isDirectory(),
        isFile: entry.isFile(),
        absolutePath,
        scopePath,
        isIgnoredSourcePath,
        visitDirectory,
      });

      if (source !== undefined) sources.push(source);
    }
  }

  visitDirectory(scopePath);

  sources.sort((left, right) =>
    left.relativePath.localeCompare(right.relativePath),
  );

  return {
    ok: true,
    scope: {
      kind: "directory",
      path: scopePath,
    },
    sources,
  };
}

export async function discoverDiagramPilotSourceFiles(
  scopePath = process.cwd(),
  options: DiagramPilotSourceDiscoveryOptions = {},
): Promise<DiagramPilotSourceDiscoveryResult> {
  const stat = statSourceScope(scopePath);

  if (stat === undefined) {
    return pathNotFoundDiscoveryResult(scopePath);
  }

  if (stat.isFile()) {
    return fileScopeDiscoveryResult(scopePath);
  }

  if (!stat.isDirectory()) {
    return unsupportedNonDirectoryScopeResult(scopePath);
  }

  return directoryScopeDiscoveryResult(scopePath, options);
}
