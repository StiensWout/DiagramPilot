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

function discoveredModule(path, options = {}) {
  return {
    path,
    extension: ".ts",
    classifications: options.classifications ?? ["source"],
    importSpecifiers: options.importSpecifiers ?? [],
    exportCount: 1,
  };
}

function internalImport(from, specifier, to) {
  return {
    from,
    specifier,
    to,
    kind: "internal",
  };
}

function routeCodeDiscoverySummary() {
  return codeDiscoverySummary({
    files: ["src/index.ts", "src/routes/home.ts"],
    modules: [
      discoveredModule("src/index.ts", {
        importSpecifiers: ["./routes/home"],
      }),
      discoveredModule("src/routes/home.ts", {
        classifications: ["source", "route-like"],
      }),
    ],
    importEdges: [
      internalImport("src/index.ts", "./routes/home", "src/routes/home.ts"),
    ],
  });
}

function codeDiscoverySummary({
  files,
  modules = [],
  importEdges = [],
  functions = [],
  functionCallEdges = [],
  functionDiagnostics = [],
}) {
  return {
    ok: true,
    command: "discover",
    target: "code",
    mode: "summary",
    preset: "typescript",
    include: ["**/*.ts"],
    exclude: [],
    ignoreSources: [],
    readOnly: true,
    files,
    modules,
    importEdges,
    unresolvedImports: [],
    ignoredFiles: [],
    functions,
    functionCallEdges,
    functionDiagnostics,
  };
}

function codebaseMapSpec(spec) {
  return {
    version: 1,
    title: "Codebase Map",
    direction: "right",
    ...spec,
  };
}

function functionMapSpec(spec) {
  return {
    version: 1,
    title: "Function Map",
    direction: "right",
    ...spec,
  };
}

function moduleSpecNode(id, source) {
  return {
    id,
    label: source,
    kind: "module",
    metadata: { source },
  };
}

function importSpecEdge(id, from, to, specifier, source) {
  return {
    id,
    from,
    to,
    label: specifier,
    kind: "dependency",
    metadata: {
      source,
      importSpecifier: specifier,
    },
  };
}

function functionSpecNode(id, label, modulePath, source) {
  return {
    id,
    label,
    kind: "function",
    metadata: {
      source,
      module: modulePath,
      exported: true,
    },
  };
}

function functionSpecEdge(id, from, to, label, source) {
  return {
    id,
    from,
    to,
    label,
    kind: "dependency",
    metadata: {
      source,
      call: label,
    },
  };
}

function discoveredFunction(id, path, name, source) {
  return {
    id,
    path,
    name,
    exported: true,
    exportName: name,
    kind: "function-declaration",
    source,
  };
}

function functionCallEdge(from, to, callee, source) {
  return {
    from,
    to,
    callee,
    source,
    kind: "direct",
  };
}

function existingSourceLoad(existingPath, spec) {
  return {
    ok: true,
    source: {
      format: "yaml",
      path: existingPath,
      content: "",
      value: {},
    },
    spec,
  };
}

async function planDiscoverSourceUpdate(options) {
  return await planDiscover(
    [
      "code",
      ...(options.includeFunctions === true ? ["--include-functions"] : []),
      "--out",
      options.existingPath,
      "--update",
      "--json",
    ],
    createPlanningDependencies({
      pathExists: (candidate) => candidate === options.existingPath,
      loadValidatedDiagramSpec: () =>
        existingSourceLoad(options.existingPath, options.existingSpec),
      discoverRepo: () => options.discovery,
    }),
  );
}

function assertDiscoverSourceJson(plan, payload) {
  assert.deepEqual(JSON.parse(plan.stdout), {
    ok: true,
    command: "discover",
    target: "code",
    mode: "source",
    readOnly: false,
    ...payload,
  });
}

const noDiscoveryChanges = {
  added: 0,
  removed: 0,
  changed: 0,
  unmatched: 0,
};

function assertUpdateChanges(plan, changes) {
  assert.deepEqual(JSON.parse(plan.stdout).changes, changes);
}

