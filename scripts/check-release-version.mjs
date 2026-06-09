#!/usr/bin/env node
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  createManifestRecord,
  DEPENDENCY_FIELDS,
  discoverWorkspaceManifestPaths,
  readJson,
  RELEASE_VERSION_PATTERN,
  VERSION_SOURCE_PATH,
} from "./release-version-workspace.mjs";

function collectManifestVersionIssues(records, expectedVersion) {
  const issues = [];

  for (const record of records) {
    if (record.manifest.version !== expectedVersion) {
      const packageKind = record.publicPackage
        ? "public package"
        : "private workspace";
      issues.push(
        `${record.repoPath} ${packageKind} version is ${record.manifest.version}; expected ${expectedVersion}.`,
      );
    }
  }

  return issues;
}

function collectInternalDependencyIssues(records, publicPackageNames, expectedVersion) {
  const issues = [];

  for (const record of records) {
    for (const field of DEPENDENCY_FIELDS) {
      const dependencies = record.manifest[field];

      if (dependencies === undefined) {
        continue;
      }

      for (const [dependencyName, dependencyVersion] of Object.entries(
        dependencies,
      )) {
        if (
          publicPackageNames.has(dependencyName) &&
          dependencyVersion !== expectedVersion
        ) {
          issues.push(
            `${record.repoPath} ${field}.${dependencyName} is ${dependencyVersion}; expected exact ${expectedVersion}.`,
          );
        }
      }
    }
  }

  return issues;
}

function collectLockfileIssues(
  rootPath,
  records,
  publicPackageNames,
  expectedVersion,
) {
  const lockfilePath = path.join(rootPath, "package-lock.json");
  const lockfile = readJson(lockfilePath);
  const issues = [];

  if (lockfile.version !== expectedVersion) {
    issues.push(
      `package-lock.json root version is ${lockfile.version}; expected ${expectedVersion}.`,
    );
  }

  if (lockfile.packages === undefined || typeof lockfile.packages !== "object") {
    issues.push("package-lock.json packages metadata is missing.");
    return issues;
  }

  for (const record of records) {
    const lockPackage = lockfile.packages[record.lockKey];

    if (lockPackage === undefined) {
      issues.push(
        `package-lock.json packages.${record.lockKey || "<root>"} is missing.`,
      );
      continue;
    }

    if (lockPackage.version !== expectedVersion) {
      issues.push(
        `package-lock.json packages.${record.lockKey || "<root>"}.version is ${lockPackage.version}; expected ${expectedVersion}.`,
      );
    }
  }

  for (const [lockKey, lockPackage] of Object.entries(lockfile.packages)) {
    for (const field of DEPENDENCY_FIELDS) {
      const dependencies = lockPackage[field];

      if (dependencies === undefined) {
        continue;
      }

      for (const [dependencyName, dependencyVersion] of Object.entries(
        dependencies,
      )) {
        if (
          publicPackageNames.has(dependencyName) &&
          dependencyVersion !== expectedVersion
        ) {
          issues.push(
            `package-lock.json packages.${lockKey || "<root>"}.${field}.${dependencyName} is ${dependencyVersion}; expected exact ${expectedVersion}.`,
          );
        }
      }
    }
  }

  return issues;
}

function collectRuntimeVersionIssues(rootPath, expectedVersion) {
  const versionSource = readFileSync(
    path.join(rootPath, VERSION_SOURCE_PATH),
    "utf8",
  );
  const match =
    /\bDIAGRAMPILOT_VERSION\s*=\s*"(?<version>[^"]+)"/u.exec(versionSource);

  if (match?.groups?.version === undefined) {
    return [`${VERSION_SOURCE_PATH} does not export DIAGRAMPILOT_VERSION.`];
  }

  if (match.groups.version !== expectedVersion) {
    return [
      `${VERSION_SOURCE_PATH} DIAGRAMPILOT_VERSION is ${match.groups.version}; expected ${expectedVersion}.`,
    ];
  }

  return [];
}

function checkReleaseVersion(rootPath, explicitExpectedVersion) {
  const rootManifestPath = path.join(rootPath, "package.json");
  const rootManifest = readJson(rootManifestPath);
  const expectedVersion = explicitExpectedVersion ?? rootManifest.version;

  if (!RELEASE_VERSION_PATTERN.test(expectedVersion)) {
    return {
      expectedVersion,
      issues: [
        `Expected release version ${expectedVersion} is not a semver release or prerelease like 0.1.1 or 0.1.1-nightly.1.1.abcdef0.`,
      ],
    };
  }

  const rootRecord = {
    repoPath: "package.json",
    lockKey: "",
    manifest: rootManifest,
    publicPackage: rootManifest.private !== true,
  };
  const workspaceRecords = discoverWorkspaceManifestPaths(
    rootPath,
    rootManifest,
  ).map((manifestPath) => createManifestRecord(rootPath, manifestPath));
  const records = [rootRecord, ...workspaceRecords];
  const publicPackageNames = new Set(
    workspaceRecords
      .filter((record) => record.publicPackage)
      .map((record) => record.manifest.name),
  );
  const issues = [
    ...collectManifestVersionIssues(records, expectedVersion),
    ...collectInternalDependencyIssues(
      records,
      publicPackageNames,
      expectedVersion,
    ),
    ...collectLockfileIssues(
      rootPath,
      records,
      publicPackageNames,
      expectedVersion,
    ),
    ...collectRuntimeVersionIssues(rootPath, expectedVersion),
  ];

  return { expectedVersion, issues };
}

function usage() {
  return "Usage: node scripts/check-release-version.mjs [expected-version]";
}

function main() {
  const args = process.argv.slice(2);

  if (args.length > 1 || args[0] === "--help" || args[0] === "-h") {
    process.stderr.write(`${usage()}\n`);
    return 1;
  }

  try {
    const { expectedVersion, issues } = checkReleaseVersion(
      process.cwd(),
      args[0],
    );

    if (issues.length > 0) {
      process.stderr.write(
        [
          `DiagramPilot release version metadata is inconsistent for ${expectedVersion}:`,
          ...issues.map((issue) => `- ${issue}`),
          "",
        ].join("\n"),
      );
      return 1;
    }

    process.stdout.write(
      `DiagramPilot release version metadata is consistent at ${expectedVersion}.\n`,
    );
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`Unable to check DiagramPilot release version: ${message}\n`);
    return 1;
  }
}

process.exitCode = main();
