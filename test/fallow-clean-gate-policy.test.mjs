import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function readWorkspacePackageJson() {
  return JSON.parse(await readFile(path.join(repoRoot, "package.json"), "utf8"));
}

async function readJson(repoPath) {
  return JSON.parse(await readFile(path.join(repoRoot, repoPath), "utf8"));
}

test("workspace changed-code Fallow audit only uses the empty dead-code baseline", async () => {
  const packageJson = await readWorkspacePackageJson();
  const changedAudit = packageJson.scripts["audit:fallow:changed"];

  assert.match(changedAudit, /--fail-on-issues\b/u);
  assert.match(changedAudit, /--dead-code-baseline fallow-baselines\/dead-code\.json\b/u);
  assert.doesNotMatch(changedAudit, /--health-baseline\b/u);
  assert.doesNotMatch(changedAudit, /--dupes-baseline\b/u);
});

test("workspace full Fallow gate runs dupes and health without debt baselines", async () => {
  const packageJson = await readWorkspacePackageJson();
  const dupesAudit = packageJson.scripts["audit:fallow:dupes"];
  const healthAudit = packageJson.scripts["audit:fallow:health"];

  assert.match(dupesAudit, /^fallow dupes\b/u);
  assert.match(dupesAudit, /--fail-on-issues\b/u);
  assert.doesNotMatch(dupesAudit, /--baseline\b/u);

  assert.match(healthAudit, /^fallow health\b/u);
  assert.match(healthAudit, /--complexity\b/u);
  assert.doesNotMatch(healthAudit, /--baseline\b/u);
});

test("committed Fallow baselines contain no parked debt", async () => {
  const deadCodeBaseline = await readJson("fallow-baselines/dead-code.json");
  const dupesBaseline = await readJson("fallow-baselines/dupes.json");
  const healthBaseline = await readJson("fallow-baselines/health.json");

  for (const [findingType, findings] of Object.entries(deadCodeBaseline)) {
    assert.deepEqual(findings, [], `dead-code baseline should not park ${findingType}`);
  }

  assert.deepEqual(dupesBaseline.clone_groups, []);
  assert.deepEqual(healthBaseline.runtime_coverage_findings, []);
  assert.deepEqual(healthBaseline.target_keys, []);
});

test("maintainability policy tells agents to fix Fallow findings instead of baselining them", async () => {
  const maintainabilityDoc = await readFile(
    path.join(repoRoot, "docs", "development", "maintainability.md"),
    "utf8",
  );

  assert.match(maintainabilityDoc, /Fallow baselines should stay empty/u);
  assert.match(maintainabilityDoc, /future Fallow\s+findings should be fixed/u);
  assert.match(maintainabilityDoc, /Narrow documented static-analysis limitations/u);
  assert.doesNotMatch(maintainabilityDoc, /captures existing duplication debt/u);
  assert.doesNotMatch(maintainabilityDoc, /captures existing complexity debt/u);
});
