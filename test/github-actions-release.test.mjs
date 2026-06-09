import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { runProcess, sanitizedTestEnv } from "./process-helpers.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const releaseWorkflowPath = path.join(
  repoRoot,
  ".github",
  "workflows",
  "release.yml",
);
const releasePlanScriptPath = path.join(
  repoRoot,
  "scripts",
  "plan-release-publish.mjs",
);

const publicPackageSet = [
  "diagrampilot",
  "@diagrampilot/core",
  "@diagrampilot/icons",
  "@diagrampilot/export-mermaid",
  "@diagrampilot/export-d2",
  "@diagrampilot/export-dot",
  "@diagrampilot/render-svg",
];

async function readWorkspaceVersion() {
  const manifest = JSON.parse(
    await readFile(path.join(repoRoot, "package.json"), "utf8"),
  );

  return manifest.version;
}

async function withGithubEvent(eventPayload, callback) {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "diagrampilot-release-"));

  try {
    const eventPath = path.join(tempRoot, "event.json");
    await writeFile(eventPath, `${JSON.stringify(eventPayload, null, 2)}\n`, "utf8");

    return await callback(eventPath);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}

function runReleasePlan(env) {
  return runProcess(process.execPath, [releasePlanScriptPath], {
    cwd: repoRoot,
    env: sanitizedTestEnv({
      DIAGRAMPILOT_NPM_PUBLISH_ENABLED: "",
      ...env,
    }),
  });
}

test("GitHub Actions release workflow validates releases before guarded publishing", async () => {
  const workflow = await readFile(releaseWorkflowPath, "utf8");

  assert.match(workflow, /^name: Release$/m);
  assert.match(workflow, /pull_request:\n\s+branches:\n\s+- main/u);
  assert.match(workflow, /push:\n\s+branches:\n\s+- main\n\s+- "issue-\*"/u);
  assert.match(workflow, /workflow_dispatch:/u);
  assert.match(workflow, /contents: read/u);
  assert.match(workflow, /id-token: write/u);
  assert.match(
    workflow,
    /DIAGRAMPILOT_NPM_PUBLISH_ENABLED: \$\{\{ vars\.DIAGRAMPILOT_NPM_PUBLISH_ENABLED \}\}/u,
  );
  assert.match(workflow, /uses: actions\/checkout@v6/u);
  assert.match(workflow, /uses: actions\/setup-node@v6/u);
  assert.match(workflow, /node-version: 22/u);
  assert.match(workflow, /registry-url: https:\/\/registry\.npmjs\.org/u);
  assert.match(workflow, /package-manager-cache: false/u);
  assert.match(workflow, /npm install --global npm@11\.16\.0/u);
  assert.match(workflow, /npm ci/u);
  assert.match(workflow, /npm run check:release-version/u);
  assert.match(workflow, /npm run check:issue-release-version/u);
  assert.match(workflow, /npm run build/u);
  assert.match(workflow, /npm test/u);
  assert.match(workflow, /npm run generate:schema/u);
  assert.match(workflow, /git diff --exit-code -- schema\/diagramspec-v1\.schema\.json/u);
  assert.match(workflow, /npm --workspace website run build/u);
  assert.match(workflow, /npm --workspace website run test/u);
  assert.match(workflow, /node \.\.\/\.\.\/packages\/cli\/dist\/index\.js render docs\/architecture\.dp\.yaml --out docs\/architecture\.svg/u);
  assert.match(workflow, /node \.\.\/\.\.\/packages\/cli\/dist\/index\.js check/u);
  assert.match(workflow, /git diff --exit-code -- demo-projects\/checkout\/docs\/architecture\.svg/u);
  assert.match(workflow, /npm run check:package-readiness/u);
  assert.match(workflow, /node scripts\/plan-release-publish\.mjs --github-output/u);
  assert.match(workflow, /needs\.validate-release\.outputs\.should_publish == 'true'/u);
  assert.match(workflow, /RELEASE_DIST_TAG == 'nightly'/u);
  assert.match(workflow, /node scripts\/bump-release-version\.mjs "\$RELEASE_PUBLISH_VERSION"/u);
  assert.match(workflow, /npm run check:package-publish-state -- --expect latest/u);
  assert.match(workflow, /already publishes \$RELEASE_PUBLISH_VERSION under latest/u);
  assert.match(workflow, /npm publish --workspace "\$workspace" --tag "\$RELEASE_DIST_TAG" --access public/u);
  assert.match(workflow, /npm publish --dry-run --workspace "\$workspace" --tag "\$RELEASE_DIST_TAG" --access public/u);
  assert.doesNotMatch(workflow, /NPM_TOKEN|NODE_AUTH_TOKEN|VERCEL|--provenance/u);
  assert.doesNotMatch(workflow, /check:visual|playwright install/u);

  for (const packageName of publicPackageSet) {
    assert.match(workflow, new RegExp(packageName.replace("/", "\\/"), "u"));
  }
});

