import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
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
