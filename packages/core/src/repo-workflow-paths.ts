import path from "node:path";

import type { DiagramPilotSourceDiscoveryScope } from "./source-discovery.js";

export function normalizePathForDisplay(filePath: string): string {
  return filePath.split(path.sep).join("/");
}

export function deriveRepoWorkflowSourceDisplayPath(
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

export function deriveDefaultArtifactDisplayPath(
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

export function deriveRepoWorkflowConfigDisplayPath(
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
