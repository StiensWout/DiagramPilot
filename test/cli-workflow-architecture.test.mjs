import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { assertMatchesAll } from "./assertion-helpers.mjs";
import { repoRoot } from "./website-test-helpers.mjs";

const commandPlanningSourcePath = path.join(
  repoRoot,
  "packages",
  "cli",
  "src",
  "command-planning.ts",
);

const commandPlanningBoundaries = {
  validatedLoading: {
    required: [/\bloadValidatedDiagramSpec\b/],
    forbidden: [/\bloadDiagramPilotSourceFile\b/, /\bvalidateDiagramSpec\b/],
  },
  repairableDiagnostics: {
    required: [/\bcreateRepairableDiagnosticReport\b/],
    forbidden: [
      /\bformatSourceFailure\b/,
      /Unsupported DiagramPilot source file: /,
      /Failed to read DiagramPilot source file: /,
    ],
  },
  repoWorkflowCheck: {
    required: [/\bcheckDiagramPilotRepoWorkflow\b/],
    forbidden: [/\bdiscoverDiagramPilotSourceFiles\b/, /\bbuildCheckSourceResults\b/],
  },
};

function assertDoesNotMatchAny(actual, patterns) {
  for (const pattern of patterns) assert.doesNotMatch(actual, pattern);
}

function assertCommandPlanningBoundary(source, boundary) {
  assertMatchesAll(source, boundary.required);
  assertDoesNotMatchAny(source, boundary.forbidden);
}

async function readCommandPlanningSource() {
  return readFile(commandPlanningSourcePath, "utf8");
}

test("CLI commands use validated DiagramSpec loading instead of lower-level loading primitives", async () => {
  const commandPlanningSource = await readCommandPlanningSource();

  assertCommandPlanningBoundary(
    commandPlanningSource,
    commandPlanningBoundaries.validatedLoading,
  );
});

test("CLI commands route load failures through centralized repairable diagnostics", async () => {
  const commandPlanningSource = await readCommandPlanningSource();

  assertCommandPlanningBoundary(
    commandPlanningSource,
    commandPlanningBoundaries.repairableDiagnostics,
  );
});

test("CLI check planning delegates Repo Workflow Check internals to the core module", async () => {
  const commandPlanningSource = await readCommandPlanningSource();

  assertCommandPlanningBoundary(
    commandPlanningSource,
    commandPlanningBoundaries.repoWorkflowCheck,
  );
});
