#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  createManifestRecord,
  DEPENDENCY_FIELDS,
  discoverWorkspaceManifestPaths,
  readJson,
  RELEASE_VERSION_PATTERN,
  VERSION_SOURCE_PATH,
} from "./release-version-workspace.mjs";

function writeJson(filePath, data) {
  writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function updateInternalDependencies(manifest, publicPackageNames, version) {
  for (const field of DEPENDENCY_FIELDS) {
    const dependencies = manifest[field];
    updateDependencyGroup(dependencies, publicPackageNames, version);
  }
}

function updateDependencyGroup(dependencies, publicPackageNames, version) {
  if (dependencies === undefined) {
    return;
  }

  for (const dependencyName of Object.keys(dependencies)) {
    updateDependencyVersion(dependencies, dependencyName, publicPackageNames, version);
  }
}

function updateDependencyVersion(
  dependencies,
  dependencyName,
  publicPackageNames,
  version,
) {
  if (publicPackageNames.has(dependencyName)) {
    dependencies[dependencyName] = version;
  }
}

function updateManifests(rootPath, version) {
  const rootManifestPath = path.join(rootPath, "package.json");
  const rootRecord = createManifestRecord(rootPath, rootManifestPath);
  const workspaceRecords = discoverWorkspaceManifestPaths(
    rootPath,
    rootRecord.manifest,
  ).map((manifestPath) => createManifestRecord(rootPath, manifestPath));
  const records = [rootRecord, ...workspaceRecords];
  const publicPackageNames = new Set(
    workspaceRecords
      .filter((record) => record.manifest.private !== true)
      .map((record) => record.manifest.name),
  );

  for (const record of records) {
    record.manifest.version = version;
    updateInternalDependencies(record.manifest, publicPackageNames, version);
    writeJson(record.manifestPath, record.manifest);
  }

  return { records, publicPackageNames };
}

function updateLockfile(rootPath, records, publicPackageNames, version) {
  const lockfilePath = path.join(rootPath, "package-lock.json");
  const lockfile = readJson(lockfilePath);

  lockfile.version = version;
  updateLockfilePackageVersions(lockfile, records, version);
  updateLockfilePackageDependencies(lockfile, publicPackageNames, version);

  writeJson(lockfilePath, lockfile);
}

function updateLockfilePackageVersions(lockfile, records, version) {
  for (const record of records) {
    const lockPackage = lockfile.packages?.[record.lockKey];

    if (lockPackage !== undefined) {
      lockPackage.version = version;
    }
  }
}

function updateLockfilePackageDependencies(lockfile, publicPackageNames, version) {
  for (const lockPackage of Object.values(lockfile.packages ?? {})) {
    updateInternalDependencies(lockPackage, publicPackageNames, version);
  }
}

function updateRuntimeVersion(rootPath, version) {
  const sourcePath = path.join(rootPath, VERSION_SOURCE_PATH);
  const source = readFileSync(sourcePath, "utf8");
  const versionPattern = /\bDIAGRAMPILOT_VERSION\s*=\s*"[^"]+"/u;

  if (versionPattern.exec(source) === null) {
    throw new Error(`${VERSION_SOURCE_PATH} does not export DIAGRAMPILOT_VERSION.`);
  }

  const updatedSource = source.replace(
    versionPattern,
    `DIAGRAMPILOT_VERSION = "${version}"`,
  );

  writeFileSync(sourcePath, updatedSource, "utf8");
}

function usage() {
  return "Usage: node scripts/bump-release-version.mjs <version>";
}

function parseVersionArg(args) {
  if (!hasValidVersionArg(args)) {
    return {
      ok: false,
    };
  }

  return {
    ok: true,
    version: args[0],
  };
}

function hasValidVersionArg(args) {
  return (
    args.length === 1 &&
    args[0] !== "--help" &&
    args[0] !== "-h" &&
    RELEASE_VERSION_PATTERN.test(args[0])
  );
}

function bumpReleaseVersion(version) {
  const rootPath = process.cwd();
  const { records, publicPackageNames } = updateManifests(rootPath, version);
  updateLockfile(rootPath, records, publicPackageNames, version);
  updateRuntimeVersion(rootPath, version);
  process.stdout.write(
    `Updated DiagramPilot release version metadata to ${version}.\n`,
  );
  return 0;
}

function main() {
  const parsedArgs = parseVersionArg(process.argv.slice(2));

  if (!parsedArgs.ok) {
    process.stderr.write(`${usage()}\n`);
    return 1;
  }

  try {
    return bumpReleaseVersion(parsedArgs.version);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`Unable to bump DiagramPilot release version: ${message}\n`);
    return 1;
  }
}

process.exitCode = main();
