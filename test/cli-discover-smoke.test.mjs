import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  assertCliFailure,
  assertCliSucceeded,
  findFilesMatching,
  runBuiltCli,
  withTempRepo,
} from "./cli-smoke-helpers.mjs";

async function writeMinimalCodeRepo(tempRoot) {
  await mkdir(path.join(tempRoot, ".git"));
  await mkdir(path.join(tempRoot, "src"), { recursive: true });
  await writeFile(path.join(tempRoot, "src", "app.ts"), "export {}\n");
}

async function writeDiscoverFixtureRepo(tempRoot) {
  await writeMinimalCodeRepo(tempRoot);
  await writeFile(path.join(tempRoot, "package.json"), '{"name":"fixture"}\n');
  await writeFile(
    path.join(tempRoot, ".gitignore"),
    ["generated/**", "tmp.ts", ""].join("\n"),
  );
  await writeFile(
    path.join(tempRoot, "diagrampilot.config.yaml"),
    [
      "version: 1",
      "discovery:",
      "  preset: monorepo",
      "sources:",
      "  ignore:",
      "    - fixtures/**",
      "",
    ].join("\n"),
  );
}

async function writeFunctionDiscoveryFixtureRepo(tempRoot, options = {}) {
  await mkdir(path.join(tempRoot, ".git"));
  if (options.withDocs === true) {
    await mkdir(path.join(tempRoot, "docs"), { recursive: true });
  }
  await mkdir(path.join(tempRoot, "src"), { recursive: true });
  await writeFile(
    path.join(tempRoot, "src", "index.ts"),
    [
      'import { formatMessage } from "./messages";',
      "",
      "export function bootstrap() {",
      '  formatMessage("ready");',
      "}",
      "",
    ].join("\n"),
  );
  await writeFile(
    path.join(tempRoot, "src", "messages.ts"),
    [
      "export function formatMessage(value: string) {",
      "  return value.trim();",
      "}",
      "",
    ].join("\n"),
  );
}

async function writeImportDiscoveryFixtureRepo(tempRoot, options = {}) {
  await mkdir(path.join(tempRoot, ".git"));
  await mkdir(path.join(tempRoot, "docs"), { recursive: true });

  if (options.nestedRoute === true) {
    await mkdir(path.join(tempRoot, "src", "routes"), { recursive: true });
    await writeFile(
      path.join(tempRoot, "src", "index.ts"),
      [
        'import { renderHome } from "./routes/home";',
        "export { renderHome };",
        "",
      ].join("\n"),
    );
    await writeFile(
      path.join(tempRoot, "src", "routes", "home.ts"),
      "export function renderHome() {}\n",
    );
    return;
  }

  await mkdir(path.join(tempRoot, "src"), { recursive: true });
  await writeFile(
    path.join(tempRoot, "src", "app.ts"),
    [
      'import { renderHome } from "./home";',
      "export { renderHome };",
      "",
    ].join("\n"),
  );
  await writeFile(
    path.join(tempRoot, "src", "home.ts"),
    "export function renderHome() {}\n",
  );
}

test("diagrampilot discover packages --json reports effective options without writing files", async () => {
  await withTempRepo(async (tempRoot) => {
    await writeDiscoverFixtureRepo(tempRoot);
    const beforeFiles = await findFilesMatching(tempRoot, tempRoot, /./u);

    const result = await runBuiltCli(["discover", "packages", "--json"], tempRoot);

    assertCliSucceeded(result);
    const payload = JSON.parse(result.stdout);

    assert.equal(payload.ok, true);
    assert.equal(payload.target, "packages");
    assert.equal(payload.preset, "monorepo");
    assert.equal(payload.readOnly, true);
    assert.deepEqual(payload.include, [
      "package.json",
      "packages/*/package.json",
    ]);
    assert.deepEqual(payload.ignoreSources.slice(1), [
      {
        source: "gitignore",
        path: ".gitignore",
        patterns: ["generated/**", "tmp.ts"],
      },
      {
        source: "config",
        path: "diagrampilot.config.yaml",
        patterns: ["fixtures/**"],
      },
    ]);

    const afterFiles = await findFilesMatching(tempRoot, tempRoot, /./u);
    assert.deepEqual(afterFiles, beforeFiles);
  });
});

