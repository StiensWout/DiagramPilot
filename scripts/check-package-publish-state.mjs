#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const PUBLIC_PACKAGE_SET = [
  "diagrampilot",
  "@diagrampilot/core",
  "@diagrampilot/icons",
  "@diagrampilot/export-mermaid",
  "@diagrampilot/export-d2",
  "@diagrampilot/render-svg",
];

function parseArgs(argv) {
  const expectIndex = argv.indexOf("--expect");

  if (expectIndex === -1) {
    return { expectedState: "available" };
  }

  const expectedState = argv[expectIndex + 1];

  if (!["available", "prealpha", "latest"].includes(expectedState)) {
    return {
      issues: [
        `Unsupported expected publish state ${expectedState ?? "<missing>"}.`,
        "Usage: node scripts/check-package-publish-state.mjs --expect <available|prealpha|latest>",
      ],
    };
  }

  return { expectedState };
}

function runNpmView(packageName) {
  return spawnSync("npm", ["view", packageName, "dist-tags", "--json"], {
    encoding: "utf8",
    env: { ...process.env, FORCE_COLOR: "0", NO_COLOR: "1" },
    maxBuffer: 1024 * 1024,
  });
}

function isPackageNotFound(result) {
  return result.status !== 0 && /(?:npm error code E404|code E404)/u.test(
    `${result.stderr}\n${result.stdout}`,
  );
}

function collectAvailableStateIssues() {
  const issues = [];

  for (const packageName of PUBLIC_PACKAGE_SET) {
    const result = runNpmView(packageName);

    if (isPackageNotFound(result)) {
      continue;
    }

    if (result.status === 0) {
      issues.push(`${packageName} already exists on npm.`);
      continue;
    }

    issues.push(
      `npm view failed for ${packageName}: ${result.stderr.trim() || result.stdout.trim()}`,
    );
  }

  return issues;
}

function readWorkspaceVersion() {
  return JSON.parse(readFileSync("package.json", "utf8")).version;
}

function parseDistTags(packageName, result) {
  if (result.status !== 0) {
    return {
      issues: [
        `npm view failed for ${packageName}: ${result.stderr.trim() || result.stdout.trim()}`,
      ],
    };
  }

  try {
    return { distTags: JSON.parse(result.stdout), issues: [] };
  } catch (error) {
    return {
      issues: [`npm view returned invalid JSON for ${packageName}: ${error.message}.`],
    };
  }
}

function collectPrealphaStateIssues(expectedVersion) {
  const issues = [];

  for (const packageName of PUBLIC_PACKAGE_SET) {
    const result = runNpmView(packageName);
    const { distTags, issues: packageIssues } = parseDistTags(packageName, result);

    issues.push(...packageIssues);

    if (distTags === undefined) {
      continue;
    }

    if (distTags.prealpha !== expectedVersion) {
      issues.push(
        `${packageName} prealpha dist-tag is ${distTags.prealpha ?? "<missing>"}; expected ${expectedVersion}.`,
      );
    }

    if (distTags.latest === expectedVersion) {
      issues.push(`${packageName} latest dist-tag must not point at ${expectedVersion}.`);
    }
  }

  return issues;
}

function collectLatestStateIssues(expectedVersion) {
  const issues = [];

  for (const packageName of PUBLIC_PACKAGE_SET) {
    const result = runNpmView(packageName);
    const { distTags, issues: packageIssues } = parseDistTags(packageName, result);

    issues.push(...packageIssues);

    if (distTags === undefined) {
      continue;
    }

    if (distTags.latest !== expectedVersion) {
      issues.push(
        `${packageName} latest dist-tag is ${distTags.latest ?? "<missing>"}; expected ${expectedVersion}.`,
      );
    }
  }

  return issues;
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.issues !== undefined) {
    process.stderr.write(args.issues.join("\n") + "\n");
    return 1;
  }

  const expectedVersion = readWorkspaceVersion();
  const issues =
    args.expectedState === "prealpha"
      ? collectPrealphaStateIssues(expectedVersion)
      : args.expectedState === "latest"
        ? collectLatestStateIssues(expectedVersion)
        : collectAvailableStateIssues();

  if (issues.length > 0) {
    process.stderr.write(
      [
        "DiagramPilot npm publish-state check failed:",
        ...issues.map((issue) => `- ${issue}`),
      ].join("\n") + "\n",
    );
    return 1;
  }

  if (args.expectedState === "prealpha") {
    process.stdout.write(
      `DiagramPilot npm publish-state check passed: ${PUBLIC_PACKAGE_SET.length} packages publish ${expectedVersion} under prealpha and latest is not moved.\n`,
    );
    return 0;
  }

  if (args.expectedState === "latest") {
    process.stdout.write(
      `DiagramPilot npm publish-state check passed: ${PUBLIC_PACKAGE_SET.length} packages publish ${expectedVersion} under latest.\n`,
    );
    return 0;
  }

  process.stdout.write(
    `DiagramPilot npm publish-state check passed: ${PUBLIC_PACKAGE_SET.length} package names are available on npm.\n`,
  );
  return 0;
}

process.exitCode = main();
