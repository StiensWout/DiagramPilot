import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicPackageReadmes = [
  ["diagrampilot", "packages/cli/README.md"],
  ["@diagrampilot/core", "packages/core/README.md"],
  ["@diagrampilot/icons", "packages/icons/README.md"],
  ["@diagrampilot/export-mermaid", "packages/export-mermaid/README.md"],
  ["@diagrampilot/export-d2", "packages/export-d2/README.md"],
  ["@diagrampilot/render-svg", "packages/render-svg/README.md"],
];

function runPackageReadinessCheck() {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [path.join(repoRoot, "scripts", "check-package-readiness.mjs")],
      {
        cwd: repoRoot,
        env: { ...process.env, FORCE_COLOR: "0", NO_COLOR: "1" },
      },
    );

    let stdout = "";
    let stderr = "";

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code, signal) => {
      resolve({ code, signal, stdout, stderr });
    });
  });
}

test("package readiness check passes for release-ready public package metadata and tarballs", async () => {
  const result = await runPackageReadinessCheck();

  assert.equal(result.signal, null);
  assert.equal(result.code, 0, result.stderr);
  assert.equal(result.stderr, "");
  assert.equal(
    result.stdout,
    "DiagramPilot package readiness checks passed for 6 public packages.\n",
  );
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

  assert.match(adr, /^# Public Alpha Release And Package Publishing$/m);
  assert.match(adr, /MIT Code License/);
  assert.match(adr, /Brand Use Policy/);
  assert.match(adr, /Public Package Set/);
  assert.match(adr, /`diagrampilot`/);
  assert.match(adr, /`@diagrampilot\/core`/);
  assert.match(adr, /`@diagrampilot\/icons`/);
  assert.match(adr, /`@diagrampilot\/export-mermaid`/);
  assert.match(adr, /`@diagrampilot\/export-d2`/);
  assert.match(adr, /`@diagrampilot\/render-svg`/);
  assert.match(adr, /prealpha/);
  assert.match(adr, /v0\.2\.0/);
  assert.match(adr, /latest/);
  assert.match(adr, /root workspace and `website` workspace remain private/);
  assert.match(adr, /npm pack --dry-run/);
});
