import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cliSourcePath = path.join(repoRoot, "packages", "cli", "src", "index.ts");

test("CLI commands use validated DiagramSpec loading instead of lower-level loading primitives", async () => {
  const cliSource = await readFile(cliSourcePath, "utf8");

  assert.match(cliSource, /\bloadValidatedDiagramSpec\b/);
  assert.doesNotMatch(cliSource, /\bloadDiagramPilotSourceFile\b/);
  assert.doesNotMatch(cliSource, /\bvalidateDiagramSpec\b/);
});

test("CLI commands route load failures through centralized repairable diagnostics", async () => {
  const cliSource = await readFile(cliSourcePath, "utf8");

  assert.match(cliSource, /\bcreateRepairableDiagnosticReport\b/);
  assert.doesNotMatch(cliSource, /\bformatSourceFailure\b/);
  assert.doesNotMatch(cliSource, /\bsourceFailureToValidationError\b/);
  assert.doesNotMatch(cliSource, /\bformatDiagramSpecValidationError\b/);
});

test("CLI check planning delegates Repo Workflow Check internals to the core module", async () => {
  const cliSource = await readFile(cliSourcePath, "utf8");

  assert.match(cliSource, /\bcheckDiagramPilotRepoWorkflow\b/);
  assert.doesNotMatch(cliSource, /\bdiscoverDiagramPilotSourceFiles\b/);
  assert.doesNotMatch(
    cliSource,
    /\bcheckExpectedSvgArtifactFreshnessForValidatedSource\b/,
  );
  assert.doesNotMatch(cliSource, /\bbuildCheckSourceResults\b/);
});
