#!/usr/bin/env node
import { readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

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
const PUBLIC_PACKAGE_SET = [
  {
    name: "diagrampilot",
    repoPath: "packages/cli/package.json",
    directory: "packages/cli",
    bin: {
      diagrampilot: "dist/index.js",
    },
  },
  {
    name: "@diagrampilot/core",
    repoPath: "packages/core/package.json",
    directory: "packages/core",
  },
  {
    name: "@diagrampilot/icons",
    repoPath: "packages/icons/package.json",
    directory: "packages/icons",
  },
  {
    name: "@diagrampilot/export-mermaid",
    repoPath: "packages/export-mermaid/package.json",
    directory: "packages/export-mermaid",
  },
  {
    name: "@diagrampilot/export-d2",
    repoPath: "packages/export-d2/package.json",
    directory: "packages/export-d2",
  },
  {
    name: "@diagrampilot/export-dot",
    repoPath: "packages/export-dot/package.json",
    directory: "packages/export-dot",
  },
  {
    name: "@diagrampilot/mcp",
    repoPath: "packages/mcp/package.json",
    directory: "packages/mcp",
    bin: {
      "diagrampilot-mcp": "dist/index.js",
    },
  },
  {
    name: "@diagrampilot/render-svg",
    repoPath: "packages/render-svg/package.json",
    directory: "packages/render-svg",
  },
];
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
  const issues = [];

  for (const workspace of PRIVATE_WORKSPACES) {
    const manifest = readJson(rootPath, workspace.repoPath);

    if (manifest.name !== workspace.name) {
      issues.push(
        `${workspace.repoPath} name is ${manifest.name}; expected ${workspace.name}.`,
      );
    }

    if (manifest.private !== true) {
      issues.push(`${workspace.repoPath} must remain private and unpublished.`);
    }

    if (manifest.license !== "MIT") {
      issues.push(`${workspace.repoPath} license is ${manifest.license}; expected MIT.`);
    }

    if (manifest.publishConfig !== undefined) {
      issues.push(`${workspace.repoPath} must not define publishConfig.`);
    }
  }

  return issues;
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
  const issues = [];

  issues.push(
    ...collectExpectedManifestValueIssues(packageRecord.repoPath, [
      {
        manifest,
        fieldPath: "publishConfig.access",
        label: "publishConfig.access",
        expected: "public",
      },
    ]),
  );

  if (sortedJson(manifest.files ?? []) !== sortedJson(REQUIRED_FILES)) {
    issues.push(
      `${packageRecord.repoPath} files must publish dist JS/types, maps, LICENSE, and README.md only.`,
    );
  }

  if (
    packageRecord.bin !== undefined &&
    sortedObjectJson(manifest.bin) !== sortedObjectJson(packageRecord.bin)
  ) {
    issues.push(
      `${packageRecord.repoPath} bin must publish the diagrampilot executable without npm manifest auto-correction.`,
    );
  }

  return issues;
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

function runNpmPackDryRun(rootPath, packageName) {
  const result = spawnSync(
    "npm",
    ["pack", "--dry-run", "--json", "--workspace", packageName],
    {
      cwd: rootPath,
      encoding: "utf8",
      env: { ...process.env, FORCE_COLOR: "0", NO_COLOR: "1" },
      maxBuffer: 1024 * 1024 * 4,
    },
  );

  if (result.status !== 0) {
    return {
      issues: [
        `npm pack --dry-run failed for ${packageName}: ${result.stderr.trim() || result.stdout.trim()}`,
      ],
    };
  }

  try {
    const packResult = JSON.parse(result.stdout);

    if (!Array.isArray(packResult) || packResult.length !== 1) {
      return {
        issues: [`npm pack --dry-run returned unexpected JSON for ${packageName}.`],
      };
    }

    return { packResult: packResult[0], issues: [] };
  } catch (error) {
    return {
      issues: [`npm pack --dry-run returned invalid JSON for ${packageName}: ${error.message}.`],
    };
  }
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
  const issues = [];
  const fileSet = new Set(files);

  for (const requiredPath of [
    "package.json",
    "LICENSE",
    "README.md",
    "dist/index.js",
    "dist/index.d.ts",
  ]) {
    if (!fileSet.has(requiredPath)) {
      issues.push(`${packageRecord.name} tarball must include ${requiredPath}.`);
    }
  }

  for (const filePath of files) {
    if (!ALLOWED_TARBALL_FILE_PATTERN.test(filePath)) {
      issues.push(`${packageRecord.name} tarball includes unexpected file ${filePath}.`);
    }

    if (FORBIDDEN_TARBALL_FILE_PATTERNS.some((pattern) => pattern.test(filePath))) {
      issues.push(`${packageRecord.name} tarball includes forbidden file ${filePath}.`);
    }
  }

  return issues;
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

  if (issues.length > 0) {
    process.stderr.write(
      [
        "DiagramPilot package readiness checks failed:",
        ...issues.map((issue) => `- ${issue}`),
      ].join("\n") + "\n",
    );
    return 1;
  }

  process.stdout.write(
    `DiagramPilot package readiness checks passed for ${PUBLIC_PACKAGE_SET.length} public packages.\n`,
  );
  return 0;
}

process.exitCode = main();
