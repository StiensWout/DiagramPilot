#!/usr/bin/env node
import { runNpmPackDryRun } from "./package-pack-dry-run.mjs";

const kibibyte = 1024;
const publicPackageSet = [
  {
    name: "diagrampilot",
    packedSizeBudgetBytes: 32 * kibibyte,
  },
  {
    name: "@diagrampilot/core",
    packedSizeBudgetBytes: 80 * kibibyte,
  },
  {
    name: "@diagrampilot/icons",
    packedSizeBudgetBytes: 8 * kibibyte,
  },
  {
    name: "@diagrampilot/export-mermaid",
    packedSizeBudgetBytes: 8 * kibibyte,
  },
  {
    name: "@diagrampilot/export-d2",
    packedSizeBudgetBytes: 8 * kibibyte,
  },
  {
    name: "@diagrampilot/export-dot",
    packedSizeBudgetBytes: 8 * kibibyte,
  },
  {
    name: "@diagrampilot/mcp",
    packedSizeBudgetBytes: 32 * kibibyte,
  },
  {
    name: "@diagrampilot/render-svg",
    packedSizeBudgetBytes: 8 * kibibyte,
  },
];

function formatKibibytes(bytes) {
  return `${(bytes / kibibyte).toFixed(1)} KiB`;
}

function packageSizeResult(rootPath, packageRecord) {
  const { packResult, issues } = runNpmPackDryRun(rootPath, packageRecord.name);

  if (issues.length > 0) {
    return {
      packageName: packageRecord.name,
      budgetBytes: packageRecord.packedSizeBudgetBytes,
      issues,
    };
  }

  const packedSizeBytes = packResult.size;

  return {
    packageName: packageRecord.name,
    packedSizeBytes,
    budgetBytes: packageRecord.packedSizeBudgetBytes,
    overBudgetBytes: packedSizeBytes - packageRecord.packedSizeBudgetBytes,
  };
}

function packageSizeStatus(result) {
  if (result.issues !== undefined) {
    return "ERROR";
  }

  return result.overBudgetBytes > 0 ? "OVER" : "OK";
}

function formatPackageSizeLine(result) {
  return [
    result.packageName.padEnd(30),
    formatKibibytes(result.packedSizeBytes ?? 0).padStart(12),
    formatKibibytes(result.budgetBytes).padStart(12),
    packageSizeStatus(result).padStart(6),
  ].join(" ");
}

function formatPackageSizeReport(results) {
  return [
    "DiagramPilot package size budget report",
    "Package                        Packed       Budget Status",
    ...results.map(formatPackageSizeLine),
  ].join("\n");
}

function packageSizeBudgetIssues(results) {
  return results.flatMap((result) => {
    if (result.issues !== undefined) {
      return result.issues;
    }

    return result.overBudgetBytes > 0
      ? [
          `${result.packageName} packed tarball is ${formatKibibytes(
            result.packedSizeBytes,
          )}; budget is ${formatKibibytes(result.budgetBytes)}.`,
        ]
      : [];
  });
}

function checkPackageSizeBudgets(rootPath) {
  return publicPackageSet.map((packageRecord) =>
    packageSizeResult(rootPath, packageRecord),
  );
}

function main() {
  const results = checkPackageSizeBudgets(process.cwd());
  const issues = packageSizeBudgetIssues(results);

  process.stdout.write(`${formatPackageSizeReport(results)}\n`);

  if (issues.length > 0) {
    process.stderr.write(
      [
        "DiagramPilot package size budget checks failed:",
        ...issues.map((issue) => `- ${issue}`),
      ].join("\n") + "\n",
    );
    return 1;
  }

  process.stdout.write(
    `Package size budgets passed for ${publicPackageSet.length} public packages.\n`,
  );
  return 0;
}

process.exitCode = main();
