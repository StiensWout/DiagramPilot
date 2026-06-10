#!/usr/bin/env node

import {
  findIssuePathByVersion,
  readIssueMetadata,
  readIssueText,
  readIssueTitle,
} from "./release-issue-utils.mjs";

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
const OPTION_FIELDS = new Map([
  ["--issue", "issuePath"],
  ["--version", "version"],
  ["--tag", "tag"],
]);

function parseArgs(args) {
  const parsed = {
    issuePath: "",
    version: "",
    tag: "",
  };

  for (let index = 0; index < args.length; index += 1) {
    const option = parseOptionArg(args, index);
    parsed[option.fieldName] = option.value;
    index += 1;
  }

  return withDefaultReleaseTag(requireParsedVersion(parsed));
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

function withDefaultReleaseTag(parsed) {
  return {
    ...parsed,
    tag: parsed.tag === "" ? `v${parsed.version}` : parsed.tag,
  };
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

function validateReleaseIssueMetadata({ status, issueVersion, version, tag }) {
  const error = [
    validateCompletedIssueStatus(status),
    validateIssueVersion(issueVersion, version),
    validateReleaseTag(tag, version),
  ].find((message) => message !== undefined);

  if (error !== undefined) throw new Error(error);
}

function validateCompletedIssueStatus(status) {
  return status === "completed"
    ? undefined
    : `Issue status must be completed before generating release notes; found ${status || "missing"}.`;
}

function validateIssueVersion(issueVersion, version) {
  return issueVersion === version
    ? undefined
    : `Issue Version ${issueVersion || "missing"} does not match requested release version ${version}.`;
}

function validateReleaseTag(tag, version) {
  return tag === `v${version}`
    ? undefined
    : `Release tag ${tag} does not match Issue Version ${version}.`;
}

function appendReleaseSections(output, sections) {
  for (const [sectionName, outputName] of SECTION_LABELS.entries()) {
    const content = sections.get(sectionName);

    if (content !== undefined && content !== "") {
      output.push("", `## ${outputName}`, "", content);
    }
  }
}

function formatReleaseNotes({ issueText, version, tag }) {
  const status = readIssueMetadata(issueText, "Status");
  const issueVersion = readIssueMetadata(issueText, "Issue Version");
  const title = readIssueTitle(issueText);
  const sections = readSections(issueText);

  validateReleaseIssueMetadata({ status, issueVersion, version, tag });

  const output = [
    `# DiagramPilot ${tag}`,
    "",
    `Issue: ${title}`,
    `Issue Version: ${issueVersion}`,
    `Tag: ${tag}`,
    `npm: https://www.npmjs.com/package/diagrampilot/v/${version}`,
    "Public Website: https://diagrampilot.com",
  ];

  appendReleaseSections(output, sections);
  output.push("");

  return output.join("\n");
}

function main() {
  const { issuePath, version, tag } = parseArgs(process.argv.slice(2));
  const selectedIssuePath =
    issuePath === "" ? findIssuePathByVersion(process.cwd(), version) : issuePath;
  const issueText = readIssueText(selectedIssuePath);
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
