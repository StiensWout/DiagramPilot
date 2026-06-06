import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
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
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath, ...args], {
      cwd: options.cwd ?? repoRoot,
      env: { ...process.env, FORCE_COLOR: "0", NO_COLOR: "1" },
    });

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

function runReleaseNotes(args, options = {}) {
  return runScript(releaseNotesScriptPath, args, options);
}

function runDraftValidation(args, options = {}) {
  return runScript(releaseDraftValidationScriptPath, args, options);
}

test("release-note generator derives a GitHub Release draft body from completed issue closeout fields", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "diagrampilot-notes-"));

  try {
    const issuePath = path.join(
      tempRoot,
      ".scratch",
      "release-ops",
      "issues",
      "64-release-ops-foundation-and-github-releases.md",
    );
    await mkdir(path.dirname(issuePath), { recursive: true });
    await writeFile(
      issuePath,
      [
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
      ].join("\n"),
      "utf8",
    );

    const result = await runReleaseNotes([
      "--issue",
      issuePath,
      "--version",
      "1.2.3",
      "--tag",
      "v1.2.3",
    ]);

    assert.equal(result.signal, null);
    assert.equal(result.code, 0, result.stderr);
    assert.equal(result.stderr, "");
    assert.match(result.stdout, /^# DiagramPilot v1\.2\.3$/m);
    assert.match(result.stdout, /^Issue: Ship release ops foundation$/m);
    assert.match(result.stdout, /^Issue Version: 1\.2\.3$/m);
    assert.match(result.stdout, /^Tag: v1\.2\.3$/m);
    assert.match(
      result.stdout,
      /^npm: https:\/\/www\.npmjs\.com\/package\/diagrampilot\/v\/1\.2\.3$/m,
    );
    assert.match(result.stdout, /^Public Website: https:\/\/diagrampilot\.com$/m);
    assert.match(result.stdout, /Make each clean `main` implementation merge/u);
    assert.match(result.stdout, /Added release-note generation/u);
    assert.match(result.stdout, /`npm test` passed/u);
    assert.match(result.stdout, /https:\/\/diagrampilot\.com\/docs\/agents\/installation/u);
    assert.match(result.stdout, /GitHub Release draft review remains manual/u);
    assert.match(result.stdout, /Watch the first automated release run/u);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("GitHub Release draft validation accepts only a reviewed draft for the matching version and tag", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "diagrampilot-draft-"));

  try {
    const draftPath = path.join(tempRoot, "draft.json");
    await writeFile(
      draftPath,
      `${JSON.stringify(
        {
          tagName: "v1.2.3",
          name: "DiagramPilot v1.2.3",
          body: [
            "# DiagramPilot v1.2.3",
            "",
            "Issue Version: 1.2.3",
            "Tag: v1.2.3",
            "",
            "## Summary",
            "",
            "Reviewed release notes.",
          ].join("\n"),
          isDraft: true,
          isPrerelease: false,
        },
        null,
        2,
      )}\n`,
      "utf8",
    );

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

    await writeFile(
      draftPath,
      `${JSON.stringify(
        {
          tagName: "v1.2.3",
          name: "DiagramPilot v1.2.3",
          body: "",
          isDraft: true,
          isPrerelease: false,
        },
        null,
        2,
      )}\n`,
      "utf8",
    );

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
    const issuePath = path.join(
      tempRoot,
      ".scratch",
      "release-ops",
      "issues",
      "64-release-ops-foundation-and-github-releases.md",
    );
    await mkdir(path.dirname(issuePath), { recursive: true });
    await writeFile(
      issuePath,
      [
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
      ].join("\n"),
      "utf8",
    );

    const result = await runReleaseNotes(
      ["--version", "1.2.3", "--tag", "v1.2.3"],
      { cwd: tempRoot },
    );

    assert.equal(result.signal, null);
    assert.equal(result.code, 0, result.stderr);
    assert.equal(result.stderr, "");
    assert.match(result.stdout, /^Issue: Release ops foundation$/m);
    assert.match(result.stdout, /Ship guarded Issue Release operations/u);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});
