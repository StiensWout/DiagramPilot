import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  createRepairableDiagnosticReport,
  loadValidatedDiagramSpec,
} from "../packages/core/dist/index.js";

async function withTempRepo(run) {
  const tempRoot = await mkdtemp(
    path.join(os.tmpdir(), "diagrampilot-repairable-diagnostics-"),
  );

  try {
    return await run(tempRoot);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}

test("createRepairableDiagnosticReport represents read failures", async () => {
  await withTempRepo(async (tempRoot) => {
    const sourcePath = path.join(tempRoot, "docs", "missing.dp.yaml");
    const result = loadValidatedDiagramSpec(sourcePath);

    assert.equal(result.ok, false);

    const report = createRepairableDiagnosticReport(result.failure);

    assert.equal(report.file, sourcePath);
    assert.match(report.text, new RegExp(`^Unable to read ${sourcePath}: `));
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
    await mkdir(path.join(tempRoot, "docs"), { recursive: true });
    const sourcePath = path.join(tempRoot, "docs", "broken.dp.yaml");

    await writeFile(
      sourcePath,
      ["version: 1", "title: Broken Source", "nodes: [", ""].join("\n"),
      "utf8",
    );

    const result = loadValidatedDiagramSpec(sourcePath);

    assert.equal(result.ok, false);
    assert.equal(result.failure.kind, "parse");

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
    await mkdir(path.join(tempRoot, "docs"), { recursive: true });
    const sourcePath = path.join(tempRoot, "docs", "invalid.dp.yaml");

    await writeFile(
      sourcePath,
      [
        "version: 1",
        "direction: sideways",
        "nodes:",
        "  - id: web_app",
        "    label: Web App",
        "",
      ].join("\n"),
      "utf8",
    );

    const result = loadValidatedDiagramSpec(sourcePath);

    assert.equal(result.ok, false);
    assert.equal(result.failure.kind, "validation");

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
    assert.match(report.text, /Path: title/);
    assert.match(report.text, /Problem: Missing required top-level field: title\./);
    assert.match(report.text, /Suggestion: Add title to the top level/);
    assert.match(report.text, /Path: direction/);
    assert.match(report.text, /Bad value: "sideways"/);
  });
});
