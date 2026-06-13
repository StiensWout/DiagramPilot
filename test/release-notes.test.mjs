import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
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

test("release-note generator derives final milestone notes from PR and Linear issue references", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "diagrampilot-notes-"));

  try {
    const prsPath = path.join(tempRoot, "prs.json");
    const highlightsPath = path.join(tempRoot, "highlights.md");
    const breakingPath = path.join(tempRoot, "breaking.md");
    const upgradePath = path.join(tempRoot, "upgrade.md");

    await writeFile(
      prsPath,
      `${JSON.stringify(
        [
          {
            number: 94,
            title: "DP-6: Update CI for Linear nightly branches",
            url: "https://github.com/StiensWout/DiagramPilot/pull/94",
            headRefName: "feature/dp-6-update-ci-for-linear-branch-format-and-nightly-prereleases",
            author: { login: "Wout" },
          },
          {
            number: 93,
            title: "DP-5: Update agent workflow for Linear",
            url: "https://github.com/StiensWout/DiagramPilot/pull/93",
            headRefName: "feature/dp-5-set-up-linear-based-agent-workflow-in-the-repo",
            author: { login: "Wout" },
          },
          {
            number: 92,
            title: "Add final release workflow",
            url: "https://github.com/StiensWout/DiagramPilot/pull/92",
            headRefName: "feature/dp-7-add-manual-milestone-release-workflow-and-release-notes",
            author: { login: "Wout" },
          },
        ],
        null,
        2,
      )}\n`,
      "utf8",
    );
    await writeFile(highlightsPath, "- Linear-backed release train is ready.\n", "utf8");
    await writeFile(breakingPath, "- Legacy JSON source handling is removed.\n", "utf8");
    await writeFile(upgradePath, "- Use `nightly` as the integration branch for prereleases.\n", "utf8");

    const result = await runReleaseNotes([
      "--kind",
      "final",
      "--version",
      "0.4.0",
      "--tag",
      "v0.4.0",
      "--milestone",
      "0.4.0",
      "--previous-tag",
      "v0.3.1",
      "--prs-json",
      prsPath,
      "--highlights-file",
      highlightsPath,
      "--breaking-changes-file",
      breakingPath,
      "--upgrade-notes-file",
      upgradePath,
    ]);

    assertProcessSuccess(result);
    assertMatchesAll(result.stdout, [
      /^# DiagramPilot v0\.4\.0$/m,
      /^Release Version: 0\.4\.0$/m,
      /^Tag: v0\.4\.0$/m,
      /^Milestone: 0\.4\.0$/m,
      /^## Highlights$/m,
      /^## What's Changed$/m,
      /^## Breaking Changes$/m,
      /^## Upgrade Notes$/m,
      /^## Packages$/m,
      /^## Full Changelog$/m,
    ]);
    assert.match(
      result.stdout,
      /^npm: https:\/\/www\.npmjs\.com\/package\/diagrampilot\/v\/0\.4\.0$/m,
    );
    assertMatchesAll(result.stdout, [
      /^Public Website: https:\/\/diagrampilot\.com$/m,
      /Linear-backed release train is ready/u,
      /DP-6: Update CI for Linear nightly branches/u,
      /DP-5: Update agent workflow for Linear/u,
      /Add final release workflow \(DP-7\)/u,
      /https:\/\/www\.npmjs\.com\/package\/@diagrampilot\/core\/v\/0\.4\.0/u,
      /https:\/\/github\.com\/StiensWout\/DiagramPilot\/compare\/v0\.3\.1\.\.\.v0\.4\.0/u,
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
        "Release Version: 1.2.3",
        "Tag: v1.2.3",
        "## Highlights",
        "## What's Changed",
        "## Breaking Changes",
        "## Upgrade Notes",
        "## Packages",
        "## Full Changelog",
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

test("release-note generator derives compact nightly prerelease notes", async () => {
  const result = await runReleaseNotes([
    "--kind",
    "nightly",
    "--version",
    "1.2.3-nightly.4.5.abcdef0",
    "--tag",
    "v1.2.3-nightly.4.5.abcdef0",
    "--branch",
    "feature/dp-7-release-workflow",
    "--commit",
    "abcdef0123456789",
    "--run-url",
    "https://github.com/StiensWout/DiagramPilot/actions/runs/123",
  ]);

  assertProcessSuccess(result);
  assertMatchesAll(result.stdout, [
    /^# DiagramPilot v1\.2\.3-nightly\.4\.5\.abcdef0$/m,
    /^Pre-release: true$/m,
    /^Release Version: 1\.2\.3-nightly\.4\.5\.abcdef0$/m,
    /^Dist Tag: nightly$/m,
    /^Branch: feature\/dp-7-release-workflow$/m,
    /^Commit: abcdef0$/m,
    /^Install: `npm install --save-dev --save-exact diagrampilot@nightly`$/m,
    /^## Packages$/m,
    /^## Validation$/m,
  ]);
});
