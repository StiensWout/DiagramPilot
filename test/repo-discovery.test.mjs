import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { discoverRepo } from "../packages/core/dist/index.js";
import { withTempRepoPrefix } from "./temp-repo-helpers.mjs";

const builtinIgnorePatterns = [
  "node_modules/**",
  ".git/**",
  "dist/**",
  "build/**",
  "coverage/**",
  ".next/**",
  ".vite/**",
  ".turbo/**",
];

test("repo discovery combines built-in, gitignore, and config ignore sources", async () => {
  await withTempRepoPrefix("diagrampilot-discovery-", async (tempRoot) => {
    await mkdir(path.join(tempRoot, ".git"));
    await mkdir(path.join(tempRoot, "src"), { recursive: true });
    await mkdir(path.join(tempRoot, "dist"), { recursive: true });
    await mkdir(path.join(tempRoot, "node_modules", "pkg"), { recursive: true });
    await writeFile(path.join(tempRoot, "src", "app.ts"), "export {}\n");
    await writeFile(path.join(tempRoot, "dist", "generated.js"), "");
    await writeFile(path.join(tempRoot, "node_modules", "pkg", "index.js"), "");
    await writeFile(
      path.join(tempRoot, ".gitignore"),
      ["# local generated output", "generated/**", "tmp.ts", ""].join("\n"),
    );
    await writeFile(
      path.join(tempRoot, "diagrampilot.config.yaml"),
      [
        "version: 1",
        "discovery:",
        "  preset: monorepo",
        "sources:",
        "  ignore:",
        "    - docs/generated/**",
        "    - fixtures/**",
        "",
      ].join("\n"),
    );

    const result = await discoverRepo({
      target: "code",
      scopePath: tempRoot,
    });

    assert.equal(result.ok, true);
    assert.equal(result.preset, "monorepo");
    assert.deepEqual(result.ignoreSources, [
      {
        source: "builtin",
        patterns: builtinIgnorePatterns,
      },
      {
        source: "gitignore",
        path: ".gitignore",
        patterns: ["generated/**", "tmp.ts"],
      },
      {
        source: "config",
        path: "diagrampilot.config.yaml",
        patterns: ["docs/generated/**", "fixtures/**"],
      },
    ]);
    assert.deepEqual(result.exclude, [
      ...builtinIgnorePatterns,
      "generated/**",
      "tmp.ts",
      "docs/generated/**",
      "fixtures/**",
    ]);
  });
});

test("code discovery summarizes supported TS and JS modules", async () => {
  await withTempRepoPrefix("diagrampilot-code-discovery-", async (tempRoot) => {
    await mkdir(path.join(tempRoot, ".git"));
    await mkdir(path.join(tempRoot, "bin"), { recursive: true });
    await mkdir(path.join(tempRoot, "src", "routes"), { recursive: true });
    await writeFile(
      path.join(tempRoot, "src", "index.ts"),
      [
        'import { renderHome } from "./routes/home";',
        'import Widget from "./widget.jsx";',
        'import "./missing";',
        "export { renderHome };",
        "export default function main() {}",
        "",
      ].join("\n"),
    );
    await writeFile(
      path.join(tempRoot, "src", "routes", "home.tsx"),
      "export function renderHome() {}\n",
    );
    await writeFile(
      path.join(tempRoot, "src", "widget.jsx"),
      "export default function Widget() {}\n",
    );
    await writeFile(
      path.join(tempRoot, "src", "tool.mts"),
      "export const tool = true;\n",
    );
    await writeFile(
      path.join(tempRoot, "src", "legacy.cts"),
      "const legacy = {};\nexport = legacy;\n",
    );
    await writeFile(
      path.join(tempRoot, "bin", "diagrampilot-fixture.js"),
      "#!/usr/bin/env node\nexport const cli = true;\n",
    );

    const result = await discoverRepo({
      target: "code",
      scopePath: tempRoot,
    });

    assert.equal(result.ok, true);
    assert.deepEqual(result.files, [
      "bin/diagrampilot-fixture.js",
      "src/index.ts",
      "src/legacy.cts",
      "src/routes/home.tsx",
      "src/tool.mts",
      "src/widget.jsx",
    ]);
    assert.deepEqual(
      result.modules.map((module) => ({
        path: module.path,
        classifications: module.classifications,
        exportCount: module.exportCount,
      })),
      [
        {
          path: "bin/diagrampilot-fixture.js",
          classifications: ["source", "cli-entrypoint"],
          exportCount: 1,
        },
        {
          path: "src/index.ts",
          classifications: ["source"],
          exportCount: 2,
        },
        {
          path: "src/legacy.cts",
          classifications: ["source"],
          exportCount: 1,
        },
        {
          path: "src/routes/home.tsx",
          classifications: ["source", "route-like"],
          exportCount: 1,
        },
        {
          path: "src/tool.mts",
          classifications: ["source"],
          exportCount: 1,
        },
        {
          path: "src/widget.jsx",
          classifications: ["source"],
          exportCount: 1,
        },
      ],
    );
    assert.deepEqual(result.importEdges, [
      {
        from: "src/index.ts",
        specifier: "./routes/home",
        to: "src/routes/home.tsx",
        kind: "internal",
      },
      {
        from: "src/index.ts",
        specifier: "./widget.jsx",
        to: "src/widget.jsx",
        kind: "internal",
      },
      {
        from: "src/index.ts",
        specifier: "./missing",
        to: null,
        kind: "unresolved",
      },
    ]);
    assert.deepEqual(result.unresolvedImports, [
      {
        from: "src/index.ts",
        specifier: "./missing",
      },
    ]);
  });
});

