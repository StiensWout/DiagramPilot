import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { assertMatchesAll } from "./assertion-helpers.mjs";
import {
  assertProcessSuccess,
  runProcess,
  sanitizedTestEnv,
} from "./process-helpers.mjs";
import { withTempRepoPrefix } from "./temp-repo-helpers.mjs";

const repoRoot = path.resolve(import.meta.dirname, "..");
const packageSizeBudgetScriptPath = path.join(
  repoRoot,
  "scripts",
  "check-package-size-budgets.mjs",
);
const publicPackageSet = [
  ["diagrampilot", "packages/cli"],
  ["@diagrampilot/core", "packages/core"],
  ["@diagrampilot/icons", "packages/icons"],
  ["@diagrampilot/export-mermaid", "packages/export-mermaid"],
  ["@diagrampilot/export-d2", "packages/export-d2"],
  ["@diagrampilot/export-dot", "packages/export-dot"],
  ["@diagrampilot/mcp", "packages/mcp"],
  ["@diagrampilot/render-svg", "packages/render-svg"],
];

function runPackageSizeBudgetCheck(options = {}) {
  return runProcess(process.execPath, [packageSizeBudgetScriptPath], {
    cwd: options.cwd ?? repoRoot,
    env: sanitizedTestEnv(),
  });
}

async function writePackageFixture(rootPath, [packageName, packageDirectory]) {
  const absolutePackageDirectory = path.join(rootPath, packageDirectory);
  await mkdir(path.join(absolutePackageDirectory, "dist"), { recursive: true });
  await writeFile(
    path.join(absolutePackageDirectory, "package.json"),
    `${JSON.stringify(
      {
        name: packageName,
        version: "1.0.0",
        type: "module",
        main: "./dist/index.js",
        files: ["dist/**/*", "README.md", "LICENSE"],
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  await writeFile(path.join(absolutePackageDirectory, "README.md"), `# ${packageName}\n`);
  await writeFile(path.join(absolutePackageDirectory, "LICENSE"), "MIT\n");
  await writeFile(path.join(absolutePackageDirectory, "dist", "index.js"), "\n");
}

async function writePackageWorkspaceFixture(rootPath) {
  await writeFile(
    path.join(rootPath, "package.json"),
    `${JSON.stringify({ private: true, workspaces: ["packages/*"] }, null, 2)}\n`,
    "utf8",
  );

  for (const packageRecord of publicPackageSet) {
    await writePackageFixture(rootPath, packageRecord);
  }
}

test("package size budget check reports packed sizes for the Public Package Set", async () => {
  const result = await runPackageSizeBudgetCheck();

  assertProcessSuccess(result);
  assert.equal(result.stderr, "");
  assertMatchesAll(result.stdout, [
    /^DiagramPilot package size budget report$/m,
    /^Package\s+Packed\s+Budget\s+Status$/m,
    /^Package size budgets passed for 8 public packages\.$/m,
  ]);

  for (const [packageName] of publicPackageSet) {
    assert.match(
      result.stdout,
      new RegExp(`^${packageName.replace("/", "\\/")}\\s+\\d+\\.\\d KiB\\s+\\d+\\.\\d KiB\\s+OK$`, "m"),
    );
  }
});

test("workspace exposes package size budgets as a named npm check", async () => {
  const manifest = JSON.parse(await readFile(path.join(repoRoot, "package.json"), "utf8"));

  assert.equal(
    manifest.scripts["check:package-size-budgets"],
    "node scripts/check-package-size-budgets.mjs",
  );
});

test("package size budget check fails when a public package exceeds its packed budget", async () => {
  await withTempRepoPrefix("diagrampilot-package-sizes-", async (tempRoot) => {
    await writePackageWorkspaceFixture(tempRoot);
    await writeFile(
      path.join(tempRoot, "packages", "core", "dist", "payload.bin"),
      randomBytes(90 * 1024),
    );

    const result = await runPackageSizeBudgetCheck({ cwd: tempRoot });

    assert.equal(result.signal, null);
    assert.equal(result.code, 1);
    assert.match(result.stdout, /^@diagrampilot\/core\s+\d+\.\d KiB\s+80\.0 KiB\s+OVER$/m);
    assertMatchesAll(result.stderr, [
      /^DiagramPilot package size budget checks failed:$/m,
      /@diagrampilot\/core packed tarball is \d+\.\d KiB; budget is 80\.0 KiB\./u,
    ]);
  });
});
