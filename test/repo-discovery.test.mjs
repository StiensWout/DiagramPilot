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
