#!/usr/bin/env node
import { readFileSync } from "node:fs";
import path from "node:path";

import { finishPackageCheck } from "./package-check-runner.mjs";
import { runNpmPackDryRun } from "./package-pack-dry-run.mjs";
import { PUBLIC_PACKAGE_SET } from "./public-package-set.mjs";

const REPOSITORY_URL = "git+https://github.com/StiensWout/DiagramPilot.git";
const BUGS_URL = "https://github.com/StiensWout/DiagramPilot/issues";
const HOMEPAGE_URL = "https://diagrampilot.com";
const REQUIRED_FILES = [
  "dist/**/*.d.ts",
  "dist/**/*.d.ts.map",
  "dist/**/*.js",
  "dist/**/*.js.map",
  "LICENSE",
  "README.md",
];
const REQUIRED_KEYWORDS = ["diagrampilot", "diagramspec", "diagram"];
const PRIVATE_WORKSPACES = [
  {
    name: "@diagrampilot/workspace",
    repoPath: "package.json",
  },
  {
    name: "@diagrampilot/website",
    repoPath: "website/package.json",
  },
];
const ALLOWED_TARBALL_FILE_PATTERN =
  /^(?:package\.json|LICENSE|README\.md|dist\/.+\.(?:d\.ts|d\.ts\.map|js|js\.map))$/u;
const FORBIDDEN_TARBALL_FILE_PATTERNS = [
  /^\.scratch\//u,
  /^CONTEXT\.md$/u,
  /^AGENTS\.md$/u,
  /^docs\//u,
  /^docs-public\//u,
  /^website\//u,
  /^demo-projects\//u,
  /^test\//u,
  /^scripts\//u,
  /^src\//u,
  /(^|\/)\.cache\//u,
  /(^|\/)\.tsbuildinfo$/u,
  /(^|\/)architecture\.svg$/u,
  /(^|\/)visual-report\//u,
  /(^|\/)playwright-report\//u,
];

function readJson(rootPath, repoPath) {
  return JSON.parse(readFileSync(path.join(rootPath, repoPath), "utf8"));
}

function sortedJson(values) {
  return JSON.stringify([...values].sort());
}

function sortedObjectJson(value) {
  return JSON.stringify(
    Object.fromEntries(Object.entries(value ?? {}).sort(([left], [right]) => {
      return left.localeCompare(right);
    })),
  );
}

function collectPrivateWorkspaceIssues(rootPath) {
  return PRIVATE_WORKSPACES.flatMap((workspace) =>
    collectPrivateWorkspaceManifestIssues(
      workspace,
      readJson(rootPath, workspace.repoPath),
    ),
  );
}

function collectPrivateWorkspaceManifestIssues(workspace, manifest) {
  return [
    ...collectPrivateWorkspaceNameIssue(workspace, manifest),
    ...collectPrivateWorkspacePrivateIssue(workspace, manifest),
    ...collectPrivateWorkspaceLicenseIssue(workspace, manifest),
    ...collectPrivateWorkspacePublishConfigIssue(workspace, manifest),
  ];
}

function collectPrivateWorkspaceNameIssue(workspace, manifest) {
  return manifest.name === workspace.name
    ? []
    : [`${workspace.repoPath} name is ${manifest.name}; expected ${workspace.name}.`];
}

function collectPrivateWorkspacePrivateIssue(workspace, manifest) {
  return manifest.private === true
    ? []
    : [`${workspace.repoPath} must remain private and unpublished.`];
}

function collectPrivateWorkspaceLicenseIssue(workspace, manifest) {
  return manifest.license === "MIT"
    ? []
    : [`${workspace.repoPath} license is ${manifest.license}; expected MIT.`];
}

function collectPrivateWorkspacePublishConfigIssue(workspace, manifest) {
  return manifest.publishConfig === undefined
    ? []
    : [`${workspace.repoPath} must not define publishConfig.`];
}

