import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { assertMatchesAll } from "./assertion-helpers.mjs";
import { repoRoot } from "./docs-public-boundary-helpers.mjs";
import {
  assertProcessSuccess,
  runProcess,
  sanitizedTestEnv,
} from "./process-helpers.mjs";

const releaseNotesScriptPath = path.join(
  repoRoot,
  "scripts",
  "generate-release-notes.mjs",
);
const releaseDraftValidationScriptPath = path.join(
  repoRoot,
  "scripts",
  "validate-github-release-draft.mjs",
);

function runScript(scriptPath, args, options = {}) {
  return runProcess(process.execPath, [scriptPath, ...args], {
    cwd: options.cwd ?? repoRoot,
    env: sanitizedTestEnv(),
  });
}

function runReleaseNotes(args, options = {}) {
  return runScript(releaseNotesScriptPath, args, options);
}

function runDraftValidation(args, options = {}) {
  return runScript(releaseDraftValidationScriptPath, args, options);
}

async function writeReleaseIssue(tempRoot, lines) {
  const issuePath = path.join(
    tempRoot,
    ".scratch",
    "release-ops",
    "issues",
    "64-release-ops-foundation-and-github-releases.md",
  );

  await mkdir(path.dirname(issuePath), { recursive: true });
  await writeFile(issuePath, `${lines.join("\n")}\n`, "utf8");

  return issuePath;
}

async function writeDraftJson(draftPath, overrides = {}) {
  await writeFile(
    draftPath,
    `${JSON.stringify(
      {
        tagName: "v1.2.3",
        name: "DiagramPilot v1.2.3",
        body: "",
        isDraft: true,
        isPrerelease: false,
        ...overrides,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
}

test("release-note generator derives a GitHub Release draft body from completed issue closeout fields", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "diagrampilot-notes-"));

  try {
    const issuePath = await writeReleaseIssue(tempRoot, [
        "Status: completed",
        "Issue Version: 1.2.3",
        "",
        "# Ship release ops foundation",
        "",
        "## What to build",
        "",
        "Make each clean `main` implementation merge publish as an Issue Release.",
        "",
        "## Implementation notes",
        "",
        "- Added release-note generation.",
        "- Updated the release workflow.",
        "",
        "## Validation results",
        "",
        "- `npm test` passed.",
        "",
        "## User-facing docs links",
        "",
        "- https://diagrampilot.com/docs/agents/installation",
        "",
        "## Known limitations",
        "",
        "- GitHub Release draft review remains manual.",
        "",
        "## Follow-up",
        "",
        "- Watch the first automated release run.",
        "",
    ]);

    const result = await runReleaseNotes([
      "--issue",
      issuePath,
      "--version",
      "1.2.3",
      "--tag",
      "v1.2.3",
    ]);

    assertProcessSuccess(result);
    assertMatchesAll(result.stdout, [
      /^# DiagramPilot v1\.2\.3$/m,
      /^Issue: Ship release ops foundation$/m,
      /^Issue Version: 1\.2\.3$/m,
      /^Tag: v1\.2\.3$/m,
    ]);
    assert.match(
      result.stdout,
      /^npm: https:\/\/www\.npmjs\.com\/package\/diagrampilot\/v\/1\.2\.3$/m,
    );
    assertMatchesAll(result.stdout, [
      /^Public Website: https:\/\/diagrampilot\.com$/m,
      /Make each clean `main` implementation merge/u,
      /Added release-note generation/u,
      /`npm test` passed/u,
      /https:\/\/diagrampilot\.com\/docs\/agents\/installation/u,
      /GitHub Release draft review remains manual/u,
      /Watch the first automated release run/u,
    ]);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("GitHub Release draft validation accepts only a reviewed draft for the matching version and tag", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "diagrampilot-draft-"));

  try {
    const draftPath = path.join(tempRoot, "draft.json");
    await writeDraftJson(draftPath, {
      body: [
        "# DiagramPilot v1.2.3",
        "Issue Version: 1.2.3",
        "Tag: v1.2.3",
      ].join("\n"),
    });

    const accepted = await runDraftValidation([
      "--draft-json",
      draftPath,
      "--version",
      "1.2.3",
      "--tag",
      "v1.2.3",
    ]);

    assert.equal(accepted.signal, null);
    assert.equal(accepted.code, 0, accepted.stderr);
    assert.equal(accepted.stderr, "");
    assert.equal(
      accepted.stdout,
      "GitHub Release draft v1.2.3 is ready for publication.\n",
    );

    await writeDraftJson(draftPath);

    const rejected = await runDraftValidation([
      "--draft-json",
      draftPath,
      "--version",
      "1.2.3",
      "--tag",
      "v1.2.3",
    ]);

    assert.equal(rejected.signal, null);
    assert.equal(rejected.code, 1);
    assert.equal(rejected.stdout, "");
    assert.match(rejected.stderr, /draft body is empty/u);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("release-note generator can find the completed issue by Issue Version", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "diagrampilot-notes-find-"));

  try {
    const issuePath = await writeReleaseIssue(tempRoot, [
        "Status: completed",
        "Issue Version: 1.2.3",
        "",
        "# Release ops foundation",
        "",
        "## What to build",
        "",
        "Ship guarded Issue Release operations.",
        "",
        "## Implementation notes",
        "",
        "- Added GitHub Release publication.",
        "",
        "## Validation results",
        "",
        "- `node --test` passed.",
        "",
    ]);

    const result = await runReleaseNotes(
      ["--version", "1.2.3", "--tag", "v1.2.3"],
      { cwd: tempRoot },
    );

    assertProcessSuccess(result);
    assertMatchesAll(result.stdout, [
      /^Issue: Release ops foundation$/m,
      /Ship guarded Issue Release operations/u,
    ]);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});
