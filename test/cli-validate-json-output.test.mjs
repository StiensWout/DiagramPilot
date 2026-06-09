import assert from "node:assert/strict";
import test from "node:test";

import { planCommand } from "../packages/cli/dist/index.js";
import {
  createPlanningDependencies,
  validLoadResult,
} from "./cli-command-planning-helpers.mjs";

function unsupportedSourceFormatFailure(path = "docs/architecture.dp.json") {
  return {
    ok: false,
    failure: {
      kind: "unsupported-source-format",
      path,
      message: `Unsupported DiagramPilot source file: ${path}. YAML is the supported source format; use a *.dp.yaml source file.`,
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

test("validate --json emits structured repair hints for legacy JSON sources", async () => {
  const plan = await planCommand(
    ["validate", "docs/architecture.dp.json", "--json"],
    createPlanningDependencies({
      loadValidatedDiagramSpec: () => unsupportedSourceFormatFailure(),
    }),
  );

  assert.equal(plan.exitCode, 1);
  assert.equal(plan.stderr, "");
  assert.deepEqual(plan.writes, []);

  const result = JSON.parse(plan.stdout);

  assert.equal(result.file, "docs/architecture.dp.json");
  assert.equal(result.ok, false);
  assert.deepEqual(result.errors, [
    {
      path: "$",
      message:
        "Unsupported DiagramPilot source file: docs/architecture.dp.json. YAML is the supported source format; use a *.dp.yaml source file.",
      expected: "YAML DiagramPilot Source File syntax.",
      suggestion: "Use a `*.dp.yaml` DiagramPilot Source File.",
    },
  ]);
});
