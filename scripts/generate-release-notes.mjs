#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const SECTION_LABELS = new Map([
  ["What to build", "Summary"],
  ["Implementation notes", "Implementation Notes"],
  ["Validation results", "Validation Results"],
  ["User-facing docs links", "User-Facing Docs Links"],
  ["Known limitations", "Known Limitations"],
  ["Follow-up", "Follow-Up"],
]);
const USAGE =
  "Usage: node scripts/generate-release-notes.mjs [--issue <path>] --version <version> [--tag <tag>]";

function parseArgs(args) {
  const parsed = {
    issuePath: "",
    version: "",
    tag: "",
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const value = args[index + 1] ?? "";

    if (arg === "--issue") {
      parsed.issuePath = value;
      index += 1;
      continue;
    }

    if (arg === "--version") {
      parsed.version = value;
      index += 1;
      continue;
    }

    if (arg === "--tag") {
      parsed.tag = value;
      index += 1;
      continue;
    }

    throw new Error(
      USAGE,
    );
  }

  if (parsed.version === "") {
    throw new Error(USAGE);
  }

  if (parsed.tag === "") {
    parsed.tag = `v${parsed.version}`;
  }

  return parsed;
}

function readIssue(pathValue) {
  const resolvedPath = path.resolve(pathValue);
  return readFileSync(resolvedPath, "utf8");
}

function findIssueFiles(root) {
  const scratchRoot = path.join(root, ".scratch");
  const issueFiles = [];

  if (!existsSync(scratchRoot)) {
    return issueFiles;
  }

  function visit(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const entryPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        visit(entryPath);
        continue;
      }

      if (
        entry.isFile() &&
        entry.name.match(/^\d+-.+\.md$/u) !== null &&
        path.basename(path.dirname(entryPath)) === "issues"
      ) {
        issueFiles.push(entryPath);
      }
    }
  }

  if (statSync(scratchRoot).isDirectory()) {
    visit(scratchRoot);
  }

  return issueFiles;
}

function findIssuePathByVersion(version) {
  const matches = [];

  for (const issuePath of findIssueFiles(process.cwd())) {
    const issueText = readIssue(issuePath);
    if (readMetadata(issueText, "Issue Version") === version) {
      matches.push(issuePath);
    }
  }

  if (matches.length === 0) {
    throw new Error(`No local issue file has Issue Version ${version}.`);
  }

  if (matches.length > 1) {
    throw new Error(
      `Multiple local issue files have Issue Version ${version}: ${matches.join(", ")}`,
    );
  }

  return matches[0];
}

function readMetadata(issueText, name) {
  const match = issueText.match(new RegExp(`^${name}:\\s*(.+)$`, "mu"));

  return match?.[1]?.trim() ?? "";
}

function readIssueTitle(issueText) {
  const match = issueText.match(/^#\s+(.+)$/mu);

  if (match === null) {
    throw new Error("Issue file is missing an H1 title.");
  }

  return match[1].trim();
}

function readSections(issueText) {
  const sections = new Map();
  const headingPattern = /^##\s+(.+)$/gmu;
  const headings = [...issueText.matchAll(headingPattern)];

  for (let index = 0; index < headings.length; index += 1) {
    const heading = headings[index];
    const title = heading[1].trim();
    const contentStart = heading.index + heading[0].length;
    const nextHeading = headings[index + 1];
    const contentEnd = nextHeading?.index ?? issueText.length;
    const content = issueText.slice(contentStart, contentEnd).trim();

    sections.set(title, content);
  }

  return sections;
}

function formatReleaseNotes({ issueText, version, tag }) {
  const status = readMetadata(issueText, "Status");
  const issueVersion = readMetadata(issueText, "Issue Version");
  const title = readIssueTitle(issueText);
  const sections = readSections(issueText);

  if (status !== "completed") {
    throw new Error(
      `Issue status must be completed before generating release notes; found ${status || "missing"}.`,
    );
  }

  if (issueVersion !== version) {
    throw new Error(
      `Issue Version ${issueVersion || "missing"} does not match requested release version ${version}.`,
    );
  }

  if (tag !== `v${version}`) {
    throw new Error(`Release tag ${tag} does not match Issue Version ${version}.`);
  }

  const output = [
    `# DiagramPilot ${tag}`,
    "",
    `Issue: ${title}`,
    `Issue Version: ${issueVersion}`,
    `Tag: ${tag}`,
    `npm: https://www.npmjs.com/package/diagrampilot/v/${version}`,
    "Public Website: https://diagrampilot.com",
  ];

  for (const [sectionName, outputName] of SECTION_LABELS.entries()) {
    const content = sections.get(sectionName);

    if (content !== undefined && content !== "") {
      output.push("", `## ${outputName}`, "", content);
    }
  }

  output.push("");

  return output.join("\n");
}

function main() {
  const { issuePath, version, tag } = parseArgs(process.argv.slice(2));
  const selectedIssuePath =
    issuePath === "" ? findIssuePathByVersion(version) : issuePath;
  const issueText = readIssue(selectedIssuePath);
  const releaseNotes = formatReleaseNotes({ issueText, version, tag });

  process.stdout.write(releaseNotes);
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Unable to generate DiagramPilot release notes: ${message}\n`);
  process.exitCode = 1;
}
