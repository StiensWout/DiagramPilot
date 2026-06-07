import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const releaseMetadataPaths = [
  "package.json",
  "package-lock.json",
  "packages/cli/package.json",
  "packages/core/package.json",
  "packages/core/src/version.ts",
  "packages/export-d2/package.json",
  "packages/export-dot/package.json",
  "packages/export-mermaid/package.json",
  "packages/icons/package.json",
  "packages/render-svg/package.json",
  "website/package.json",
];

async function readJson(repoPath) {
  return JSON.parse(await readFile(path.join(repoRoot, repoPath), "utf8"));
}

async function readFixtureJson(fixtureRoot, repoPath) {
  return JSON.parse(await readFile(path.join(fixtureRoot, repoPath), "utf8"));
}

async function writeFixtureJson(fixtureRoot, repoPath, data) {
  await writeFile(
    path.join(fixtureRoot, repoPath),
    `${JSON.stringify(data, null, 2)}\n`,
    "utf8",
  );
}

async function updateFixtureJson(fixtureRoot, repoPath, update) {
  const data = await readFixtureJson(fixtureRoot, repoPath);
  update(data);
  await writeFixtureJson(fixtureRoot, repoPath, data);
}

async function withReleaseMetadataFixture(run) {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "diagrampilot-release-"));

  try {
    for (const repoPath of releaseMetadataPaths) {
      const targetPath = path.join(tempRoot, repoPath);
      await mkdir(path.dirname(targetPath), { recursive: true });
      await writeFile(
        targetPath,
        await readFile(path.join(repoRoot, repoPath), "utf8"),
        "utf8",
      );
    }

    return await run(tempRoot);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}

