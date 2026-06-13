#!/usr/bin/env node

import { readFileSync } from "node:fs";

const REPOSITORY_URL = "https://github.com/StiensWout/DiagramPilot";
const LINEAR_IDENTIFIER_PATTERN = /\b[A-Z]+-\d+\b/giu;
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
const USAGE = [
  "Usage:",
  "  node scripts/generate-release-notes.mjs --kind final --version <version> [--tag <tag>] [--milestone <name>] [--previous-tag <tag>] [--prs-json <path>] [--highlights-file <path>] [--breaking-changes-file <path>] [--upgrade-notes-file <path>]",
  "  node scripts/generate-release-notes.mjs --kind nightly --version <version> [--tag <tag>] [--branch <name>] [--commit <sha>] [--run-url <url>]",
].join("\n");
const OPTION_FIELDS = new Map([
  ["--kind", "kind"],
  ["--version", "version"],
  ["--tag", "tag"],
  ["--milestone", "milestone"],
  ["--previous-tag", "previousTag"],
  ["--prs-json", "prsJsonPath"],
  ["--highlights-file", "highlightsFile"],
  ["--breaking-changes-file", "breakingChangesFile"],
  ["--upgrade-notes-file", "upgradeNotesFile"],
  ["--branch", "branch"],
  ["--commit", "commit"],
  ["--run-url", "runUrl"],
]);

function parseArgs(args) {
  const parsed = {
    kind: "",
    version: "",
    tag: "",
    milestone: "",
    previousTag: "",
    prsJsonPath: "",
    highlightsFile: "",
    breakingChangesFile: "",
    upgradeNotesFile: "",
    branch: "",
    commit: "",
    runUrl: "",
  };

  for (let index = 0; index < args.length; index += 1) {
    const option = parseOptionArg(args, index);
    parsed[option.fieldName] = option.value;
    index += 1;
  }

  return withParsedDefaults(requireParsedVersion(parsed));
}

function parseOptionArg(args, index) {
  const fieldName = OPTION_FIELDS.get(args[index]);

  if (fieldName === undefined) {
    throw new Error(USAGE);
  }

  return {
    fieldName,
    value: args[index + 1] ?? "",
  };
}

function requireParsedVersion(parsed) {
  if (parsed.version === "") {
    throw new Error(USAGE);
  }

  return parsed;
}

function withParsedDefaults(parsed) {
  return {
    ...parsed,
    kind: parsed.kind === "" ? "final" : parsed.kind,
    tag: parsed.tag === "" ? `v${parsed.version}` : parsed.tag,
  };
}

function validateReleaseTag(tag, version, label = "Release Version") {
  return tag === `v${version}`
    ? undefined
    : `Release tag ${tag} does not match ${label} ${version}.`;
}

function readOptionalFile(path, fallback) {
  if (path === "") {
    return fallback;
  }

  const content = readFileSync(path, "utf8").trim();

  return content === "" ? fallback : content;
}

function readPullRequests(path) {
  if (path === "") {
    return [];
  }

  const parsed = JSON.parse(readFileSync(path, "utf8"));

  if (!Array.isArray(parsed)) {
    throw new Error(`PR JSON ${path} must contain an array.`);
  }

  return parsed;
}

function packageLinkLine(label, packageName, version) {
  return `${label}: ${packageUrl(packageName, version)}`;
}

function packageUrl(packageName, version) {
  return `https://www.npmjs.com/package/${packageName}/v/${version}`;
}

function appendPackageLinks(output, version) {
  for (const packageName of PUBLIC_PACKAGE_SET) {
    output.push(`- ${packageName}: ${packageUrl(packageName, version)}`);
  }
}

function formatPullRequests(prs) {
  if (prs.length === 0) {
    return "- No merged pull requests were provided for this release.";
  }

  return prs.map(formatPullRequest).join("\n");
}

function formatPullRequest(pr) {
  const title = stringField(pr.title, "Untitled pull request");

  return `- ${[
    title,
    formatMissingBranchIssueRefs(title, pr.headRefName),
    formatPullRequestNumber(pr.number),
    formatPullRequestAuthor(pr.author?.login),
    formatPullRequestLink(pr.url),
  ].join("")}`;
}

function formatMissingBranchIssueRefs(title, branchName) {
  const titleRefs = collectLinearIssueRefs(title);
  const branchRefs = collectLinearIssueRefs(branchName);
  const missingRefs = [...branchRefs].filter((ref) => !titleRefs.has(ref));

  return missingRefs.length === 0 ? "" : ` (${missingRefs.join(", ")})`;
}