function collectPublicPackageIdentityIssues(packageRecord, manifest) {
  const issues = [];

  if (manifest.name !== packageRecord.name) {
    issues.push(
      `${packageRecord.repoPath} name is ${manifest.name}; expected ${packageRecord.name}.`,
    );
  }

  if (manifest.private === true) {
    issues.push(`${packageRecord.repoPath} must be publishable.`);
  }

  if (manifest.license !== "MIT") {
    issues.push(`${packageRecord.repoPath} license is ${manifest.license}; expected MIT.`);
  }

  return issues;
}

function nestedManifestValue(manifest, fieldPath) {
  let current = manifest;

  for (const fieldName of fieldPath.split(".")) {
    if (current === undefined || current === null) {
      return undefined;
    }

    current = current[fieldName];
  }

  return current;
}

function collectExpectedManifestValueIssues(repoPath, expectations) {
  const issues = [];

  for (const expectation of expectations) {
    const actual = nestedManifestValue(expectation.manifest, expectation.fieldPath);

    if (actual !== expectation.expected) {
      issues.push(
        `${repoPath} ${expectation.label} is ${actual}; expected ${expectation.expected}.`,
      );
    }
  }

  return issues;
}

function collectPublicPackageRepositoryIssues(packageRecord, manifest) {
  return collectExpectedManifestValueIssues(packageRecord.repoPath, [
    {
      manifest,
      fieldPath: "repository.type",
      label: "repository.type",
      expected: "git",
    },
    {
      manifest,
      fieldPath: "repository.url",
      label: "repository.url",
      expected: REPOSITORY_URL,
    },
    {
      manifest,
      fieldPath: "repository.directory",
      label: "repository.directory",
      expected: packageRecord.directory,
    },
  ]);
}

function collectPublicPackageUrlIssues(packageRecord, manifest) {
  return collectExpectedManifestValueIssues(packageRecord.repoPath, [
    {
      manifest,
      fieldPath: "homepage",
      label: "homepage",
      expected: HOMEPAGE_URL,
    },
    {
      manifest,
      fieldPath: "bugs.url",
      label: "bugs.url",
      expected: BUGS_URL,
    },
  ]);
}

function collectPublicPackageKeywordIssues(packageRecord, manifest) {
  const issues = [];

  for (const keyword of REQUIRED_KEYWORDS) {
    if (!manifest.keywords?.includes(keyword)) {
      issues.push(`${packageRecord.repoPath} keywords must include ${keyword}.`);
    }
  }

  return issues;
}

function collectPublicPackagePublishIssues(packageRecord, manifest) {
  return [
    ...collectPublicPublishAccessIssues(packageRecord, manifest),
    ...collectPublicPackageFilesIssues(packageRecord, manifest),
    ...collectPublicPackageBinIssues(packageRecord, manifest),
  ];
}

function collectPublicPublishAccessIssues(packageRecord, manifest) {
  return collectExpectedManifestValueIssues(packageRecord.repoPath, [
    {
      manifest,
      fieldPath: "publishConfig.access",
      label: "publishConfig.access",
      expected: "public",
    },
  ]);
}

function collectPublicPackageFilesIssues(packageRecord, manifest) {
  return sortedJson(manifest.files ?? []) === sortedJson(REQUIRED_FILES)
    ? []
    : [
        `${packageRecord.repoPath} files must publish dist JS/types, maps, LICENSE, and README.md only.`,
      ];
}

function collectPublicPackageBinIssues(packageRecord, manifest) {
  if (packageRecord.bin === undefined) {
    return [];
  }

  return sortedObjectJson(manifest.bin) === sortedObjectJson(packageRecord.bin)
    ? []
    : [
        `${packageRecord.repoPath} bin must publish the diagrampilot executable without npm manifest auto-correction.`,
      ];
}