test("release workflow gates CD side effects behind CI and validates reviewed GitHub Release drafts", async () => {
  const workflow = await readFile(releaseWorkflowPath, "utf8");
  const publishPackagesStart = workflow.indexOf("  publish-packages:");
  const prepareGithubReleaseStart = workflow.indexOf(
    "  prepare-github-release-draft:",
  );
  const publishGithubReleaseStart = workflow.indexOf("  publish-github-release:");
  const publishPackagesJob = workflow.slice(
    publishPackagesStart,
    prepareGithubReleaseStart,
  );
  const prepareGithubReleaseJob = workflow.slice(
    prepareGithubReleaseStart,
    publishGithubReleaseStart,
  );
  const publishGithubReleaseJob = workflow.slice(publishGithubReleaseStart);

  assert.match(workflow, /^  validate-release:$/m);
  assert.match(workflow, /^  publish-packages:$/m);
  assert.match(workflow, /^  prepare-github-release-draft:$/m);
  assert.match(workflow, /^  publish-github-release:$/m);
  assert.match(workflow, /publish-packages:\n(?:    .+\n)*    needs: validate-release/u);
  assert.match(workflow, /prepare-github-release-draft:\n(?:    .+\n)*    needs: \[validate-release, publish-packages\]/u);
  assert.match(workflow, /publish-github-release:\n(?:    .+\n)*    needs: \[validate-release, prepare-github-release-draft\]/u);
  assert.match(workflow, /ref: \$\{\{ github\.sha \}\}/u);
  assert.match(workflow, /contents: write/u);
  assert.match(workflow, /needs\.validate-release\.outputs\.dist_tag == 'latest'/u);
  assert.match(workflow, /environment: github-release-publication/u);
  assert.match(workflow, /node scripts\/generate-release-notes\.mjs/u);
  assert.match(workflow, /gh release view "\$RELEASE_TAG" --json tagName,name,body,isDraft,isPrerelease/u);
  assert.match(workflow, /node scripts\/validate-github-release-draft\.mjs/u);
  assert.match(workflow, /git tag "\$RELEASE_TAG" "\$GITHUB_SHA"/u);
  assert.match(workflow, /git push origin "\$RELEASE_TAG"/u);
  assert.match(workflow, /gh release create "\$RELEASE_TAG"/u);
  assert.match(workflow, /gh release edit "\$RELEASE_TAG" --draft=false --verify-tag --latest/u);

  assert.match(publishPackagesJob, /needs: validate-release/u);
  assert.match(publishPackagesJob, /npm run check:package-publish-state -- --expect latest/u);
  assert.match(publishPackagesJob, /npm publish --workspace/u);

  const tagCreation = prepareGithubReleaseJob.indexOf('git tag "$RELEASE_TAG" "$GITHUB_SHA"');
  const draftCreation = prepareGithubReleaseJob.indexOf('gh release create "$RELEASE_TAG"');
  const generatedDraftValidation = prepareGithubReleaseJob.indexOf(
    "node scripts/validate-github-release-draft.mjs",
  );
  assert.notEqual(tagCreation, -1);
  assert.notEqual(draftCreation, -1);
  assert.notEqual(generatedDraftValidation, -1);
  assert.ok(
    tagCreation < draftCreation,
    "tag creation must run before GitHub Release draft creation",
  );
  assert.ok(
    draftCreation < generatedDraftValidation,
    "generated draft must be validated before the review gate",
  );

  const draftValidation = publishGithubReleaseJob.indexOf(
    "node scripts/validate-github-release-draft.mjs",
  );
  const releasePublication = publishGithubReleaseJob.indexOf(
    'gh release edit "$RELEASE_TAG" --draft=false',
  );
  assert.notEqual(draftValidation, -1);
  assert.notEqual(releasePublication, -1);
  assert.ok(
    draftValidation < releasePublication,
    "reviewed draft validation must run before GitHub Release publication",
  );
});

