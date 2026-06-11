import assert from "node:assert/strict";
import test from "node:test";

import { planCommand } from "../packages/cli/dist/index.js";
import {
  assertStderrFailurePlan,
  createPlanningDependencies,
  validationFailure,
} from "./cli-command-planning-helpers.mjs";

function assertSingleWritePlan(plan, write) {
  assert.deepEqual(plan, {
    exitCode: 0,
    stdout: "",
    stderr: "",
    writes: [write],
  });
}

test("plans format success as a canonical source file rewrite", async () => {
  const plan = await planCommand(
    ["format", "docs/architecture.dp.yaml"],
    createPlanningDependencies(),
  );

  assertSingleWritePlan(plan, {
    path: "docs/architecture.dp.yaml",
    content: [
      "version: 1",
      "title: Checkout Architecture",
      "nodes:",
      "  - id: web_app",
      "    label: Web App",
      "",
    ].join("\n"),
  });
});

test("plans format validation failures without rewriting the source", async () => {
  const plan = await planCommand(
    ["format", "docs/invalid.dp.yaml"],
    createPlanningDependencies({
      loadValidatedDiagramSpec: () => validationFailure(),
    }),
  );

  assertStderrFailurePlan(plan, [
    /DiagramSpec validation error in docs\/invalid/,
  ]);
});

test("plans format unexpected arguments as usage without loading the source", async () => {
  const plan = await planCommand(
    ["format", "docs/architecture.dp.yaml", "docs/other.dp.yaml"],
    createPlanningDependencies({
      loadValidatedDiagramSpec: () => {
        throw new Error("usage failure should happen before source loading");
      },
    }),
  );

  assert.deepEqual(plan, {
    exitCode: 1,
    stdout: "",
    stderr:
      "Unexpected format argument: docs/other.dp.yaml\nUsage: diagrampilot format <path>\n",
    writes: [],
  });
});
