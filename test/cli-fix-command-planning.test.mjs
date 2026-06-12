import assert from "node:assert/strict";
import test from "node:test";

import { planCommand } from "../packages/cli/dist/index.js";
import { createPlanningDependencies } from "./cli-command-planning-helpers.mjs";

const architectureSourcePath = "docs/architecture.dp.yaml";
const fixedArchitectureContent = [
  "version: 1",
  "title: Checkout Architecture",
  "nodes:",
  "  - id: web_app",
  "    label: Web App",
  "",
].join("\n");
const successfulValidation = {
  ok: true,
  errors: [],
};
const formatSourceRepair = {
  kind: "format-source",
  path: "$",
  message: "Format source as canonical DiagramPilot YAML.",
};
const iconFallbackRepair = {
  kind: "replace-icon",
  path: "nodes[0].icon",
  message: "Replace invalid icon with configured fallback lucide:database.",
  before: "lucide:databse",
  after: "lucide:database",
};

function successfulFixResult({
  sourcePath = architectureSourcePath,
  repairs = [formatSourceRepair],
  content = fixedArchitectureContent,
} = {}) {
  return {
    ok: true,
    sourcePath,
    changed: true,
    repairs,
    content,
    validation: successfulValidation,
  };
}

function planningDependenciesForFix({ expectedOptions, result, sourcePath }) {
  return createPlanningDependencies({
    planDiagramPilotSourceFix: (path, options) => {
      assert.equal(path, sourcePath);
      assert.deepEqual(options, expectedOptions);
      return result;
    },
  });
}

function assertSuccessfulJsonFixPlan(plan, expected) {
  assert.equal(plan.exitCode, 0);
  assert.equal(plan.stderr, "");
  assert.deepEqual(plan.writes, []);
  assert.deepEqual(JSON.parse(plan.stdout), expected);
}

test("plans fix --json as a no-write deterministic repair plan", async () => {
  const plan = await planCommand(
    ["fix", architectureSourcePath, "--json"],
    planningDependenciesForFix({
      expectedOptions: { fallbackIcon: undefined },
      result: successfulFixResult(),
      sourcePath: architectureSourcePath,
    }),
  );

  assertSuccessfulJsonFixPlan(plan, {
    file: architectureSourcePath,
    ok: true,
    changed: true,
    repairs: [formatSourceRepair],
    validation: successfulValidation,
  });
});

test("plans fix mutation as a source-only write intent", async () => {
  const plan = await planCommand(
    ["fix", architectureSourcePath],
    planningDependenciesForFix({
      expectedOptions: { fallbackIcon: undefined },
      result: successfulFixResult(),
      sourcePath: architectureSourcePath,
    }),
  );

  assert.deepEqual(plan, {
    exitCode: 0,
    stdout: "Fixed docs/architecture.dp.yaml with 1 deterministic repair.\n",
    stderr: "",
    writes: [
      {
        path: architectureSourcePath,
        content: fixedArchitectureContent,
      },
    ],
  });
});

test("passes configured fallback icons into fix planning", async () => {
  const sourcePath = "docs/unknown-icon.dp.yaml";

  const plan = await planCommand(
    ["fix", sourcePath, "--fallback-icon", "lucide:database", "--json"],
    planningDependenciesForFix({
      expectedOptions: { fallbackIcon: "lucide:database" },
      result: successfulFixResult({
        sourcePath,
        repairs: [iconFallbackRepair],
        content: "version: 1\n",
      }),
      sourcePath,
    }),
  );

  assertSuccessfulJsonFixPlan(plan, {
    file: sourcePath,
    ok: true,
    changed: true,
    repairs: [iconFallbackRepair],
    validation: successfulValidation,
  });
});
