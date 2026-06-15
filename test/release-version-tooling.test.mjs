import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import {
  access,
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

import { assertMatchesAll, assertMatchesNone } from "./assertion-helpers.mjs";

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
  "packages/mcp/package.json",
  "packages/render-svg/package.json",
  "website/package.json",
];

test("release version fixture covers every workspace manifest", () => {
  assert.deepEqual(
    releaseMetadataPaths.filter((repoPath) => repoPath.endsWith("/package.json")),
    [
      "packages/cli/package.json",
      "packages/core/package.json",
      "packages/export-d2/package.json",
      "packages/export-dot/package.json",
      "packages/export-mermaid/package.json",
      "packages/icons/package.json",
      "packages/mcp/package.json",
      "packages/render-svg/package.json",
      "website/package.json",
    ],
  );
});

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

    const output = { stdout: "", stderr: "" };

    captureTextOutput(child.stdout, (chunk) => {
      output.stdout += chunk;
    });
    captureTextOutput(child.stderr, (chunk) => {
      output.stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code, signal) => {
      resolve({ code, signal, ...output });
    });
  });
}

function captureTextOutput(stream, onData) {
  stream.setEncoding("utf8");
  stream.on("data", onData);
}

function assertScriptSuccess(result) {
  assert.equal(result.signal, null);
  assert.equal(result.code, 0, result.stderr);
  assert.equal(result.stderr, "");
}

function assertScriptFailure(result) {
  assert.equal(result.signal, null);
  assert.equal(result.code, 1);
  assert.equal(result.stdout, "");
}

function assertBumpOutput(result, version) {
  assertScriptSuccess(result);
  assert.equal(
    result.stdout,
    `Updated DiagramPilot release version metadata to ${version}.\n`,
  );
}

function assertCheckOutput(result, version) {
  assertScriptSuccess(result);
  assert.equal(
    result.stdout,
    `DiagramPilot release version metadata is consistent at ${version}.\n`,
  );
}

test("release version check passes when DiagramPilot version metadata is aligned", async () => {
  const rootPackage = await readJson("package.json");
  const result = await runReleaseScript("check-release-version.mjs");

  assertCheckOutput(result, rootPackage.version);
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

    assertScriptFailure(result);
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

    assertBumpOutput(bumpResult, bumpedVersion);

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

    assertCheckOutput(checkResult, bumpedVersion);
    assert.equal(rootPackage.version, bumpedVersion);
    assert.match(
      versionSource,
      new RegExp(`DIAGRAMPILOT_VERSION = "${bumpedVersion}"`, "u"),
    );
  });
});

test("release version bump is idempotent for an already-applied version", async () => {
  await withReleaseMetadataFixture(async (fixtureRoot) => {
    const rootPackage = await readFixtureJson(fixtureRoot, "package.json");
    const bumpResult = await runReleaseScript(
      "bump-release-version.mjs",
      [rootPackage.version],
      { cwd: fixtureRoot },
    );

    assertBumpOutput(bumpResult, rootPackage.version);
  });
});

test("release tooling no longer exposes local issue-version workflow scripts", async () => {
  const rootPackage = await readJson("package.json");

  assert.equal(rootPackage.scripts["check:issue-release-version"], undefined);
  assert.equal(rootPackage.scripts["sync:issue-release-version"], undefined);

  for (const removedScript of [
    "scripts/check-issue-release-version.mjs",
    "scripts/release-issue-utils.mjs",
    "scripts/sync-issue-release-version.mjs",
  ]) {
    await assert.rejects(
      access(path.join(repoRoot, removedScript)),
      { code: "ENOENT" },
      `${removedScript} should be removed`,
    );
  }
});

test("release version bump supports nightly prerelease publish metadata", async () => {
  await withReleaseMetadataFixture(async (fixtureRoot) => {
    const bumpedVersion = "1.2.3-nightly.4.5.abcdef0";
    const bumpResult = await runReleaseScript(
      "bump-release-version.mjs",
      [bumpedVersion],
      { cwd: fixtureRoot },
    );

    assertBumpOutput(bumpResult, bumpedVersion);

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

    assertCheckOutput(checkResult, bumpedVersion);
    assert.equal(cliManifest.version, bumpedVersion);
    assert.equal(cliManifest.dependencies["@diagrampilot/core"], bumpedVersion);
    assert.equal(lockfile.version, bumpedVersion);
    assert.equal(
      lockfile.packages["packages/cli"].dependencies["@diagrampilot/core"],
      bumpedVersion,
    );
  });
});

test("release workflow uses current channels and milestone closeout", async () => {
  const workflow = await readFile(
    path.join(repoRoot, ".github", "workflows", "release.yml"),
    "utf8",
  );
  const releasePlanner = await readFile(
    path.join(repoRoot, "scripts", "plan-release-publish.mjs"),
    "utf8",
  );

  assertMatchesAll(workflow, [
    /push:\n\s+branches:\n\s+- nightly\n\s+- main/u,
    /release_kind:/u,
    /- dry-run/u,
    /- milestone/u,
    /default: "0\.4\.2"/u,
    /Validate release and verify publish artifacts/u,
    /Publish npm packages \(nightly or final\)/u,
    /Create nightly GitHub prerelease/u,
    /Prepare final GitHub Release draft/u,
    /Publish final GitHub Release after approval/u,
    /npm run check:release-version/u,
    /npm run test:root:ci/u,
    /node scripts\/bump-release-version\.mjs "\$RELEASE_PUBLISH_VERSION"/u,
    /node scripts\/generate-release-notes\.mjs \\\s+--kind final/u,
    /--prs-json "\$RUNNER_TEMP\/release-prs\.json"/u,
    /scripts\/validate-github-release-draft\.mjs/u,
    /node scripts\/generate-release-notes\.mjs \\\s+--kind nightly/u,
    /npm run check:package-readiness/u,
    /npm run check:package-size-budgets/u,
    /actions\/upload-artifact@v7/u,
    /actions\/download-artifact@v8/u,
  ]);
  assertMatchesNone(workflow, [
    /check:issue-release-version/u,
    /sync:issue-release-version/u,
    /\.scratch/u,
  ]);
  assert.match(releasePlanner, /manual milestone release publishes npm latest/u);
  assert.match(releasePlanner, /trusted main push publishes npm latest/u);
  assert.doesNotMatch(releasePlanner, /issue release/u);
});
