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
