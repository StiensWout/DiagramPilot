import { readdirSync, statSync } from "node:fs";
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

export async function discoverDiagramPilotSourceFiles(
  scopePath = process.cwd(),
  options: DiagramPilotSourceDiscoveryOptions = {},
): Promise<DiagramPilotSourceDiscoveryResult> {
  let stat;

  try {
    stat = statSync(scopePath);
  } catch {
    return {
      ok: false,
      failure: {
        kind: "path-not-found",
        path: scopePath,
        message: `Path does not exist: ${scopePath}`,
      },
    };
  }

  if (stat.isFile()) {
    if (!isDiagramPilotSourcePath(scopePath)) {
      return {
        ok: false,
        failure: {
          kind: "unsupported-source-path",
          path: scopePath,
          message: unsupportedSourceFileMessage(scopePath),
        },
      };
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

  if (!stat.isDirectory()) {
    return {
      ok: false,
      failure: {
        kind: "unsupported-source-path",
        path: scopePath,
        message: `Unsupported DiagramPilot source path: ${scopePath}`,
      },
    };
  }

  const sources: DiscoveredDiagramPilotSourceFile[] = [];
  const isIgnoredSourcePath = createSourceIgnoreMatcher(options);

  function visitDirectory(directoryPath: string): void {
    for (const entry of readdirSync(directoryPath, { withFileTypes: true })) {
      const absolutePath = path.join(directoryPath, entry.name);

      if (entry.isDirectory()) {
        if (ignoredDiagramPilotDiscoveryDirectories.has(entry.name)) {
          continue;
        }

        visitDirectory(absolutePath);
        continue;
      }

      if (!entry.isFile() || !isDiagramPilotSourcePath(entry.name)) {
        continue;
      }

      const relativePath = normalizeRelativePath(
        path.relative(scopePath, absolutePath),
      );

      if (isIgnoredSourcePath(absolutePath, relativePath)) {
        continue;
      }

      sources.push({
        absolutePath,
        relativePath,
      });
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
