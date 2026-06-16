import assert from "node:assert/strict";
import test from "node:test";

import { planCommand } from "../packages/cli/dist/index.js";
import { createPlanningDependencies } from "./cli-command-planning-helpers.mjs";

async function planDiscover(args) {
  return await planCommand(["discover", ...args], createPlanningDependencies());
}

async function parseSuccessfulDiscoverPayload(args) {
  const plan = await planDiscover(args);

  assert.equal(plan.exitCode, 0);
  assert.equal(plan.stderr, "");
  assert.deepEqual(plan.writes, []);

  return JSON.parse(plan.stdout);
}

async function assertDiscoverUsageFailure(args, messagePattern) {
  const plan = await planDiscover(args);

  assert.equal(plan.exitCode, 1);
  assert.equal(plan.stdout, "");
  assert.match(plan.stderr, messagePattern);
  assert.match(plan.stderr, /Usage:\n/u);
  assert.deepEqual(plan.writes, []);

  return plan;
}

test("plans discover code JSON as a read-only effective options report", async () => {
  const payload = await parseSuccessfulDiscoverPayload(["code", "--json"]);

  assert.deepEqual(payload, {
    ok: true,
    command: "discover",
    target: "code",
    mode: "summary",
    preset: "typescript",
    include: ["**/*.js", "**/*.jsx", "**/*.ts", "**/*.tsx"],
    exclude: [
      "node_modules/**",
      ".git/**",
      "dist/**",
      "build/**",
      "coverage/**",
      ".next/**",
      ".vite/**",
      ".turbo/**",
    ],
    ignoreSources: [
      {
        source: "builtin",
        patterns: [
          "node_modules/**",
          ".git/**",
          "dist/**",
          "build/**",
          "coverage/**",
          ".next/**",
          ".vite/**",
          ".turbo/**",
        ],
      },
    ],
    readOnly: true,
  });
});

test("plans discover packages JSON with an explicit CLI preset", async () => {
  const payload = await parseSuccessfulDiscoverPayload([
    "packages",
    "--json",
    "--preset",
    "monorepo",
  ]);

  assert.equal(payload.ok, true);
  assert.equal(payload.target, "packages");
  assert.equal(payload.preset, "monorepo");
  assert.deepEqual(payload.include, [
    "package.json",
    "packages/*/package.json",
  ]);
});

test("plans conflicting discover preset flags as repairable usage", async () => {
  const plan = await assertDiscoverUsageFailure(
    [
      "code",
      "--preset",
      "typescript",
      "--preset",
      "monorepo",
      "--json",
    ],
    /^Conflicting discover preset: monorepo/u,
  );

  assert.match(
    plan.stderr,
    /diagrampilot discover code \[--json\] \[--preset typescript\|node-package\|monorepo\]/u,
  );
});

test("plans unsupported discover write options as repairable usage", async () => {
  await assertDiscoverUsageFailure(
    ["code", "--out", "docs/codebase.dp.yaml"],
    /^Unsupported discover write option: --out/u,
  );
});