function runReleaseScript(scriptName, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [path.join(repoRoot, "scripts", scriptName), ...args],
      {
        cwd: options.cwd ?? repoRoot,
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

test("release version check passes when DiagramPilot version metadata is aligned", async () => {
  const rootPackage = await readJson("package.json");
  const result = await runReleaseScript("check-release-version.mjs");

  assert.equal(result.signal, null);
  assert.equal(result.code, 0, result.stderr);
  assert.equal(result.stderr, "");
  assert.equal(
    result.stdout,
    `DiagramPilot release version metadata is consistent at ${rootPackage.version}.\n`,
  );
});

test("release version check fails when DiagramPilot version metadata drifts", async () => {
  await withReleaseMetadataFixture(async (fixtureRoot) => {
    const rootPackage = await readFixtureJson(fixtureRoot, "package.json");
    const versionSourcePath = path.join(
      fixtureRoot,
      "packages/core/src/version.ts",
    );
    const versionSource = await readFile(versionSourcePath, "utf8");

    await updateFixtureJson(fixtureRoot, "packages/icons/package.json", (data) => {
      data.version = "9.9.9";
    });
    await updateFixtureJson(fixtureRoot, "packages/cli/package.json", (data) => {
      data.dependencies["@diagrampilot/core"] = "^9.9.9";
    });
    await updateFixtureJson(fixtureRoot, "package-lock.json", (data) => {
      data.packages["packages/export-d2"].version = "9.9.9";
    });
    await writeFile(
      versionSourcePath,
      versionSource.replace(rootPackage.version, "9.9.9"),
      "utf8",
    );

    const result = await runReleaseScript("check-release-version.mjs", [], {
      cwd: fixtureRoot,
    });

    assert.equal(result.signal, null);
    assert.equal(result.code, 1);
    assert.equal(result.stdout, "");
    assert.match(
      result.stderr,
      new RegExp(
        `DiagramPilot release version metadata is inconsistent for ${rootPackage.version}`,
      ),
    );
    assert.match(
      result.stderr,
      /packages\/icons\/package\.json public package version is 9\.9\.9/u,
    );
    assert.match(
      result.stderr,
      /packages\/cli\/package\.json dependencies\.@diagrampilot\/core is \^9\.9\.9/u,
    );
    assert.match(
      result.stderr,
      /package-lock\.json packages\.packages\/export-d2\.version is 9\.9\.9/u,
    );
    assert.match(
      result.stderr,
      /packages\/core\/src\/version\.ts DIAGRAMPILOT_VERSION is 9\.9\.9/u,
    );
  });
});

test("release version bump updates DiagramPilot metadata consistently", async () => {
  await withReleaseMetadataFixture(async (fixtureRoot) => {
    const bumpedVersion = "1.2.3";
    const bumpResult = await runReleaseScript(
      "bump-release-version.mjs",
      [bumpedVersion],
      { cwd: fixtureRoot },
    );

    assert.equal(bumpResult.signal, null);
    assert.equal(bumpResult.code, 0, bumpResult.stderr);
    assert.equal(bumpResult.stderr, "");
    assert.equal(
      bumpResult.stdout,
      `Updated DiagramPilot release version metadata to ${bumpedVersion}.\n`,
    );

    const checkResult = await runReleaseScript(
      "check-release-version.mjs",
      [bumpedVersion],
      { cwd: fixtureRoot },
    );
    const rootPackage = await readFixtureJson(fixtureRoot, "package.json");
    const versionSource = await readFile(
      path.join(fixtureRoot, "packages/core/src/version.ts"),
      "utf8",
    );

    assert.equal(checkResult.signal, null);
    assert.equal(checkResult.code, 0, checkResult.stderr);
    assert.equal(checkResult.stderr, "");
    assert.equal(
      checkResult.stdout,
      `DiagramPilot release version metadata is consistent at ${bumpedVersion}.\n`,
    );
    assert.equal(rootPackage.version, bumpedVersion);
    assert.match(
      versionSource,
      new RegExp(`DIAGRAMPILOT_VERSION = "${bumpedVersion}"`, "u"),
    );
  });
});

test("release version bump supports nightly prerelease publish metadata", async () => {
  await withReleaseMetadataFixture(async (fixtureRoot) => {
    const bumpedVersion = "1.2.3-nightly.4.5.abcdef0";
    const bumpResult = await runReleaseScript(
      "bump-release-version.mjs",
      [bumpedVersion],
      { cwd: fixtureRoot },
    );

    assert.equal(bumpResult.signal, null);
    assert.equal(bumpResult.code, 0, bumpResult.stderr);
    assert.equal(bumpResult.stderr, "");
    assert.equal(
      bumpResult.stdout,
      `Updated DiagramPilot release version metadata to ${bumpedVersion}.\n`,
    );

    const checkResult = await runReleaseScript(
      "check-release-version.mjs",
      [bumpedVersion],
      { cwd: fixtureRoot },
    );
    const cliManifest = await readFixtureJson(
      fixtureRoot,
      "packages/cli/package.json",
    );
    const lockfile = await readFixtureJson(fixtureRoot, "package-lock.json");

    assert.equal(checkResult.signal, null);
    assert.equal(checkResult.code, 0, checkResult.stderr);
    assert.equal(checkResult.stderr, "");
    assert.equal(
      checkResult.stdout,
      `DiagramPilot release version metadata is consistent at ${bumpedVersion}.\n`,
    );
    assert.equal(cliManifest.version, bumpedVersion);
    assert.equal(cliManifest.dependencies["@diagrampilot/core"], bumpedVersion);
    assert.equal(lockfile.version, bumpedVersion);
    assert.equal(
      lockfile.packages["packages/cli"].dependencies["@diagrampilot/core"],
      bumpedVersion,
    );
  });
});

test("release version workflow documents issue versions and closeout requirements", async () => {
  const workflow = await readFile(
    path.join(repoRoot, "docs/development/release-version-workflow.md"),
    "utf8",
  );

  assert.match(workflow, /55\s*\|\s*`0\.1\.1`\s*\|\s*Pre-Alpha Release/u);
  assert.match(workflow, /61\s*\|\s*`0\.1\.8`\s*\|\s*Pre-Alpha Release/u);
  assert.match(workflow, /63\s*\|\s*`0\.1\.9`\s*\|\s*Pre-Alpha Release/u);
  assert.match(
    workflow,
    /Issue 62 is `0\.2\.0`, the first Public Alpha Release/u,
  );
  assert.match(workflow, /node scripts\/bump-release-version\.mjs <issue-version>/u);
  assert.match(workflow, /node scripts\/check-release-version\.mjs/u);
  assert.match(workflow, /npm run check:package-publish-state -- --expect prealpha/u);
  assert.match(workflow, /render docs\/architecture\.dp\.yaml --out docs\/architecture\.svg/u);
  assert.match(workflow, /validation results/u);
  assert.match(workflow, /Status: completed/u);
});
