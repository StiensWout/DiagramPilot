import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  assertProcessSuccess,
  runProcess,
  sanitizedTestEnv,
} from "./process-helpers.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const removedPolicyTitle = ["Brand", "Use", "Policy"].join(" ");
const removedPolicyPath = ["BRAND", "USE", "POLICY"].join("_") + ".md";
const publicPackageReadmes = [
  ["diagrampilot", "packages/cli/README.md"],
  ["@diagrampilot/core", "packages/core/README.md"],
  ["@diagrampilot/icons", "packages/icons/README.md"],
  ["@diagrampilot/export-mermaid", "packages/export-mermaid/README.md"],
  ["@diagrampilot/export-d2", "packages/export-d2/README.md"],
  ["@diagrampilot/export-dot", "packages/export-dot/README.md"],
  ["@diagrampilot/mcp", "packages/mcp/README.md"],
  ["@diagrampilot/render-svg", "packages/render-svg/README.md"],
];

function runPackageReadinessCheck() {
  return runProcess(
    process.execPath,
    [path.join(repoRoot, "scripts", "check-package-readiness.mjs")],
    {
      cwd: repoRoot,
      env: sanitizedTestEnv(),
    },
  );
}

async function exists(repoPath) {
  try {
    await access(path.join(repoRoot, repoPath));
    return true;
  } catch {
    return false;
  }
}

test("package readiness check passes for release-ready public package metadata and tarballs", async () => {
  const result = await runPackageReadinessCheck();

  assertProcessSuccess(result, {
    stdout: "DiagramPilot package readiness checks passed for 8 public packages.\n",
  });
});

test("CLI package publishes the diagrampilot binary without npm manifest auto-correction", async () => {
  const manifest = JSON.parse(
    await readFile(path.join(repoRoot, "packages", "cli", "package.json"), "utf8"),
  );

  assert.deepEqual(manifest.bin, {
    diagrampilot: "dist/index.js",
  });
});

test("public packages publish npm README files", async () => {
  for (const [packageName, readmePath] of publicPackageReadmes) {
    const readme = await readFile(path.join(repoRoot, readmePath), "utf8");

    assert.match(readme, new RegExp(`# ${packageName.replace("/", "\\/")}`));
    assert.match(readme, /https:\/\/diagrampilot\.com/);
  }
});

test("root README links to npm pages for the Public Package Set", async () => {
  const readme = await readFile(path.join(repoRoot, "README.md"), "utf8");

  for (const [packageName] of publicPackageReadmes) {
    assert.match(
      readme,
      new RegExp(
        `https://www\\.npmjs\\.com/package/${packageName.replace("/", "\\/")}`,
        "u",
      ),
    );
  }
});

test("repository entrypoints use the MIT license without the retired policy file", async () => {
  const readme = await readFile(path.join(repoRoot, "README.md"), "utf8");
  const license = await readFile(path.join(repoRoot, "LICENSE"), "utf8");

  assert.match(license, /^MIT License$/m);
  assert.match(license, /Permission is hereby granted, free of charge/);
  assert.equal(await exists(removedPolicyPath), false);
  assert.match(readme, /\[MIT Code License\]\(LICENSE\)/);
  assert.match(readme, /Canonical DiagramPilot Brand Assets live in `assets\/brand\/`/);
  assert.equal(readme.includes(removedPolicyTitle), false);
  assert.equal(readme.includes(removedPolicyPath), false);
});
