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

function collectDependencyVersionIssues(
  location,
  dependencies,
  publicPackageNames,
  expectedVersion,
) {
  const issues = [];

  for (const [dependencyName, dependencyVersion] of Object.entries(dependencies)) {
    if (
      publicPackageNames.has(dependencyName) &&
      dependencyVersion !== expectedVersion
    ) {
      issues.push(
        `${location}.${dependencyName} is ${dependencyVersion}; expected exact ${expectedVersion}.`,
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

      issues.push(
        ...collectDependencyVersionIssues(
          `${record.repoPath} ${field}`,
          dependencies,
          publicPackageNames,
          expectedVersion,
        ),
      );
    }
  }

  return issues;
}

function collectLockfileRootIssues(lockfile, expectedVersion) {
  const issues = [];

  if (lockfile.version !== expectedVersion) {
    issues.push(
      `package-lock.json root version is ${lockfile.version}; expected ${expectedVersion}.`,
    );
  }

  if (lockfile.packages === undefined || typeof lockfile.packages !== "object") {
    issues.push("package-lock.json packages metadata is missing.");
  }

  return issues;
}

function collectLockfilePackageRecordIssues(lockfilePackages, records, expectedVersion) {
  return records.flatMap((record) =>
    collectLockfilePackageRecordIssue(
      lockfilePackages[record.lockKey],
      record,
      expectedVersion,
    ),
  );
}

function collectLockfilePackageRecordIssue(lockPackage, record, expectedVersion) {
  const displayKey = record.lockKey || "<root>";

  if (lockPackage === undefined) {
    return [`package-lock.json packages.${displayKey} is missing.`];
  }

  if (lockPackage.version !== expectedVersion) {
    return [
      `package-lock.json packages.${displayKey}.version is ${lockPackage.version}; expected ${expectedVersion}.`,
    ];
  }

  return [];
}

function collectLockfileDependencyIssues(
  lockfilePackages,
  publicPackageNames,
  expectedVersion,
) {
  return Object.entries(lockfilePackages).flatMap(([lockKey, lockPackage]) =>
    collectLockfilePackageDependencyIssues(
      lockKey,
      lockPackage,
      publicPackageNames,
      expectedVersion,
    ),
  );
}

function collectLockfilePackageDependencyIssues(
  lockKey,
  lockPackage,
  publicPackageNames,
  expectedVersion,
) {
  return DEPENDENCY_FIELDS.flatMap((field) => {
    const dependencies = lockPackage[field];

    if (dependencies === undefined) {
      return [];
    }

    return collectDependencyVersionIssues(
      `package-lock.json packages.${lockKey || "<root>"}.${field}`,
      dependencies,
      publicPackageNames,
      expectedVersion,
    );
  });
}

function collectLockfileIssues(
  rootPath,
  records,
  publicPackageNames,
  expectedVersion,
) {
  const lockfilePath = path.join(rootPath, "package-lock.json");
  const lockfile = readJson(lockfilePath);
  const rootIssues = collectLockfileRootIssues(lockfile, expectedVersion);

  if (lockfile.packages === undefined || typeof lockfile.packages !== "object") {
    return rootIssues;
  }

  return [
    ...rootIssues,
    ...collectLockfilePackageRecordIssues(
      lockfile.packages,
      records,
      expectedVersion,
    ),
    ...collectLockfileDependencyIssues(
      lockfile.packages,
      publicPackageNames,
      expectedVersion,
    ),
  ];
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

function parseArgs(args) {
  if (args.length > 1 || args[0] === "--help" || args[0] === "-h") {
    return {
      ok: false,
    };
  }

  return {
    ok: true,
    expectedVersion: args[0],
  };
}

function reportReleaseVersionIssues(expectedVersion, issues) {
  process.stderr.write(
    [
      `DiagramPilot release version metadata is inconsistent for ${expectedVersion}:`,
      ...issues.map((issue) => `- ${issue}`),
      "",
    ].join("\n"),
  );
}

function runReleaseVersionCheck(explicitExpectedVersion) {
  const { expectedVersion, issues } = checkReleaseVersion(
    process.cwd(),
    explicitExpectedVersion,
  );

  if (issues.length > 0) {
    reportReleaseVersionIssues(expectedVersion, issues);
    return 1;
  }

  process.stdout.write(
    `DiagramPilot release version metadata is consistent at ${expectedVersion}.\n`,
  );
  return 0;
}

function main() {
  const args = process.argv.slice(2);
  const parsedArgs = parseArgs(args);

  if (!parsedArgs.ok) {
    process.stderr.write(`${usage()}\n`);
    return 1;
  }

  try {
    return runReleaseVersionCheck(parsedArgs.expectedVersion);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`Unable to check DiagramPilot release version: ${message}\n`);
    return 1;
  }
}

process.exitCode = main();