test("release publish planner routes issue branch pushes to unique nightly versions", async () => {
  const baseVersion = await readWorkspaceVersion();
  const result = await withGithubEvent({ ref: "refs/heads/issue-61-release" }, (eventPath) =>
    runReleasePlan({
      GITHUB_EVENT_NAME: "push",
      GITHUB_EVENT_PATH: eventPath,
      GITHUB_REF: "refs/heads/issue-61-release",
      GITHUB_REF_NAME: "issue-61-release",
      GITHUB_REPOSITORY: "StiensWout/DiagramPilot",
      GITHUB_RUN_NUMBER: "42",
      GITHUB_RUN_ATTEMPT: "3",
      GITHUB_SHA: "abcdef1234567890",
      DIAGRAMPILOT_NPM_PUBLISH_ENABLED: "true",
    }),
  );

  assert.equal(result.signal, null);
  assert.equal(result.code, 0, result.stderr);
  assert.equal(result.stderr, "");

  const plan = JSON.parse(result.stdout);
  assert.equal(plan.baseVersion, baseVersion);
  assert.equal(plan.distTag, "nightly");
  assert.equal(plan.shouldPublish, true);
  assert.equal(plan.publishVersion, `${baseVersion}-nightly.42.3.abcdef1`);
  assert.match(plan.reason, /trusted issue branch push/u);
});

test("release publish planner routes main pushes to latest clean versions", async () => {
  const baseVersion = await readWorkspaceVersion();
  const result = await withGithubEvent({ ref: "refs/heads/main" }, (eventPath) =>
    runReleasePlan({
      GITHUB_EVENT_NAME: "push",
      GITHUB_EVENT_PATH: eventPath,
      GITHUB_REF: "refs/heads/main",
      GITHUB_REF_NAME: "main",
      GITHUB_REPOSITORY: "StiensWout/DiagramPilot",
      GITHUB_RUN_NUMBER: "43",
      GITHUB_RUN_ATTEMPT: "1",
      GITHUB_SHA: "1234567890abcdef",
      DIAGRAMPILOT_NPM_PUBLISH_ENABLED: "true",
    }),
  );

  assert.equal(result.signal, null);
  assert.equal(result.code, 0, result.stderr);
  assert.equal(result.stderr, "");

  const plan = JSON.parse(result.stdout);
  assert.equal(plan.baseVersion, baseVersion);
  assert.equal(plan.distTag, "latest");
  assert.equal(plan.shouldPublish, true);
  assert.equal(plan.publishVersion, baseVersion);
  assert.match(plan.reason, /trusted main push/u);
});

test("release publish planner keeps trusted pushes dry-run until publishing is enabled", async () => {
  const baseVersion = await readWorkspaceVersion();
  const result = await withGithubEvent({ ref: "refs/heads/issue-61-release" }, (eventPath) =>
    runReleasePlan({
      GITHUB_EVENT_NAME: "push",
      GITHUB_EVENT_PATH: eventPath,
      GITHUB_REF: "refs/heads/issue-61-release",
      GITHUB_REF_NAME: "issue-61-release",
      GITHUB_REPOSITORY: "StiensWout/DiagramPilot",
      GITHUB_RUN_NUMBER: "47",
      GITHUB_RUN_ATTEMPT: "1",
      GITHUB_SHA: "abcdef1234567890",
    }),
  );

  assert.equal(result.signal, null);
  assert.equal(result.code, 0, result.stderr);
  assert.equal(result.stderr, "");

  const plan = JSON.parse(result.stdout);
  assert.equal(plan.baseVersion, baseVersion);
  assert.equal(plan.distTag, "nightly");
  assert.equal(plan.shouldPublish, false);
  assert.equal(plan.publishVersion, `${baseVersion}-nightly.47.1.abcdef1`);
  assert.match(plan.reason, /real publish disabled/u);
});

test("release publish planner keeps pull requests dry-run even when publishing is enabled", async () => {
  const baseVersion = await readWorkspaceVersion();
  const result = await withGithubEvent(
    {
      pull_request: {
        head: { repo: { full_name: "StiensWout/DiagramPilot" } },
        base: { repo: { full_name: "StiensWout/DiagramPilot" } },
      },
    },
    (eventPath) =>
      runReleasePlan({
        GITHUB_EVENT_NAME: "pull_request",
        GITHUB_EVENT_PATH: eventPath,
        GITHUB_REF: "refs/pull/64/merge",
        GITHUB_REF_NAME: "64/merge",
        GITHUB_REPOSITORY: "StiensWout/DiagramPilot",
        GITHUB_RUN_NUMBER: "48",
        GITHUB_RUN_ATTEMPT: "1",
        GITHUB_SHA: "123abc456def7890",
        DIAGRAMPILOT_NPM_PUBLISH_ENABLED: "true",
      }),
  );

  assert.equal(result.signal, null);
  assert.equal(result.code, 0, result.stderr);
  assert.equal(result.stderr, "");

  const plan = JSON.parse(result.stdout);
  assert.equal(plan.baseVersion, baseVersion);
  assert.equal(plan.distTag, "nightly");
  assert.equal(plan.shouldPublish, false);
  assert.equal(plan.publishVersion, `${baseVersion}-nightly.48.1.123abc4`);
  assert.match(plan.reason, /pull request validation uses dry-run/u);
});