function collectLinearIssueRefs(value) {
  const refs = new Set();
  const text = stringField(value, "");

  for (const match of text.matchAll(LINEAR_IDENTIFIER_PATTERN)) {
    refs.add(match[0].toUpperCase());
  }

  return refs;
}

function formatPullRequestNumber(number) {
  return number === undefined ? "" : ` #${number}`;
}

function formatPullRequestAuthor(login) {
  const authorLogin = stringField(login, "");

  return authorLogin === "" ? "" : ` by @${authorLogin}`;
}

function formatPullRequestLink(url) {
  const pullRequestUrl = stringField(url, "");

  return pullRequestUrl === "" ? "" : ` in ${pullRequestUrl}`;
}

function stringField(value, fallback) {
  return typeof value === "string" && value !== "" ? value : fallback;
}

function formatFinalReleaseNotes(options) {
  const { version, tag } = options;

  validateFinalReleaseOptions(options);

  const prs = readPullRequests(options.prsJsonPath);
  const highlights = readOptionalFile(
    options.highlightsFile,
    "- See What's Changed for the merged milestone work.",
  );
  const breakingChanges = readOptionalFile(options.breakingChangesFile, "None.");
  const upgradeNotes = readOptionalFile(options.upgradeNotesFile, "None.");
  const output = [
    `# DiagramPilot ${tag}`,
    "",
    `Release Version: ${version}`,
    `Tag: ${tag}`,
  ];

  if (options.milestone !== "") {
    output.push(`Milestone: ${options.milestone}`);
  }

  output.push(
    packageLinkLine("npm", "diagrampilot", version),
    "Public Website: https://diagrampilot.com",
    "",
    "## Highlights",
    "",
    highlights,
    "",
    "## What's Changed",
    "",
    formatPullRequests(prs),
    "",
    "## Breaking Changes",
    "",
    breakingChanges,
    "",
    "## Upgrade Notes",
    "",
    upgradeNotes,
    "",
    "## Packages",
    "",
  );
  appendPackageLinks(output, version);
  output.push("", "## Full Changelog", "", fullChangelogLine(options), "");

  return output.join("\n");
}

function validateFinalReleaseOptions({ version, tag }) {
  const error = validateReleaseTag(tag, version);

  if (error !== undefined) {
    throw new Error(error);
  }
}

function fullChangelogLine({ previousTag, tag }) {
  return previousTag === ""
    ? `${REPOSITORY_URL}/releases/tag/${tag}`
    : `${REPOSITORY_URL}/compare/${previousTag}...${tag}`;
}

function formatNightlyReleaseNotes(options) {
  const { version, tag } = options;

  validateNightlyReleaseOptions(options);

  const output = [
    `# DiagramPilot ${tag}`,
    "",
    "Pre-release: true",
    `Release Version: ${version}`,
    `Tag: ${tag}`,
    "Dist Tag: nightly",
  ];

  if (options.branch !== "") {
    output.push(`Branch: ${options.branch}`);
  }

  if (options.commit !== "") {
    output.push(`Commit: ${options.commit.slice(0, 7)}`);
  }

  if (options.runUrl !== "") {
    output.push(`Run: ${options.runUrl}`);
  }

  output.push(
    packageLinkLine("npm", "diagrampilot", version),
    "Install: `npm install --save-dev --save-exact diagrampilot@nightly`",
    "",
    "## Packages",
    "",
  );
  appendPackageLinks(output, version);
  output.push(
    "",
    "## Validation",
    "",
    "This nightly was produced by the GitHub release workflow after validation and package publish checks.",
    "",
  );

  return output.join("\n");
}

function validateNightlyReleaseOptions({ version, tag }) {
  const error = validateReleaseTag(tag, version);

  if (error !== undefined) {
    throw new Error(error);
  }
}

const RELEASE_NOTE_GENERATORS = new Map([
  ["final", formatFinalReleaseNotes],
  ["nightly", formatNightlyReleaseNotes],
]);

function generateReleaseNotes(options) {
  const generator = RELEASE_NOTE_GENERATORS.get(options.kind);

  if (generator === undefined) {
    throw new Error(USAGE);
  }

  return generator(options);
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const releaseNotes = generateReleaseNotes(options);

  process.stdout.write(releaseNotes);
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Unable to generate DiagramPilot release notes: ${message}\n`);
  process.exitCode = 1;
}