function assertContentIncludesIds(content, ids) {
  for (const id of ids) {
    assert.match(content, new RegExp(`^  - id: ${id}$`, "m"));
  }
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
      discoverRepo: routeCodeDiscoverySummary,
    }),
  );

  assert.equal(plan.exitCode, 0);
  assert.equal(plan.stderr, "");
  assertDiscoverSourceJson(plan, {
    output: "docs/codebase.dp.yaml",
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

test("plans discover code output refusal when the target source already exists", async () => {
  const existingPath = "docs/codebase.dp.yaml";
  const plan = await planDiscover(
    ["code", "--out", existingPath],
    createPlanningDependencies({
      pathExists: (candidate) => candidate === existingPath,
    }),
  );

  assert.equal(plan.exitCode, 1);
  assert.equal(plan.stdout, "");
  assert.match(
    plan.stderr,
    /DiagramPilot discovery output already exists: docs\/codebase\.dp\.yaml/u,
  );
  assert.match(plan.stderr, /rerun discover with --update or --force/u);
  assert.deepEqual(plan.writes, []);
});

test("plans discover code force output as an explicit replacement write", async () => {
  const existingPath = "docs/codebase.dp.yaml";
  const plan = await planDiscover(
    ["code", "--out", existingPath, "--force", "--json"],
    createPlanningDependencies({
      pathExists: (candidate) => candidate === existingPath,
    }),
  );

  assert.equal(plan.exitCode, 0);
  assert.equal(plan.stderr, "");
  assertDiscoverSourceJson(plan, {
    output: existingPath,
    writeMode: "force",
    replaced: true,
    files: ["src/app.ts"],
    nodes: 0,
    edges: 0,
  });
  assert.equal(plan.writes.length, 1);
  assert.equal(plan.writes[0].path, existingPath);
});

test("plans discover code update preserving stable IDs for unchanged files and imports", async () => {
  const existingPath = "docs/codebase.dp.yaml";
  const plan = await planDiscoverSourceUpdate({
    existingPath,
    existingSpec: codebaseMapSpec({
      nodes: [
        moduleSpecNode("app_module", "src/app.ts"),
        moduleSpecNode("home_module", "src/home.ts"),
      ],
      edges: [
        importSpecEdge(
          "app_imports_home",
          "app_module",
          "home_module",
          "./home",
          "src/app.ts",
        ),
      ],
    }),
    discovery: codeDiscoverySummary({
      files: ["src/app.ts", "src/home.ts"],
      modules: [
        discoveredModule("src/app.ts", {
          importSpecifiers: ["./home"],
        }),
        discoveredModule("src/home.ts"),
      ],
      importEdges: [internalImport("src/app.ts", "./home", "src/home.ts")],
    }),
  });

  assert.equal(plan.exitCode, 0);
  assert.equal(plan.stderr, "");
  assertUpdateChanges(plan, noDiscoveryChanges);
  assertContentIncludesIds(plan.writes[0].content, [
    "app_module",
    "home_module",
    "app_imports_home",
  ]);
  assert.doesNotMatch(plan.writes[0].content, /file_src_app_ts/u);
});

test("plans discover code update reporting removed and rename-like unmatched files", async () => {
  const existingPath = "docs/codebase.dp.yaml";
  const plan = await planDiscoverSourceUpdate({
    existingPath,
    existingSpec: codebaseMapSpec({
      nodes: [
        moduleSpecNode("legacy_app_module", "src/app.ts"),
        moduleSpecNode("legacy_orders_module", "src/orders.ts"),
      ],
    }),
    discovery: codeDiscoverySummary({
      files: ["src/app.ts", "src/billing.ts"],
      modules: [discoveredModule("src/app.ts"), discoveredModule("src/billing.ts")],
    }),
  });

  assert.equal(plan.exitCode, 0);
  assertUpdateChanges(plan, {
    added: 1,
    removed: 1,
    changed: 0,
    unmatched: 1,
  });
  assertContentIncludesIds(plan.writes[0].content, [
    "legacy_app_module",
    "file_src_billing_ts",
  ]);
  assert.doesNotMatch(plan.writes[0].content, /legacy_orders_module/u);
});

test("plans discover code update preserving function and call stable IDs", async () => {
  const existingPath = "docs/functions.dp.yaml";
  const plan = await planDiscoverSourceUpdate({
    existingPath,
    includeFunctions: true,
    existingSpec: functionMapSpec({
      nodes: [
        functionSpecNode(
          "bootstrap_function",
          "bootstrap",
          "src/index.ts",
          "src/index.ts#L3",
        ),
        functionSpecNode(
          "format_function",
          "formatMessage",
          "src/messages.ts",
          "src/messages.ts#L1",
        ),
      ],
      edges: [
        functionSpecEdge(
          "bootstrap_calls_format",
          "bootstrap_function",
          "format_function",
          "formatMessage",
          "src/index.ts#L4",
        ),
      ],
    }),
    discovery: codeDiscoverySummary({
      files: ["src/index.ts", "src/messages.ts"],
      functions: [
        discoveredFunction(
          "fn_src_index_ts_bootstrap",
          "src/index.ts",
          "bootstrap",
          "src/index.ts#L3",
        ),
        discoveredFunction(
          "fn_src_messages_ts_formatmessage",
          "src/messages.ts",
          "formatMessage",
          "src/messages.ts#L1",
        ),
      ],
      functionCallEdges: [
        functionCallEdge(
          "fn_src_index_ts_bootstrap",
          "fn_src_messages_ts_formatmessage",
          "formatMessage",
          "src/index.ts#L4",
        ),
      ],
      functionDiagnostics: [],
    }),
  });

  assert.equal(plan.exitCode, 0);
  assertUpdateChanges(plan, noDiscoveryChanges);
  assertContentIncludesIds(plan.writes[0].content, [
    "bootstrap_function",
    "format_function",
    "bootstrap_calls_format",
  ]);
});