test("code discovery reports function details only when explicitly requested", async () => {
  await withTempRepoPrefix("diagrampilot-code-functions-", async (tempRoot) => {
    await mkdir(path.join(tempRoot, ".git"));
    await mkdir(path.join(tempRoot, "src"), { recursive: true });
    await writeFile(
      path.join(tempRoot, "src", "index.ts"),
      [
        'import { formatMessage, normalizeMessage } from "./messages";',
        "",
        "export function bootstrap() {",
        '  formatMessage("ready");',
        '  normalizeMessage("READY");',
        "  recordMetric();",
        "  registry[currentMetric]();",
        "}",
        "",
        "function recordMetric() {}",
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
        "export const normalizeMessage = (value: string) => value.toLowerCase();",
        "",
      ].join("\n"),
    );

    const defaultResult = await discoverRepo({
      target: "code",
      scopePath: tempRoot,
    });

    assert.equal(defaultResult.ok, true);
    assert.equal("functions" in defaultResult, false);
    assert.equal("functionCallEdges" in defaultResult, false);
    assert.equal("functionDiagnostics" in defaultResult, false);

    const functionResult = await discoverRepo({
      target: "code",
      scopePath: tempRoot,
      includeFunctions: true,
    });

    assert.equal(functionResult.ok, true);
    assert.deepEqual(functionResult.functions, [
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
        id: "fn_src_index_ts_recordmetric",
        path: "src/index.ts",
        name: "recordMetric",
        exported: false,
        exportName: null,
        kind: "function-declaration",
        source: "src/index.ts#L10",
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
      {
        id: "fn_src_messages_ts_normalizemessage",
        path: "src/messages.ts",
        name: "normalizeMessage",
        exported: true,
        exportName: "normalizeMessage",
        kind: "arrow-function",
        source: "src/messages.ts#L5",
      },
    ]);
    assert.deepEqual(functionResult.functionCallEdges, [
      {
        from: "fn_src_index_ts_bootstrap",
        to: "fn_src_messages_ts_formatmessage",
        callee: "formatMessage",
        source: "src/index.ts#L4",
        kind: "direct",
      },
      {
        from: "fn_src_index_ts_bootstrap",
        to: "fn_src_messages_ts_normalizemessage",
        callee: "normalizeMessage",
        source: "src/index.ts#L5",
        kind: "direct",
      },
      {
        from: "fn_src_index_ts_bootstrap",
        to: "fn_src_index_ts_recordmetric",
        callee: "recordMetric",
        source: "src/index.ts#L6",
        kind: "direct",
      },
    ]);
    assert.deepEqual(functionResult.functionDiagnostics, [
      {
        code: "dynamic-function-call",
        path: "src/index.ts",
        functionId: "fn_src_index_ts_bootstrap",
        callee: "registry[currentMetric]",
        source: "src/index.ts#L7",
        message:
          "Dynamic function call registry[currentMetric] was not added as a certain call edge.",
      },
    ]);
  });
});

test("code discovery excludes generated, test, and gitignored files by default", async () => {
  await withTempRepoPrefix("diagrampilot-code-ignore-", async (tempRoot) => {
    await mkdir(path.join(tempRoot, ".git"));
    await mkdir(path.join(tempRoot, "build"), { recursive: true });
    await mkdir(path.join(tempRoot, "node_modules", "left-pad"), { recursive: true });
    await mkdir(path.join(tempRoot, "src", "generated"), { recursive: true });
    await mkdir(path.join(tempRoot, "src", "tests"), { recursive: true });
    await writeFile(path.join(tempRoot, "build", "bundle.ts"), "export {}\n");
    await writeFile(
      path.join(tempRoot, "node_modules", "left-pad", "index.js"),
      "export {}\n",
    );
    await writeFile(path.join(tempRoot, "src", "app.ts"), "export {}\n");
    await writeFile(
      path.join(tempRoot, "src", "generated", "client.ts"),
      "export {}\n",
    );
    await writeFile(
      path.join(tempRoot, "src", "tests", "app.test.ts"),
      "export {}\n",
    );
    await writeFile(
      path.join(tempRoot, "src", "local-only.ts"),
      "export {}\n",
    );
    await writeFile(path.join(tempRoot, ".gitignore"), "src/local-only.ts\n");

    const result = await discoverRepo({
      target: "code",
      scopePath: tempRoot,
    });

    assert.equal(result.ok, true);
    assert.deepEqual(result.files, ["src/app.ts"]);
    assert.deepEqual(result.ignoredFiles, [
      {
        path: "src/generated/client.ts",
        classifications: ["generated"],
        reason: "generated",
      },
      {
        path: "src/local-only.ts",
        classifications: ["source"],
        reason: "ignored",
      },
      {
        path: "src/tests/app.test.ts",
        classifications: ["test"],
        reason: "test",
      },
    ]);
  });
});
