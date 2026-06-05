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

function isDiagramPilotSourcePath(filePath: string): boolean {
  return /\.dp\.(yaml|json)$/iu.test(filePath);
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

export async function discoverDiagramPilotSourceFiles(
  scopePath = process.cwd(),
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
          message: `Unsupported DiagramPilot source file: ${scopePath}`,
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

      sources.push({
        absolutePath,
        relativePath: normalizeRelativePath(
          path.relative(scopePath, absolutePath),
        ),
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
