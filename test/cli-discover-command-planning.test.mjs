import assert from "node:assert/strict";
import test from "node:test";

import { planCommand } from "../packages/cli/dist/index.js";
import { createPlanningDependencies } from "./cli-command-planning-helpers.mjs";

async function planDiscover(args, dependencies = createPlanningDependencies()) {
  return await planCommand(["discover", ...args], dependencies);
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
    include: [
      "**/*.js",
      "**/*.jsx",
      "**/*.ts",
      "**/*.tsx",
      "**/*.mts",
      "**/*.cts",
    ],
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
    files: ["src/app.ts"],
    modules: [],
    importEdges: [],
    unresolvedImports: [],
    ignoredFiles: [
      {
        path: "src/app.test.ts",
        classifications: ["test"],
        reason: "test",
      },
    ],
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

test("plans discover code output as a generated source write", async () => {
  const plan = await planDiscover(
    ["code", "--out", "docs/codebase.dp.yaml", "--json"],
    createPlanningDependencies({
      discoverRepo: () => ({
        ok: true,
        command: "discover",
        target: "code",
        mode: "summary",
        preset: "typescript",
        include: ["**/*.ts"],
        exclude: [],
        ignoreSources: [],
        readOnly: true,
        files: ["src/index.ts", "src/routes/home.ts"],
        modules: [
          {
            path: "src/index.ts",
            extension: ".ts",
            classifications: ["source"],
            importSpecifiers: ["./routes/home"],
            exportCount: 1,
          },
          {
            path: "src/routes/home.ts",
            extension: ".ts",
            classifications: ["source", "route-like"],
            importSpecifiers: [],
            exportCount: 1,
          },
        ],
        importEdges: [
          {
            from: "src/index.ts",
            specifier: "./routes/home",
            to: "src/routes/home.ts",
            kind: "internal",
          },
        ],
        unresolvedImports: [],
        ignoredFiles: [],
      }),
    }),
  );

  assert.equal(plan.exitCode, 0);
  assert.equal(plan.stderr, "");
  assert.deepEqual(JSON.parse(plan.stdout), {
    ok: true,
    command: "discover",
    target: "code",
    mode: "source",
    output: "docs/codebase.dp.yaml",
    readOnly: false,
    files: ["src/index.ts", "src/routes/home.ts"],
    nodes: 2,
    edges: 1,
  });
  assert.equal(plan.writes.length, 1);
  assert.equal(plan.writes[0].path, "docs/codebase.dp.yaml");

  assert.equal(
    plan.writes[0].content,
    [
      "version: 1",
      "title: Codebase Map",
      "direction: right",
      "nodes:",
      "  - id: file_src_index_ts",
      "    label: src/index.ts",
      "    kind: module",
      "    metadata:",
      "      source: src/index.ts",
      "  - id: file_src_routes_home_ts",
      "    label: src/routes/home.ts",
      "    kind: module",
      "    metadata:",
      "      source: src/routes/home.ts",
      "edges:",
      "  - id: import_file_src_index_ts_to_file_src_routes_home_ts",
      "    from: file_src_index_ts",
      "    to: file_src_routes_home_ts",
      "    label: ./routes/home",
      "    kind: dependency",
      "    metadata:",
      "      source: src/index.ts",
      "      importSpecifier: ./routes/home",
      "metadata:",
      "  source: \"**/*.{js,jsx,ts,tsx,mts,cts}\"",
      "  generatedBy: diagrampilot discover code",
      "",
    ].join("\n"),
  );
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
    /diagrampilot discover code \[--json\] \[--include-tests\] \[--include-functions\] \[--preset typescript\|node-package\|monorepo\]/u,
  );
});

test("plans unsupported discover update options as repairable usage", async () => {
  await assertDiscoverUsageFailure(
    ["code", "--update", "docs/codebase.dp.yaml"],
    /^Unsupported discover write option: --update/u,
  );
  await assertDiscoverUsageFailure(
    ["code", "--force"],
    /^Unsupported discover write option: --force/u,
  );
});
