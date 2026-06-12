import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import {
  createRepairableDiagnosticReport,
  loadValidatedDiagramSpec,
} from "../packages/core/dist/index.js";
import {
  assertFailedLoad,
  brokenYamlSourceLines,
  writeDiagramSource,
} from "./diagramspec-loading-helpers.mjs";
import { withTempRepoPrefix } from "./temp-repo-helpers.mjs";

async function withTempRepo(run) {
  return withTempRepoPrefix("diagrampilot-repairable-diagnostics-", run);
}

function assertDiagnosticTextMatches(text, patterns) {
  for (const pattern of patterns) {
    assert.match(text, pattern);
  }
}

test("createRepairableDiagnosticReport represents read failures", async () => {
  await withTempRepo(async (tempRoot) => {
    const sourcePath = path.join(tempRoot, "docs", "missing.dp.yaml");
    const result = loadValidatedDiagramSpec(sourcePath);

    assertFailedLoad(result, "read");

    const report = createRepairableDiagnosticReport(result.failure);

    assert.equal(report.file, sourcePath);
    assert.match(report.text, new RegExp(`^Unable to read ${sourcePath}:`));
    assert.deepEqual(report.errors, [
      {
        path: "$",
        message: `Unable to read ${sourcePath}: ${result.failure.message}`,
        expected: "Readable DiagramPilot Source File.",
        suggestion: "Check that the source path exists and is readable.",
      },
    ]);
  });
});

test("createRepairableDiagnosticReport represents parse failures", async () => {
  await withTempRepo(async (tempRoot) => {
    const sourcePath = await writeDiagramSource(
      tempRoot,
      "broken.dp.yaml",
      brokenYamlSourceLines,
    );
    const result = loadValidatedDiagramSpec(sourcePath);

    assertFailedLoad(result, "parse");

    const report = createRepairableDiagnosticReport(result.failure);
    const location =
      result.failure.line === undefined || result.failure.column === undefined
        ? ""
        : ` at line ${result.failure.line}, column ${result.failure.column}`;

    assert.equal(report.file, sourcePath);
    assert.match(report.text, new RegExp(`^YAML parse error in ${sourcePath}`));
    assert.deepEqual(report.errors, [
      {
        path: "$",
        message: `YAML parse error${location}: ${result.failure.message}`,
        expected: "Valid YAML DiagramPilot Source File syntax.",
        suggestion: "Fix the YAML syntax before semantic validation.",
      },
    ]);
  });
});

test("createRepairableDiagnosticReport represents semantic validation failures", async () => {
  await withTempRepo(async (tempRoot) => {
    const sourcePath = await writeDiagramSource(tempRoot, "invalid.dp.yaml", [
      "version: 1",
      "direction: sideways",
      "nodes:",
      "  - id: web_app",
      "    label: Web App",
      "",
    ]);
    const result = loadValidatedDiagramSpec(sourcePath);

    assertFailedLoad(result, "validation");

    const report = createRepairableDiagnosticReport(result.failure);

    assert.equal(report.file, sourcePath);
    assert.deepEqual(report.errors, [
      {
        path: "title",
        message: "Missing required top-level field: title.",
        expected: "Required top-level fields: version, title, nodes.",
        suggestion: "Add title to the top level of the DiagramSpec.",
      },
      {
        path: "direction",
        message: "direction must be one of: right, left, down, up.",
        badValue: "sideways",
        expected: "One of: right, left, down, up.",
        suggestion: "Change direction to right, left, down, or up.",
      },
    ]);
    assert.match(
      report.text,
      new RegExp(
        `^DiagramSpec validation error in ${sourcePath}: Missing required top-level field: title\\.`,
      ),
    );
    assertDiagnosticTextMatches(report.text, [
      /Path: title/,
      /Problem: Missing required top-level field: title\./,
      /Suggestion: Add title to the top level/,
      /Path: direction/,
      /Bad value: "sideways"/,
    ]);
  });
});

test("createRepairableDiagnosticReport points unknown icons toward local discovery", async () => {
  await withTempRepo(async (tempRoot) => {
    const sourcePath = await writeDiagramSource(tempRoot, "unknown-icon.dp.yaml", [
      "version: 1",
      "title: Unknown Icon Architecture",
      "nodes:",
      "  - id: database",
      "    label: Database",
      "    icon: lucide:databse",
      "",
    ]);
    const result = loadValidatedDiagramSpec(sourcePath);

    assertFailedLoad(result, "validation");

    const report = createRepairableDiagnosticReport(result.failure);

    assert.equal(report.errors.length, 1);
    assert.deepEqual(report.errors[0], {
      path: "nodes[0].icon",
      message: 'nodes[0].icon references unknown Lucide icon "databse".',
      badValue: "lucide:databse",
      expected: "Known Lucide icon name.",
      suggestion:
        "Choose a packaged Lucide icon, such as lucide:database. Run `diagrampilot icons search <query>` or see https://diagrampilot.com/docs/agents/icons.md.",
    });
    assertDiagnosticTextMatches(report.text, [
      /Path: nodes\[0\]\.icon/,
      /Bad value: "lucide:databse"/,
      /diagrampilot icons search <query>/,
      /https:\/\/diagrampilot\.com\/docs\/agents\/icons\.md/,
    ]);
  });
});