function collectPublicPackageManifestIssues(rootPath, packageRecord) {
  const manifest = readJson(rootPath, packageRecord.repoPath);

  return [
    ...collectPublicPackageIdentityIssues(packageRecord, manifest),
    ...collectPublicPackageRepositoryIssues(packageRecord, manifest),
    ...collectPublicPackageUrlIssues(packageRecord, manifest),
    ...collectPublicPackageKeywordIssues(packageRecord, manifest),
    ...collectPublicPackagePublishIssues(packageRecord, manifest),
  ];
}

function collectPublicPackageMetadataIssues(rootPath) {
  return PUBLIC_PACKAGE_SET.flatMap((packageRecord) =>
    collectPublicPackageManifestIssues(rootPath, packageRecord),
  );
}

function collectPackageLicenseIssues(rootPath, packageRecord, rootLicense) {
  const packageLicensePath = path.join(
    rootPath,
    packageRecord.directory,
    "LICENSE",
  );
  const packageLicense = readFileSync(packageLicensePath, "utf8");

  if (packageLicense.trim() !== rootLicense.trim()) {
    return [`${packageRecord.directory}/LICENSE must match the root MIT license.`];
  }

  return [];
}

function collectTarballFileIssues(packageRecord, files) {
  const fileSet = new Set(files);
  return [
    ...collectRequiredTarballFileIssues(packageRecord, fileSet),
    ...files.flatMap((filePath) =>
      collectPublishedTarballFileIssues(packageRecord, filePath),
    ),
  ];
}

function collectRequiredTarballFileIssues(packageRecord, fileSet) {
  return [
    "package.json",
    "LICENSE",
    "README.md",
    "dist/index.js",
    "dist/index.d.ts",
  ].flatMap((requiredPath) =>
    fileSet.has(requiredPath)
      ? []
      : [`${packageRecord.name} tarball must include ${requiredPath}.`],
  );
}

function collectPublishedTarballFileIssues(packageRecord, filePath) {
  return [
    ...collectUnexpectedTarballFileIssue(packageRecord, filePath),
    ...collectForbiddenTarballFileIssue(packageRecord, filePath),
  ];
}

function collectUnexpectedTarballFileIssue(packageRecord, filePath) {
  return ALLOWED_TARBALL_FILE_PATTERN.test(filePath)
    ? []
    : [`${packageRecord.name} tarball includes unexpected file ${filePath}.`];
}

function collectForbiddenTarballFileIssue(packageRecord, filePath) {
  return FORBIDDEN_TARBALL_FILE_PATTERNS.some((pattern) => pattern.test(filePath))
    ? [`${packageRecord.name} tarball includes forbidden file ${filePath}.`]
    : [];
}

function collectTarballIssues(rootPath) {
  const issues = [];
  const rootLicense = readFileSync(path.join(rootPath, "LICENSE"), "utf8");

  if (!/^MIT License$/mu.test(rootLicense)) {
    issues.push("LICENSE must contain the MIT license text.");
  }

  for (const packageRecord of PUBLIC_PACKAGE_SET) {
    issues.push(...collectPackageLicenseIssues(rootPath, packageRecord, rootLicense));

    const { packResult, issues: packIssues } = runNpmPackDryRun(
      rootPath,
      packageRecord.name,
    );
    issues.push(...packIssues);

    if (packResult === undefined) {
      continue;
    }

    const files = packResult.files.map((file) => file.path).sort();
    issues.push(...collectTarballFileIssues(packageRecord, files));
  }

  return issues;
}

function checkPackageReadiness(rootPath) {
  return [
    ...collectPrivateWorkspaceIssues(rootPath),
    ...collectPublicPackageMetadataIssues(rootPath),
    ...collectTarballIssues(rootPath),
  ];
}

function main() {
  const issues = checkPackageReadiness(process.cwd());

  return finishPackageCheck({
    issues,
    failureTitle: "DiagramPilot package readiness checks failed:",
    successMessage: `DiagramPilot package readiness checks passed for ${PUBLIC_PACKAGE_SET.length} public packages.`,
  });
}

process.exitCode = main();
