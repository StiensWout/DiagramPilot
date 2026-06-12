import assert from "node:assert/strict";
import test from "node:test";

import { planCommand } from "../packages/cli/dist/index.js";
import {
  createPlanningDependencies,
  validationFailure,
} from "./cli-command-planning-helpers.mjs";

const orphanNodeWarning = {
  path: "nodes[2]",
  ruleId: "orphan-node",
  severity: "warning",
  message: 'Node "worker" is not connected to any edge.',
  suggestion:
    "Connect worker with at least one edge or remove it if it is not part of the architecture.",
};

function parseJsonLintPlan(plan) {
  assert.equal(plan.exitCode, 1);
  assert.equal(plan.stderr, "");
  assert.deepEqual(plan.writes, []);

  return JSON.parse(plan.stdout);
}

test("plans lint warnings as read-only stderr output", async () => {
  const plan = await planCommand(
    ["lint", "docs/architecture.dp.yaml"],
    createPlanningDependencies({
      lintDiagramSpec: () => ({
        ok: false,
        summary: {
          warningCount: 1,
        },
        warnings: [orphanNodeWarning],
      }),
    }),
  );

  assert.deepEqual(plan, {
    exitCode: 1,
    stdout: "",
    stderr: [
      "Lint found 1 warning in docs/architecture.dp.yaml.",
      'nodes[2] orphan-node warning: Node "worker" is not connected to any edge. Suggestion: Connect worker with at least one edge or remove it if it is not part of the architecture.',
      "",
    ].join("\n"),
    writes: [],
  });
});

test("plans lint json warnings as stable machine-readable output", async () => {
  const plan = await planCommand(
    ["lint", "docs/architecture.dp.yaml", "--json"],
    createPlanningDependencies({
      lintDiagramSpec: () => ({
        ok: false,
        summary: {
          warningCount: 1,
        },
        warnings: [orphanNodeWarning],
      }),
    }),
  );

  assert.deepEqual(parseJsonLintPlan(plan), {
    file: "docs/architecture.dp.yaml",
    ok: false,
    errors: [],
    summary: {
      warningCount: 1,
    },
    warnings: [orphanNodeWarning],
  });
});

test("plans lint success as stdout with no writes", async () => {
  const plan = await planCommand(
    ["lint", "docs/architecture.dp.yaml"],
    createPlanningDependencies(),
  );

  assert.deepEqual(plan, {
    exitCode: 0,
    stdout: "No lint warnings in docs/architecture.dp.yaml.\n",
    stderr: "",
    writes: [],
  });
});

test("plans lint json validation failures before lint warnings", async () => {
  let lintCalled = false;
  const plan = await planCommand(
    ["lint", "docs/invalid.dp.yaml", "--json"],
    createPlanningDependencies({
      loadValidatedDiagramSpec: () => validationFailure(),
      lintDiagramSpec: () => {
        lintCalled = true;
        return {
          ok: true,
          summary: {
            warningCount: 0,
          },
          warnings: [],
        };
      },
    }),
  );

  assert.equal(lintCalled, false);
  assert.deepEqual(parseJsonLintPlan(plan), {
    file: "docs/invalid.dp.yaml",
    ok: false,
    errors: [
      {
        path: "title",
        message: "Missing required top-level field: title.",
        expected: "Required top-level fields: version, title, nodes.",
        suggestion: "Add a title field.",
      },
    ],
    summary: {
      warningCount: 0,
    },
    warnings: [],
  });
});

test("plans lint unknown options as usage on stderr", async () => {
  const plan = await planCommand(
    ["lint", "docs/architecture.dp.yaml", "--quiet"],
    createPlanningDependencies(),
  );

  assert.deepEqual(plan, {
    exitCode: 1,
    stdout: "",
    stderr:
      "Unknown lint option: --quiet\nUsage: diagrampilot lint <path> [--json]\n",
    writes: [],
  });
});
