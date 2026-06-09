import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

export const DEPENDENCY_FIELDS = [
  "dependencies",
  "devDependencies",
  "peerDependencies",
  "optionalDependencies",
];
export const VERSION_SOURCE_PATH = "packages/core/src/version.ts";
export const RELEASE_VERSION_PATTERN =
  /^\d+\.\d+\.\d+(?:-[0-9A-Za-z]+(?:[.-][0-9A-Za-z]+)*)?$/u;

export function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function toRepoPath(rootPath, filePath) {
  return path.relative(rootPath, filePath).split(path.sep).join("/");
}

function lockPackageKeyForManifest(repoPath) {
  return repoPath === "package.json" ? "" : path.posix.dirname(repoPath);
}

function expandWorkspacePattern(rootPath, pattern) {
  if (!pattern.endsWith("/*")) {
    const manifestPath = path.join(rootPath, pattern, "package.json");
    return existsSync(manifestPath) ? [manifestPath] : [];
  }

  const workspaceRoot = path.join(rootPath, pattern.slice(0, -2));

  return readdirSync(workspaceRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(workspaceRoot, entry.name, "package.json"))
    .filter((manifestPath) => existsSync(manifestPath))
    .sort();
}

export function discoverWorkspaceManifestPaths(rootPath, rootManifest) {
  return rootManifest.workspaces
    .flatMap((pattern) => expandWorkspacePattern(rootPath, pattern))
    .sort();
}

export function createManifestRecord(rootPath, manifestPath) {
  const repoPath = toRepoPath(rootPath, manifestPath) || "package.json";
  const manifest = readJson(manifestPath);

  return {
    manifestPath,
    repoPath,
    lockKey: lockPackageKeyForManifest(repoPath),
    manifest,
    publicPackage: manifest.private !== true,
  };
}
