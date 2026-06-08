#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  selectIssueRecord,
  takeIssuePathOption,
} from "./release-issue-utils.mjs";

const USAGE =
  "Usage: node scripts/sync-issue-release-version.mjs [--issue <path>] [--skip-build] [--skip-artifact-refresh]";
const BOOLEAN_OPTIONS = new Map([
  ["--skip-build", "skipBuild"],
  ["--skip-artifact-refresh", "skipArtifactRefresh"],
]);
const scriptDir = path.dirname(fileURLToPath(import.meta.url));

function parseArgs(args) {
  const { issuePath, remainingArgs } = takeIssuePathOption(args, USAGE);
  const parsed = {
    issuePath,
    skipBuild: false,
    skipArtifactRefresh: false,
  };

  for (const arg of remainingArgs) {
    const optionKey = BOOLEAN_OPTIONS.get(arg);

    if (optionKey === undefined) {
      throw new Error(USAGE);
    }

    parsed[optionKey] = true;
  }

  return parsed;
}

function runNodeScript(root, scriptName, args) {
  execFileSync(process.execPath, [path.join(scriptDir, scriptName), ...args], {
    cwd: root,
    stdio: "inherit",
  });
}

function runNpm(root, args) {
  execFileSync("npm", args, {
    cwd: root,
    stdio: "inherit",
  });
}

function refreshCheckoutDemoArtifact(root) {
  const demoRoot = path.join(root, "demo-projects", "checkout");
  const cliPath = path.join(root, "packages", "cli", "dist", "index.js");

  execFileSync(
    process.execPath,
    [cliPath, "render", "docs/architecture.dp.yaml", "--out", "docs/architecture.svg"],
    {
      cwd: demoRoot,
      stdio: "inherit",
    },
  );
  execFileSync(process.execPath, [cliPath, "check"], {
    cwd: demoRoot,
    stdio: "inherit",
  });
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const root = process.cwd();
  const selectedIssue = selectIssueRecord(root, options.issuePath);
  const relativeIssuePath = path.relative(root, selectedIssue.path);

  runNodeScript(root, "bump-release-version.mjs", [selectedIssue.issueVersion]);

  if (!options.skipBuild) {
    runNpm(root, ["run", "build"]);
  }

  if (!options.skipArtifactRefresh) {
    refreshCheckoutDemoArtifact(root);
  }

  runNodeScript(root, "check-release-version.mjs", [selectedIssue.issueVersion]);
  runNodeScript(root, "check-issue-release-version.mjs", [
    "--issue",
    selectedIssue.path,
  ]);

  process.stdout.write(
    `Synced DiagramPilot release metadata to Issue Version ${selectedIssue.issueVersion} from ${relativeIssuePath}.\n`,
  );
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Unable to sync DiagramPilot issue release version: ${message}\n`);
  process.exitCode = 1;
}
