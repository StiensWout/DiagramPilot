import assert from "node:assert/strict";
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { repoRoot } from "./docs-public-boundary-helpers.mjs";
import {
  runProcess,
  sanitizedTestEnv,
} from "./process-helpers.mjs";

const releasePackagePublisherPath = path.join(
  repoRoot,
  "scripts",
  "publish-release-packages.mjs",
);
const nightlyVersion = "0.4.0-nightly.117.1.86ab61d";

async function withFakeNpm(run) {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "diagrampilot-npm-"));

  try {
    const binDir = path.join(tempRoot, "bin");
    const statePath = path.join(tempRoot, "state.json");
    const callLogPath = path.join(tempRoot, "calls.jsonl");
    await mkdir(binDir, { recursive: true });
    await writeFile(
      path.join(binDir, "npm"),
      fakeNpmExecutable({ callLogPath, statePath }),
      "utf8",
    );
    await chmod(path.join(binDir, "npm"), 0o755);

    return await run({ binDir, callLogPath, statePath });
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}

function fakeNpmExecutable({ callLogPath, statePath }) {
  return `#!/usr/bin/env node
import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";

const args = process.argv.slice(2);
const version = process.env.TEST_NIGHTLY_VERSION;
const callLogPath = ${JSON.stringify(callLogPath)};
const statePath = ${JSON.stringify(statePath)};
const packageNames = new Set([
  "diagrampilot",
  "@diagrampilot/core",
  "@diagrampilot/icons",
  "@diagrampilot/export-mermaid",
  "@diagrampilot/export-d2",
  "@diagrampilot/export-dot",
  "@diagrampilot/mcp",
  "@diagrampilot/render-svg",
]);

function readState() {
  return existsSync(statePath)
    ? JSON.parse(readFileSync(statePath, "utf8"))
    : { diagrampilotPublished: false, tlogFailed: false };
}

function writeState(state) {
  writeFileSync(statePath, JSON.stringify(state));
}

function packageNameFromSpec(spec) {
  if (!spec.endsWith("@" + version)) return undefined;
  return spec.slice(0, -(version.length + 1));
}

appendFileSync(
  callLogPath,
  JSON.stringify({
    args,
    provenance: process.env.NPM_CONFIG_PROVENANCE ?? "",
  }) + "\\n",
);

if (args[0] === "run" && args[1] === "check:package-publish-state") {
  process.exit(1);
}

if (args[0] === "view" && args[2] === "version") {
  const packageName = packageNameFromSpec(args[1]);
  const state = readState();

  if (packageName === "diagrampilot" && !state.diagrampilotPublished) {
    process.exit(1);
  }

  if (packageNames.has(packageName)) {
    console.log(version);
    process.exit(0);
  }
}

if (args[0] === "view" && args[2] === "dist-tags.nightly") {
  console.log(version);
  process.exit(0);
}

if (args[0] === "publish") {
  const workspace = args[args.indexOf("--workspace") + 1];
  const state = readState();

  if (
    workspace === "diagrampilot" &&
    !state.tlogFailed &&
    process.env.NPM_CONFIG_PROVENANCE !== "false"
  ) {
    writeState({ ...state, tlogFailed: true });
    console.error("npm error code TLOG_CREATE_ENTRY_ERROR");
    console.error("npm error error creating tlog entry - (409) an equivalent entry already exists in the transparency log");
    process.exit(1);
  }

  if (workspace === "diagrampilot") {
    writeState({ ...state, diagrampilotPublished: true });
  }

  console.log("published " + workspace);
  process.exit(0);
}

console.error("Unexpected fake npm call: " + args.join(" "));
process.exit(1);
`;
}

test("release package publisher retries nightly transparency-log collisions without provenance", async () => {
  await withFakeNpm(async ({ binDir, callLogPath }) => {
    const result = await runProcess(process.execPath, [releasePackagePublisherPath], {
      cwd: repoRoot,
      env: sanitizedTestEnv({
        PATH: `${binDir}${path.delimiter}${process.env.PATH}`,
        RELEASE_DIST_TAG: "nightly",
        RELEASE_PUBLISH_VERSION: nightlyVersion,
        TEST_NIGHTLY_VERSION: nightlyVersion,
      }),
    });

    assert.equal(result.signal, null);
    assert.equal(result.code, 0);
    assert.match(result.stderr, /TLOG_CREATE_ENTRY_ERROR/u);
    assert.match(
      result.stderr,
      /Retrying diagrampilot@0\.4\.0-nightly\.117\.1\.86ab61d without npm provenance/u,
    );

    const calls = (await readFile(callLogPath, "utf8"))
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    const publishCalls = calls.filter((call) => call.args[0] === "publish");

    assert.deepEqual(
      publishCalls.map((call) => ({
        workspace: call.args[call.args.indexOf("--workspace") + 1],
        provenance: call.provenance,
      })),
      [
        { workspace: "diagrampilot", provenance: "" },
        { workspace: "diagrampilot", provenance: "false" },
      ],
    );
  });
});
