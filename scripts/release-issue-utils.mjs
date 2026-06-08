import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const ISSUE_VERSION_PATTERN = /^\d+\.\d+\.\d+$/u;

export function readIssueText(issuePath) {
  return readFileSync(path.resolve(issuePath), "utf8");
}

export function readIssueMetadata(issueText, name) {
  const match = issueText.match(new RegExp(`^${name}:\\s*(.+)$`, "mu"));

  return match?.[1]?.trim() ?? "";
}

export function readIssueTitle(issueText) {
  const match = issueText.match(/^#\s+(.+)$/mu);

  if (match === null) {
    throw new Error("Issue file is missing an H1 title.");
  }

  return match[1].trim();
}

function readIssueRecord(issuePath) {
  const text = readIssueText(issuePath);

  return {
    path: path.resolve(issuePath),
    text,
    status: readIssueMetadata(text, "Status"),
    issueVersion: readIssueMetadata(text, "Issue Version"),
  };
}

function isIssueFile(entry, entryPath) {
  return (
    entry.isFile() &&
    entry.name.match(/^\d+-.+\.md$/u) !== null &&
    path.basename(path.dirname(entryPath)) === "issues"
  );
}

function collectIssueFiles(dir, issueFiles) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const entryPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      collectIssueFiles(entryPath, issueFiles);
      continue;
    }

    if (isIssueFile(entry, entryPath)) {
      issueFiles.push(entryPath);
    }
  }
}

function findIssueFiles(root) {
  const scratchRoot = path.join(root, ".scratch");
  const issueFiles = [];

  if (!existsSync(scratchRoot)) {
    return issueFiles;
  }

  if (statSync(scratchRoot).isDirectory()) {
    collectIssueFiles(scratchRoot, issueFiles);
  }

  return issueFiles.sort();
}

function compareIssueVersions(left, right) {
  const leftParts = left.split(".").map(Number);
  const rightParts = right.split(".").map(Number);

  for (let index = 0; index < 3; index += 1) {
    const difference = leftParts[index] - rightParts[index];

    if (difference !== 0) {
      return difference;
    }
  }

  return 0;
}

function findIssuePathsByVersion(root, version) {
  return findIssueFiles(root).filter((issuePath) => {
    const issueText = readIssueText(issuePath);

    return readIssueMetadata(issueText, "Issue Version") === version;
  });
}

export function findIssuePathByVersion(root, version) {
  const matches = findIssuePathsByVersion(root, version);

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

function completedIssuesWithVersions(root) {
  return findIssueFiles(root)
    .map((issuePath) => readIssueRecord(issuePath))
    .filter((issue) => issue.status === "completed" && issue.issueVersion !== "");
}

function assertSupportedIssueVersions(root, issues) {
  for (const issue of issues) {
    if (!ISSUE_VERSION_PATTERN.test(issue.issueVersion)) {
      throw new Error(
        `${path.relative(root, issue.path)} has unsupported Issue Version ${issue.issueVersion}.`,
      );
    }
  }
}

function latestIssueByVersion(issues) {
  return issues.reduce((latestIssue, issue) =>
    compareIssueVersions(issue.issueVersion, latestIssue.issueVersion) > 0
      ? issue
      : latestIssue,
  );
}

function assertUniqueLatestIssue(root, issues, latestIssue) {
  const duplicateLatestIssues = issues.filter(
    (issue) =>
      compareIssueVersions(issue.issueVersion, latestIssue.issueVersion) === 0,
  );

  if (duplicateLatestIssues.length > 1) {
    throw new Error(
      `Multiple completed issue files share Issue Version ${latestIssue.issueVersion}: ${duplicateLatestIssues
        .map((issue) => path.relative(root, issue.path))
        .join(", ")}`,
    );
  }
}

function findLatestCompletedIssue(root) {
  const completedIssues = completedIssuesWithVersions(root);

  if (completedIssues.length === 0) {
    throw new Error("No completed local issue files have an Issue Version.");
  }

  assertSupportedIssueVersions(root, completedIssues);

  const latestIssue = latestIssueByVersion(completedIssues);
  assertUniqueLatestIssue(root, completedIssues, latestIssue);
  return latestIssue;
}

export function selectIssueRecord(root, issuePath) {
  if (issuePath === "") {
    return findLatestCompletedIssue(root);
  }

  const issue = readIssueRecord(issuePath);

  if (issue.issueVersion === "") {
    throw new Error(`${issuePath} is missing Issue Version metadata.`);
  }

  if (!ISSUE_VERSION_PATTERN.test(issue.issueVersion)) {
    throw new Error(`${issuePath} has unsupported Issue Version ${issue.issueVersion}.`);
  }

  return issue;
}

export function takeIssuePathOption(args, usage) {
  const issueOptionIndex = args.indexOf("--issue");

  if (issueOptionIndex === -1) {
    return { issuePath: "", remainingArgs: args };
  }

  const issuePath = args[issueOptionIndex + 1] ?? "";

  if (isMissingOptionValue(issuePath)) {
    throw new Error(usage);
  }

  return {
    issuePath,
    remainingArgs: args.toSpliced(issueOptionIndex, 2),
  };
}

function isMissingOptionValue(value) {
  return value === "" || value.startsWith("--");
}
