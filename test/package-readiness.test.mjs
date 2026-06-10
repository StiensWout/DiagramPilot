import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { assertMatchesAll } from "./assertion-helpers.mjs";
import {
  assertProcessSuccess,
  runProcess,
  sanitizedTestEnv,
} from "./process-helpers.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
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

test("repository entrypoints separate the MIT Code License from the Brand Use Policy", async () => {
  const readme = await readFile(path.join(repoRoot, "README.md"), "utf8");
  const license = await readFile(path.join(repoRoot, "LICENSE"), "utf8");
  const brandUsePolicy = await readFile(
    path.join(repoRoot, "BRAND_USE_POLICY.md"),
    "utf8",
  );

  assert.match(license, /^MIT License$/m);
  assert.match(license, /Permission is hereby granted, free of charge/);
  assert.match(brandUsePolicy, /^# DiagramPilot Brand Use Policy$/m);
  assert.match(brandUsePolicy, /separate from the MIT Code License/);
  assert.match(brandUsePolicy, /DiagramPilot name/);
  assert.match(brandUsePolicy, /DiagramPilot mark/);
  assert.match(brandUsePolicy, /DiagramPilot wordmark/);
  assert.match(brandUsePolicy, /diagrampilot\.com/);
  assert.match(brandUsePolicy, /release identity/);
  assert.match(readme, /\[MIT Code License\]\(LICENSE\)/);
  assert.match(readme, /\[Brand Use Policy\]\(BRAND_USE_POLICY\.md\)/);
});

test("public alpha package publishing ADR captures license brand package set and dist-tag decisions", async () => {
  const adr = await readFile(
    path.join(
      repoRoot,
      "docs",
      "adr",
      "0008-public-alpha-release-and-package-publishing.md",
    ),
    "utf8",
  );

  assertMatchesAll(adr, [
    /^# Public Alpha Release And Package Publishing$/m,
    /MIT Code License/,
    /Brand Use Policy/,
    /Public Package Set/,
    /`diagrampilot`/,
    /`@diagrampilot\/core`/,
    /`@diagrampilot\/icons`/,
    /`@diagrampilot\/export-mermaid`/,
    /`@diagrampilot\/export-d2`/,
    /`@diagrampilot\/export-dot`/,
    /`@diagrampilot\/mcp`/,
    /`@diagrampilot\/render-svg`/,
    /prealpha/,
    /v0\.2\.0/,
    /latest/,
    /root workspace and `website` workspace remain private/,
    /npm pack --dry-run/,
  ]);
});
