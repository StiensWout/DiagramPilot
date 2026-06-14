#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const testRoot = path.join(repoRoot, "test");
const parallelConcurrency = 8;
const serialTestNames = new Set([
  "checkout-demo-project.test.mjs",
]);

function allTestFiles() {
  return readdirSync(testRoot)
    .filter((fileName) => fileName.endsWith(".test.mjs"))
    .sort()
    .map((fileName) => `test/${fileName}`);
}

function testFileName(testPath) {
  return path.posix.basename(testPath);
}

function isWebsiteTest(testPath) {
  return testFileName(testPath).startsWith("website-");
}

function isSerialSharedOutputTest(testPath) {
  return serialTestNames.has(testFileName(testPath));
}

function partitionTestFiles() {
  const files = allTestFiles();

  return {
    parallel: files.filter(
      (filePath) =>
        !isWebsiteTest(filePath) && !isSerialSharedOutputTest(filePath),
    ),
    shared: files.filter(isSerialSharedOutputTest),
    website: files.filter(isWebsiteTest),
  };
}

function parseGroup(args) {
  const groupIndex = args.indexOf("--group");

  if (groupIndex === -1) {
    return "all";
  }

  const group = args[groupIndex + 1];

  if (["all", "ci", "parallel", "shared", "website"].includes(group)) {
    return group;
  }

  throw new Error(
    "Usage: node scripts/run-root-tests.mjs [--group all|ci|parallel|shared|website]",
  );
}

function groupPlan(group, partitions) {
  const groups = {
    all: [
      ["shared-output", partitions.shared, 1],
      ["parallel", partitions.parallel, parallelConcurrency],
      ["website", partitions.website, 1],
    ],
    ci: [
      ["shared-output", partitions.shared, 1],
      ["parallel", partitions.parallel, parallelConcurrency],
    ],
    parallel: [["parallel", partitions.parallel, parallelConcurrency]],
    shared: [["shared-output", partitions.shared, 1]],
    website: [["website", partitions.website, 1]],
  };

  return groups[group];
}

function formatSeconds(startedAt) {
  return ((performance.now() - startedAt) / 1000).toFixed(2);
}

function runNodeTests(label, files, concurrency) {
  if (files.length === 0) {
    console.log(`No ${label} root tests to run.`);
    return 0;
  }

  const startedAt = performance.now();
  console.log(
    `Running ${files.length} ${label} root test file${files.length === 1 ? "" : "s"} with concurrency ${concurrency}.`,
  );

  const result = spawnSync(
    process.execPath,
    ["--test", `--test-concurrency=${concurrency}`, ...files],
    {
      cwd: repoRoot,
      env: process.env,
      stdio: "inherit",
    },
  );

  console.log(
    `Timing: ${label} root tests completed in ${formatSeconds(startedAt)}s.`,
  );

  return result.status ?? 1;
}

function runPlan(plan) {
  const startedAt = performance.now();

  for (const [label, files, concurrency] of plan) {
    const status = runNodeTests(label, files, concurrency);

    if (status !== 0) {
      return status;
    }
  }

  console.log(`Timing: selected root tests completed in ${formatSeconds(startedAt)}s.`);
  return 0;
}

try {
  const group = parseGroup(process.argv.slice(2));
  process.exitCode = runPlan(groupPlan(group, partitionTestFiles()));
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
}
