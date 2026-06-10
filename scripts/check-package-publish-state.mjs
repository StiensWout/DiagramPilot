#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const PUBLIC_PACKAGE_SET = [
  "diagrampilot",
  "@diagrampilot/core",
  "@diagrampilot/icons",
  "@diagrampilot/export-mermaid",
  "@diagrampilot/export-d2",
  "@diagrampilot/export-dot",
  "@diagrampilot/mcp",
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
  return [...PUBLIC_PACKAGE_SET].flatMap(collectAvailablePackageIssues);
}

function collectAvailablePackageIssues(packageName) {
  const result = runNpmView(packageName);

  if (isPackageNotFound(result)) {
    return [];
  }

  if (result.status === 0) {
    return [`${packageName} already exists on npm.`];
  }

  return [
    `npm view failed for ${packageName}: ${result.stderr.trim() || result.stdout.trim()}`,
  ];
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

function collectTaggedPackageIssues(packageName, expectedVersion, options) {
  const { distTags, issues } = parseDistTags(packageName, runNpmView(packageName));

  if (distTags === undefined) return issues;

  return [
    ...issues,
    ...collectExpectedDistTagIssue(packageName, expectedVersion, options, distTags),
    ...collectLatestDistTagIssue(packageName, expectedVersion, options, distTags),
  ];
}

function collectExpectedDistTagIssue(packageName, expectedVersion, options, distTags) {
  if (distTags[options.expectedTag] === expectedVersion) {
    return [];
  }

  return [
    `${packageName} ${options.expectedTag} dist-tag is ${distTags[options.expectedTag] ?? "<missing>"}; expected ${expectedVersion}.`,
  ];
}

function collectLatestDistTagIssue(packageName, expectedVersion, options, distTags) {
  if (!options.latestMustNotMove || distTags.latest !== expectedVersion) {
    return [];
  }

  return [`${packageName} latest dist-tag must not point at ${expectedVersion}.`];
}

function collectTaggedStateIssues(expectedVersion, options) {
  return PUBLIC_PACKAGE_SET.flatMap((packageName) =>
    collectTaggedPackageIssues(packageName, expectedVersion, options),
  );
}

function collectPrealphaStateIssues(expectedVersion) {
  return collectTaggedStateIssues(expectedVersion, {
    expectedTag: "prealpha",
    latestMustNotMove: true,
  });
}

function collectLatestStateIssues(expectedVersion) {
  return collectTaggedStateIssues(expectedVersion, {
    expectedTag: "latest",
    latestMustNotMove: false,
  });
}

function collectExpectedStateIssues(expectedState, expectedVersion) {
  const collectors = {
    available: () => collectAvailableStateIssues(),
    prealpha: () => collectPrealphaStateIssues(expectedVersion),
    latest: () => collectLatestStateIssues(expectedVersion),
  };

  return collectors[expectedState]();
}

function successMessage(expectedState, expectedVersion) {
  const messages = {
    available: `DiagramPilot npm publish-state check passed: ${PUBLIC_PACKAGE_SET.length} package names are available on npm.\n`,
    prealpha: `DiagramPilot npm publish-state check passed: ${PUBLIC_PACKAGE_SET.length} packages publish ${expectedVersion} under prealpha and latest is not moved.\n`,
    latest: `DiagramPilot npm publish-state check passed: ${PUBLIC_PACKAGE_SET.length} packages publish ${expectedVersion} under latest.\n`,
  };

  return messages[expectedState];
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.issues !== undefined) {
    process.stderr.write(args.issues.join("\n") + "\n");
    return 1;
  }

  const expectedVersion = readWorkspaceVersion();
  const issues = collectExpectedStateIssues(args.expectedState, expectedVersion);

  if (issues.length > 0) {
    process.stderr.write(
      [
        "DiagramPilot npm publish-state check failed:",
        ...issues.map((issue) => `- ${issue}`),
      ].join("\n") + "\n",
    );
    return 1;
  }

  process.stdout.write(successMessage(args.expectedState, expectedVersion));
  return 0;
}

process.exitCode = main();
