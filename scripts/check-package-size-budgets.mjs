#!/usr/bin/env node
import { finishPackageCheck } from "./package-check-runner.mjs";
import { runNpmPackDryRun } from "./package-pack-dry-run.mjs";
import { PUBLIC_PACKAGE_SET } from "./public-package-set.mjs";

const PACKAGE_SIZE_BUDGETS = {
  "diagrampilot": {
    maxSize: 55_000,
    maxUnpackedSize: 275_000,
    maxFiles: 130,
  },
  "@diagrampilot/core": {
    maxSize: 120_000,
    maxUnpackedSize: 650_000,
    maxFiles: 240,
  },
  "@diagrampilot/icons": {
    maxSize: 4_000,
    maxUnpackedSize: 8_000,
    maxFiles: 10,
  },
  "@diagrampilot/export-mermaid": {
    maxSize: 6_000,
    maxUnpackedSize: 15_000,
    maxFiles: 10,
  },
  "@diagrampilot/export-d2": {
    maxSize: 6_000,
    maxUnpackedSize: 15_000,
    maxFiles: 10,
  },
  "@diagrampilot/export-dot": {
    maxSize: 6_000,
    maxUnpackedSize: 16_000,
    maxFiles: 10,
  },
  "@diagrampilot/mcp": {
    maxSize: 30_000,
    maxUnpackedSize: 130_000,
    maxFiles: 60,
  },
  "@diagrampilot/render-svg": {
    maxSize: 7_000,
    maxUnpackedSize: 18_000,
    maxFiles: 10,
  },
};

function collectMissingBudgetIssue(packageName) {
  return PACKAGE_SIZE_BUDGETS[packageName] === undefined
    ? [`${packageName} must define a package size budget.`]
    : [];
}

function collectBudgetLimitIssues({ packageName, actual, budget }) {
  return [
    ...collectLimitIssue(packageName, "tarball size", actual.size, budget.maxSize),
    ...collectLimitIssue(
      packageName,
      "unpacked size",
      actual.unpackedSize,
      budget.maxUnpackedSize,
    ),
    ...collectLimitIssue(packageName, "file count", actual.files.length, budget.maxFiles),
  ];
}

function collectLimitIssue(packageName, label, actual, maximum) {
  return actual <= maximum
    ? []
    : [`${packageName} ${label} is ${actual}; budget is ${maximum}.`];
}

function collectPackageBudgetIssues(rootPath, packageRecord) {
  const packageName = packageRecord.name;
  const missingBudgetIssues = collectMissingBudgetIssue(packageName);

  if (missingBudgetIssues.length > 0) {
    return missingBudgetIssues;
  }

  const { packResult, issues } = runNpmPackDryRun(rootPath, packageName);

  if (packResult === undefined) {
    return issues;
  }

  return [
    ...issues,
    ...collectBudgetLimitIssues({
      packageName,
      actual: packResult,
      budget: PACKAGE_SIZE_BUDGETS[packageName],
    }),
  ];
}

function collectPackageSizeBudgetIssues(rootPath) {
  return PUBLIC_PACKAGE_SET.flatMap((packageRecord) =>
    collectPackageBudgetIssues(rootPath, packageRecord),
  );
}

function main() {
  const issues = collectPackageSizeBudgetIssues(process.cwd());

  return finishPackageCheck({
    issues,
    failureTitle: "DiagramPilot package size budget checks failed:",
    successMessage: `DiagramPilot package size budgets passed for ${PUBLIC_PACKAGE_SET.length} public packages.`,
  });
}

process.exitCode = main();