test("diagrampilot discover code --json includes test modules only when requested", async () => {
  await withTempRepo(async (tempRoot) => {
    await writeMinimalCodeRepo(tempRoot);
    await writeFile(
      path.join(tempRoot, "src", "app.test.ts"),
      "export {}\n",
    );

    const defaultResult = await runBuiltCli(["discover", "code", "--json"], tempRoot);
    assertCliSucceeded(defaultResult);
    const defaultPayload = JSON.parse(defaultResult.stdout);

    assert.deepEqual(defaultPayload.files, ["src/app.ts"]);
    assert.deepEqual(defaultPayload.ignoredFiles, [
      {
        path: "src/app.test.ts",
        classifications: ["test"],
        reason: "test",
      },
    ]);

    const includeTestsResult = await runBuiltCli(
      ["discover", "code", "--json", "--include-tests"],
      tempRoot,
    );
    assertCliSucceeded(includeTestsResult);
    const includeTestsPayload = JSON.parse(includeTestsResult.stdout);

    assert.deepEqual(includeTestsPayload.files, [
      "src/app.test.ts",
      "src/app.ts",
    ]);
    assert.deepEqual(includeTestsPayload.ignoredFiles, []);
  });
});

test("diagrampilot discover code --include-functions --json reports function-level discovery", async () => {
  await withTempRepo(async (tempRoot) => {
    await writeFunctionDiscoveryFixtureRepo(tempRoot);

    const result = await runBuiltCli(
      ["discover", "code", "--include-functions", "--json"],
      tempRoot,
    );

    assertCliSucceeded(result);
    const payload = JSON.parse(result.stdout);

    assert.deepEqual(payload.functions, [
      {
        id: "fn_src_index_ts_bootstrap",
        path: "src/index.ts",
        name: "bootstrap",
        exported: true,
        exportName: "bootstrap",
        kind: "function-declaration",
        source: "src/index.ts#L3",
      },
      {
        id: "fn_src_messages_ts_formatmessage",
        path: "src/messages.ts",
        name: "formatMessage",
        exported: true,
        exportName: "formatMessage",
        kind: "function-declaration",
        source: "src/messages.ts#L1",
      },
    ]);
    assert.deepEqual(payload.functionCallEdges, [
      {
        from: "fn_src_index_ts_bootstrap",
        to: "fn_src_messages_ts_formatmessage",
        callee: "formatMessage",
        source: "src/index.ts#L4",
        kind: "direct",
      },
    ]);
    assert.deepEqual(payload.functionDiagnostics, []);
  });
});

