#!/usr/bin/env node

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import {
  selectIssueRecord,
  takeIssuePathOption,
} from "./release-issue-utils.mjs";

const USAGE =
  "Usage: node scripts/check-issue-release-version.mjs [--issue <path>]";
const scriptDir = path.dirname(fileURLToPath(import.meta.url));

function parseArgs(args) {
  const { issuePath, remainingArgs } = takeIssuePathOption(args, USAGE);

  if (remainingArgs.length > 0) {
    throw new Error(USAGE);
  }

  return { issuePath };
}

function readRootVersion(root) {
  const manifest = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));

  return manifest.version;
}

function checkSharedMetadata(root, issue) {
  const result = spawnSync(
    process.execPath,
    [path.join(scriptDir, "check-release-version.mjs"), issue.issueVersion],
    {
      cwd: root,
      encoding: "utf8",
    },
  );

  if (result.status !== 0) {
    process.stderr.write(result.stderr);
    return result.status ?? 1;
  }

  return 0;
}

function main() {
  const { issuePath } = parseArgs(process.argv.slice(2));
  const root = process.cwd();
  const selectedIssue = selectIssueRecord(root, issuePath);
  const rootVersion = readRootVersion(root);
  const relativeIssuePath = path.relative(root, selectedIssue.path);

  if (rootVersion !== selectedIssue.issueVersion) {
    throw new Error(
      `Shared release version metadata is ${rootVersion}; expected ${selectedIssue.issueVersion} from ${relativeIssuePath}. Run npm run sync:issue-release-version -- --issue ${relativeIssuePath}.`,
    );
  }

  const metadataStatus = checkSharedMetadata(root, selectedIssue);

  if (metadataStatus !== 0) {
    return metadataStatus;
  }

  process.stdout.write(
    `DiagramPilot issue release version matches ${relativeIssuePath} at ${selectedIssue.issueVersion}.\n`,
  );
  return 0;
}

try {
  process.exitCode = main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Unable to check DiagramPilot issue release version: ${message}\n`);
  process.exitCode = 1;
}
