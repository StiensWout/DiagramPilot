import assert from "node:assert/strict";
import test from "node:test";

import { planCommand } from "../packages/cli/dist/index.js";
import {
  assertJsonFailurePlan,
  createPlanningDependencies,
  validLoadResult,
} from "./cli-command-planning-helpers.mjs";

function unsupportedSourceFormatFailure(path = "docs/architecture.dp.yml") {
  return {
    ok: false,
    failure: {
      kind: "unsupported-source-format",
      path,
      message: `Unsupported DiagramPilot source file: ${path}`,
    },
  };
}

test("validate --json emits structured success output for YAML sources", async () => {
  const plan = await planCommand(
    ["validate", "docs/architecture.dp.yaml", "--json"],
    createPlanningDependencies({
      loadValidatedDiagramSpec: () => validLoadResult(),
    }),
  );

  assert.equal(plan.exitCode, 0);
  assert.equal(plan.stderr, "");
  assert.deepEqual(plan.writes, []);
  assert.deepEqual(JSON.parse(plan.stdout), {
    file: "docs/architecture.dp.yaml",
    ok: true,
    errors: [],
  });
});

test("validate --json emits structured failure output for unsupported source paths", async () => {
  const plan = await planCommand(
    ["validate", "docs/architecture.dp.yml", "--json"],
    createPlanningDependencies({
      loadValidatedDiagramSpec: () => unsupportedSourceFormatFailure(),
    }),
  );

  const result = assertJsonFailurePlan(plan);

  assert.equal(result.file, "docs/architecture.dp.yml");
  assert.equal(result.ok, false);
  assert.deepEqual(result.errors, [
    {
      path: "$",
      message: "Unsupported DiagramPilot source file: docs/architecture.dp.yml",
      expected: "YAML DiagramPilot Source File syntax.",
      suggestion: "Use a `*.dp.yaml` DiagramPilot Source File.",
    },
  ]);
});
