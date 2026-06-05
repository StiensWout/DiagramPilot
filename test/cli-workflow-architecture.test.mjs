import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const commandPlanningSourcePath = path.join(
  repoRoot,
  "packages",
  "cli",
  "src",
  "command-planning.ts",
);

test("CLI commands use validated DiagramSpec loading instead of lower-level loading primitives", async () => {
  const commandPlanningSource = await readFile(commandPlanningSourcePath, "utf8");

  assert.match(commandPlanningSource, /\bloadValidatedDiagramSpec\b/);
  assert.doesNotMatch(commandPlanningSource, /\bloadDiagramPilotSourceFile\b/);
  assert.doesNotMatch(commandPlanningSource, /\bvalidateDiagramSpec\b/);
});

test("CLI commands route load failures through centralized repairable diagnostics", async () => {
  const commandPlanningSource = await readFile(commandPlanningSourcePath, "utf8");

  assert.match(commandPlanningSource, /\bcreateRepairableDiagnosticReport\b/);
  assert.doesNotMatch(commandPlanningSource, /\bformatSourceFailure\b/);
  assert.doesNotMatch(
    commandPlanningSource,
    /\bsourceFailureToValidationError\b/,
  );
  assert.doesNotMatch(
    commandPlanningSource,
    /\bformatDiagramSpecValidationError\b/,
  );
});

test("CLI check planning delegates Repo Workflow Check internals to the core module", async () => {
  const commandPlanningSource = await readFile(commandPlanningSourcePath, "utf8");

  assert.match(commandPlanningSource, /\bcheckDiagramPilotRepoWorkflow\b/);
  assert.doesNotMatch(commandPlanningSource, /\bdiscoverDiagramPilotSourceFiles\b/);
  assert.doesNotMatch(
    commandPlanningSource,
    /\bcheckExpectedSvgArtifactFreshnessForValidatedSource\b/,
  );
  assert.doesNotMatch(commandPlanningSource, /\bbuildCheckSourceResults\b/);
});