test("release publish planner keeps fork pull requests and manual runs dry-run only", async () => {
  const baseVersion = await readWorkspaceVersion();
  const forkPullRequest = await withGithubEvent(
    {
      pull_request: {
        head: { repo: { full_name: "someone/DiagramPilot" } },
        base: { repo: { full_name: "StiensWout/DiagramPilot" } },
      },
    },
    (eventPath) =>
      runReleasePlan({
        GITHUB_EVENT_NAME: "pull_request",
        GITHUB_EVENT_PATH: eventPath,
        GITHUB_REF: "refs/pull/12/merge",
        GITHUB_REF_NAME: "12/merge",
        GITHUB_REPOSITORY: "StiensWout/DiagramPilot",
        GITHUB_RUN_NUMBER: "44",
        GITHUB_RUN_ATTEMPT: "1",
        GITHUB_SHA: "fedcba9876543210",
      }),
  );

  assert.equal(forkPullRequest.signal, null);
  assert.equal(forkPullRequest.code, 0, forkPullRequest.stderr);
  assert.equal(forkPullRequest.stderr, "");

  const forkPlan = JSON.parse(forkPullRequest.stdout);
  assert.equal(forkPlan.baseVersion, baseVersion);
  assert.equal(forkPlan.distTag, "nightly");
  assert.equal(forkPlan.shouldPublish, false);
  assert.equal(forkPlan.publishVersion, `${baseVersion}-nightly.44.1.fedcba9`);
  assert.match(forkPlan.reason, /fork pull request/u);

  const manualRun = await withGithubEvent({ inputs: {} }, (eventPath) =>
    runReleasePlan({
      GITHUB_EVENT_NAME: "workflow_dispatch",
      GITHUB_EVENT_PATH: eventPath,
      GITHUB_REF: "refs/heads/main",
      GITHUB_REF_NAME: "main",
      GITHUB_REPOSITORY: "StiensWout/DiagramPilot",
      GITHUB_RUN_NUMBER: "45",
      GITHUB_RUN_ATTEMPT: "1",
      GITHUB_SHA: "0123456789abcdef",
    }),
  );

  assert.equal(manualRun.signal, null);
  assert.equal(manualRun.code, 0, manualRun.stderr);
  assert.equal(manualRun.stderr, "");

  const manualPlan = JSON.parse(manualRun.stdout);
  assert.equal(manualPlan.baseVersion, baseVersion);
  assert.equal(manualPlan.distTag, "nightly");
  assert.equal(manualPlan.shouldPublish, false);
  assert.equal(manualPlan.publishVersion, `${baseVersion}-nightly.45.1.0123456`);
  assert.match(manualPlan.reason, /manual dry-run/u);
});

test("release publish planner rejects tag refs that do not match the shared version", async () => {
  const result = await withGithubEvent({ ref: "refs/tags/v9.9.9" }, (eventPath) =>
    runReleasePlan({
      GITHUB_EVENT_NAME: "push",
      GITHUB_EVENT_PATH: eventPath,
      GITHUB_REF: "refs/tags/v9.9.9",
      GITHUB_REF_NAME: "v9.9.9",
      GITHUB_REPOSITORY: "StiensWout/DiagramPilot",
      GITHUB_RUN_NUMBER: "46",
      GITHUB_RUN_ATTEMPT: "1",
      GITHUB_SHA: "9999999999999999",
    }),
  );

  assert.equal(result.signal, null);
  assert.equal(result.code, 1);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /Tag v9\.9\.9 does not match shared version/u);
});

test("release workflow docs explain npm trusted publisher setup", async () => {
  const workflow = await readFile(
    path.join(repoRoot, "docs", "development", "release-version-workflow.md"),
    "utf8",
  );

  assert.match(workflow, /\.github\/workflows\/release\.yml/u);
  assert.match(workflow, /trusted publisher/u);
  assert.match(workflow, /OIDC/u);
  assert.match(workflow, /`nightly`/u);
  assert.match(workflow, /`latest`/u);
  assert.match(workflow, /Pull requests perform validation and npm publish dry-runs only/u);
  assert.match(workflow, /manual dry-run/u);
  assert.match(workflow, /Issue Release/u);
  assert.match(workflow, /GitHub Release draft/u);
  assert.match(workflow, /scripts\/generate-release-notes\.mjs/u);
  assert.match(workflow, /scripts\/validate-github-release-draft\.mjs/u);
  assert.match(workflow, /npm `latest` publish succeeds/u);
  assert.match(workflow, /Nightly .*skip GitHub Releases/u);

  for (const packageName of publicPackageSet) {
    assert.match(workflow, new RegExp(packageName.replace("/", "\\/"), "u"));
  }
});
