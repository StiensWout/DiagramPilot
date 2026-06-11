import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  runSuccessfulProcess,
  sanitizedTestEnv,
} from "./process-helpers.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const expectedScenarioIds = [
  "cli_validate",
  "cli_check",
  "cli_generate",
  "cli_render_svg",
  "cli_render_png",
  "mcp_validate_source",
  "mcp_check_repo",
];

test("workflow benchmark emits comparable JSON for CLI and MCP scenarios", async () => {
  const result = await runSuccessfulProcess(
    process.execPath,
    [
      "scripts/benchmark-workflows.mjs",
      "--runs",
      "1",
      "--format",
      "json",
      "--compare",
      "benchmarks/workflow-baseline.json",
    ],
    {
      cwd: repoRoot,
      env: sanitizedTestEnv(),
      label: "workflow benchmark",
    },
  );

  assert.equal(result.stderr, "");

  const report = JSON.parse(result.stdout);

  assert.equal(report.schemaVersion, 1);
  assert.equal(report.suite, "diagrampilot-workflow-benchmark");
  assert.equal(report.fixture, "checkout-demo-configured-repo");
  assert.equal(report.runsPerScenario, 1);
  assert.equal(report.baseline.path, "benchmarks/workflow-baseline.json");
  assert.equal(report.baseline.referenceScenarioId, "cli_validate");

  assert.deepEqual(
    report.results.map((result) => result.id),
    expectedScenarioIds,
  );

  for (const benchmarkResult of report.results) {
    assert.equal(benchmarkResult.ok, true, benchmarkResult.id);
    assert.equal(benchmarkResult.sampleCount, 1, benchmarkResult.id);
    assert.equal(typeof benchmarkResult.medianMs, "number", benchmarkResult.id);
    assert.equal(
      typeof benchmarkResult.relativeMedian,
      "number",
      benchmarkResult.id,
    );
    assert.equal(
      typeof benchmarkResult.baselineRelativeMedian,
      "number",
      benchmarkResult.id,
    );
    assert.equal(
      typeof benchmarkResult.relativeChange,
      "number",
      benchmarkResult.id,
    );
  }
});

test("workflow benchmark command baseline and docs stay reviewable", async () => {
  const packageJson = JSON.parse(
    await readFile(path.join(repoRoot, "package.json"), "utf8"),
  );
  const maintainabilityDocs = await readFile(
    path.join(repoRoot, "docs", "development", "maintainability.md"),
    "utf8",
  );
  const baseline = JSON.parse(
    await readFile(
      path.join(repoRoot, "benchmarks", "workflow-baseline.json"),
      "utf8",
    ),
  );

  assert.match(
    packageJson.scripts.benchmark,
    /node scripts\/benchmark-workflows\.mjs/,
  );

  for (const expectedText of [
    "npm run benchmark",
    "benchmarks/workflow-baseline.json",
    "relative median",
    "validate",
    "check",
    "generate",
    "SVG",
    "PNG",
    "MCP",
  ]) {
    assert.match(maintainabilityDocs, new RegExp(expectedText, "i"));
  }

  assert.equal(baseline.unit, "relative-median");
  assert.equal(baseline.referenceScenarioId, "cli_validate");
  assert.deepEqual(
    baseline.results.map((result) => result.id),
    expectedScenarioIds,
  );
  assert.equal(
    baseline.results.every(
      (result) =>
        result.medianMs === undefined && result.samplesMs === undefined,
    ),
    true,
  );
});