test("diagrampilot discover code --out writes a valid source map from TS imports", async () => {
  await withTempRepo(async (tempRoot) => {
    await writeImportDiscoveryFixtureRepo(tempRoot, { nestedRoute: true });

    const result = await runBuiltCli(
      ["discover", "code", "--out", "docs/codebase.dp.yaml"],
      tempRoot,
    );

    assertCliSucceeded(result);
    assert.match(result.stdout, /Wrote docs\/codebase\.dp\.yaml/u);

    const outPath = path.join(tempRoot, "docs", "codebase.dp.yaml");
    assert.equal(
      await readFile(outPath, "utf8"),
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

    assertCliSucceeded(await runBuiltCli(["format", outPath], tempRoot));
    assertCliSucceeded(await runBuiltCli(["validate", outPath], tempRoot));

    const inspectResult = await runBuiltCli(["inspect", outPath, "--json"], tempRoot);
    assertCliSucceeded(inspectResult);
    const inspectPayload = JSON.parse(inspectResult.stdout);
    assert.deepEqual(inspectPayload.sources[0].diagram.counts, {
      nodes: 2,
      edges: 1,
      groups: 0,
    });
  });
});

test("diagrampilot discover code --out protects existing source maps with update and force modes", async () => {
  await withTempRepo(async (tempRoot) => {
    await writeImportDiscoveryFixtureRepo(tempRoot);

    const outPath = path.join(tempRoot, "docs", "codebase.dp.yaml");
    const firstWrite = await runBuiltCli(
      ["discover", "code", "--out", "docs/codebase.dp.yaml"],
      tempRoot,
    );
    assertCliSucceeded(firstWrite);

    const refusal = await runBuiltCli(
      ["discover", "code", "--out", "docs/codebase.dp.yaml"],
      tempRoot,
    );
    assertCliFailure(refusal, {
      stderrPatterns: [
        /DiagramPilot discovery output already exists: docs\/codebase\.dp\.yaml/u,
        /rerun discover with --update or --force/u,
      ],
    });

    await writeFile(
      outPath,
      [
        "version: 1",
        "title: Codebase Map",
        "direction: right",
        "nodes:",
        "  - id: app_module",
        "    label: src/app.ts",
        "    kind: module",
        "    metadata:",
        "      source: src/app.ts",
        "  - id: home_module",
        "    label: src/home.ts",
        "    kind: module",
        "    metadata:",
        "      source: src/home.ts",
        "edges:",
        "  - id: app_imports_home",
        "    from: app_module",
        "    to: home_module",
        "    label: ./home",
        "    kind: dependency",
        "    metadata:",
        "      source: src/app.ts",
        "      importSpecifier: ./home",
        "",
      ].join("\n"),
    );

    const update = await runBuiltCli(
      [
        "discover",
        "code",
        "--out",
        "docs/codebase.dp.yaml",
        "--update",
        "--json",
      ],
      tempRoot,
    );
    assertCliSucceeded(update);
    assert.deepEqual(JSON.parse(update.stdout).changes, {
      added: 0,
      removed: 0,
      changed: 0,
      unmatched: 0,
    });

    const updatedContent = await readFile(outPath, "utf8");
    assert.match(updatedContent, /^  - id: app_module$/m);
    assert.match(updatedContent, /^  - id: home_module$/m);
    assert.match(updatedContent, /^  - id: app_imports_home$/m);

    const force = await runBuiltCli(
      [
        "discover",
        "code",
        "--out",
        "docs/codebase.dp.yaml",
        "--force",
        "--json",
      ],
      tempRoot,
    );
    assertCliSucceeded(force);
    assert.equal(JSON.parse(force.stdout).writeMode, "force");

    const forcedContent = await readFile(outPath, "utf8");
    assert.match(forcedContent, /^  - id: file_src_app_ts$/m);
    assert.doesNotMatch(forcedContent, /^  - id: app_module$/m);
  });
});

test("diagrampilot discover code --include-functions --out writes a valid function map", async () => {
  await withTempRepo(async (tempRoot) => {
    await writeFunctionDiscoveryFixtureRepo(tempRoot, { withDocs: true });

    const result = await runBuiltCli(
      [
        "discover",
        "code",
        "--include-functions",
        "--out",
        "docs/functions.dp.yaml",
      ],
      tempRoot,
    );

    assertCliSucceeded(result);
    assert.match(result.stdout, /Wrote docs\/functions\.dp\.yaml/u);

    const outPath = path.join(tempRoot, "docs", "functions.dp.yaml");
    assert.equal(
      await readFile(outPath, "utf8"),
      [
        "version: 1",
        "title: Function Map",
        "direction: right",
        "nodes:",
        "  - id: fn_src_index_ts_bootstrap",
        "    label: bootstrap",
        "    kind: function",
        "    metadata:",
        "      source: src/index.ts#L3",
        "      module: src/index.ts",
        "      exported: true",
        "  - id: fn_src_messages_ts_formatmessage",
        "    label: formatMessage",
        "    kind: function",
        "    metadata:",
        "      source: src/messages.ts#L1",
        "      module: src/messages.ts",
        "      exported: true",
        "edges:",
        "  - id: call_fn_src_index_ts_bootstrap_to_fn_src_messages_ts_formatmessage",
        "    from: fn_src_index_ts_bootstrap",
        "    to: fn_src_messages_ts_formatmessage",
        "    label: formatMessage",
        "    kind: dependency",
        "    metadata:",
        "      source: src/index.ts#L4",
        "      call: formatMessage",
        "metadata:",
        "  source: \"**/*.{js,jsx,ts,tsx,mts,cts}\"",
        "  generatedBy: diagrampilot discover code --include-functions",
        "",
      ].join("\n"),
    );

    assertCliSucceeded(await runBuiltCli(["format", outPath], tempRoot));
    assertCliSucceeded(await runBuiltCli(["validate", outPath], tempRoot));
  });
});
