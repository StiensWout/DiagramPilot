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

import { assertMatchesAll } from "./assertion-helpers.mjs";

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

async function writeFixtureIssue(fixtureRoot, repoPath, { status, version }) {
  const issuePath = path.join(fixtureRoot, repoPath);
  await mkdir(path.dirname(issuePath), { recursive: true });
  await writeFile(
    issuePath,
    [
      `Status: ${status}`,
      `Issue Version: ${version}`,
      "",
      "# Fixture issue",
      "",
      "## What to build",
      "",
      "Fixture release issue.",
      "",
    ].join("\n"),
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

test("issue release version check matches the latest completed issue", async () => {
  await withReleaseMetadataFixture(async (fixtureRoot) => {
    const issuePath =
      ".scratch/release-fixture/issues/100-current-completed.md";
    const currentVersion = "1.2.3";

    await writeFixtureIssue(
      fixtureRoot,
      ".scratch/release-fixture/issues/99-previous-completed.md",
      { status: "completed", version: "1.2.2" },
    );
    await writeFixtureIssue(fixtureRoot, issuePath, {
      status: "completed",
      version: currentVersion,
    });
    await writeFixtureIssue(
      fixtureRoot,
      ".scratch/release-fixture/issues/101-future-pending.md",
      { status: "pending", version: "9.9.9" },
    );

    await runReleaseScript("bump-release-version.mjs", [currentVersion], {
      cwd: fixtureRoot,
    });

    const result = await runReleaseScript("check-issue-release-version.mjs", [], {
      cwd: fixtureRoot,
    });

    assertScriptSuccess(result);
    assert.equal(
      result.stdout,
      `DiagramPilot issue release version matches ${issuePath} at ${currentVersion}.\n`,
    );
  });
});

test("issue release version check fails when metadata trails the issue", async () => {
  await withReleaseMetadataFixture(async (fixtureRoot) => {
    const issuePath =
      ".scratch/release-fixture/issues/100-current-completed.md";

    await writeFixtureIssue(fixtureRoot, issuePath, {
      status: "completed",
      version: "1.2.3",
    });

    const result = await runReleaseScript("check-issue-release-version.mjs", [], {
      cwd: fixtureRoot,
    });

    assertScriptFailure(result);
    assert.match(result.stderr, /Shared release version metadata is/u);
    assert.match(result.stderr, /expected 1\.2\.3 from/u);
    assert.match(result.stderr, /npm run sync:issue-release-version/u);
  });
});

test("issue release version sync reads an issue and updates metadata", async () => {
  await withReleaseMetadataFixture(async (fixtureRoot) => {
    const issuePath =
      ".scratch/release-fixture/issues/100-current-completed.md";
    const bumpedVersion = "2.3.4";

    await writeFixtureIssue(fixtureRoot, issuePath, {
      status: "completed",
      version: bumpedVersion,
    });

    const result = await runReleaseScript(
      "sync-issue-release-version.mjs",
      ["--issue", issuePath, "--skip-build", "--skip-artifact-refresh"],
      { cwd: fixtureRoot },
    );
    const rootPackage = await readFixtureJson(fixtureRoot, "package.json");

    assertScriptSuccess(result);
    assert.match(
      result.stdout,
      new RegExp(`Updated DiagramPilot release version metadata to ${bumpedVersion}`, "u"),
    );
    assert.match(
      result.stdout,
      new RegExp(`DiagramPilot release version metadata is consistent at ${bumpedVersion}`, "u"),
    );
    assert.match(
      result.stdout,
      new RegExp(`Synced DiagramPilot release metadata to Issue Version ${bumpedVersion}`, "u"),
    );
    assert.equal(rootPackage.version, bumpedVersion);
  });
});

test("release version workflow documents current channels and milestone closeout", async () => {
  const workflow = await readFile(
    path.join(repoRoot, "docs/development/release-version-workflow.md"),
    "utf8",
  );

  assertMatchesAll(workflow, [
    /Feature nightly/u,
    /Trusted push to `feature\/\*\*`/u,
    /`nightly`/u,
    /Prerelease/u,
    /Main validation/u,
    /No, validation only/u,
    /Manual dry-run/u,
    /`release_kind=dry-run`/u,
    /Milestone release/u,
    /`release_kind=milestone`/u,
    /Do not create one stable release per issue/u,
  ]);
  assertMatchesAll(workflow, [
    /npm run check:release-version/u,
    /node scripts\/bump-release-version\.mjs <version>/u,
    /`npm run check:issue-release-version` and\s+`npm run sync:issue-release-version` are legacy compatibility helpers/u,
    /scripts\/plan-release-publish\.mjs/u,
    /DIAGRAMPILOT_NPM_PUBLISH_ENABLED/u,
    /npm trusted publishing through GitHub OIDC/u,
    /Reading GitHub Checks/u,
    /Code quality audit \(pull requests only\)/u,
    /Release safety checks \(no packages published here\)/u,
    /Publish packages \(nightly\/final releases only\)/u,
    /Create GitHub prerelease \(nightly only\)/u,
    /Prepare GitHub Release draft \(final release only\)/u,
    /Publish GitHub Release after approval \(final only\)/u,
    /<base-version>-nightly\.<run-number>\.<run-attempt>\.<short-sha>/u,
    /github-release-publication/u,
    /Linear closeout issue/u,
  ]);
  assertMatchesAll(workflow, [
    /node scripts\/generate-release-notes\.mjs \\\s+--kind final/u,
    /Highlights/u,
    /What's Changed/u,
    /Breaking Changes/u,
    /Upgrade Notes/u,
    /Packages/u,
    /Full Changelog/u,
    /scripts\/validate-github-release-draft\.mjs/u,
    /node scripts\/generate-release-notes\.mjs \\\s+--kind nightly/u,
  ]);
  assertMatchesAll(workflow, [
    /npm run check:package-readiness/u,
    /npm run check:package-publish-state -- --expect available/u,
    /npm run check:package-publish-state -- --expect latest/u,
    /npm run audit:fallow/u,
    /npm run audit:fallow:changed/u,
  ]);
  assert.doesNotMatch(workflow, /55\s*\|\s*`0\.1\.1`/u);
  assert.doesNotMatch(workflow, /Issue 62 is `0\.2\.0`/u);
  assert.doesNotMatch(
    workflow,
    /Each implementation issue that merges to `main` should produce/u,
  );
  assert.doesNotMatch(workflow, /npm run sync:issue-release-version -- --issue <issue-file>/u);
  assert.doesNotMatch(workflow, /render docs\/architecture\.dp\.yaml --out docs\/architecture\.svg/u);
  assert.doesNotMatch(workflow, /## Validation Results/u);
});
