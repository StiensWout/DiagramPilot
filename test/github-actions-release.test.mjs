import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
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
  "@diagrampilot/mcp",
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

function releasePlanEnv(eventPath, overrides) {
  return {
    GITHUB_EVENT_PATH: eventPath,
    GITHUB_REPOSITORY: "StiensWout/DiagramPilot",
    GITHUB_RUN_ATTEMPT: "1",
    ...overrides,
  };
}

function parseSuccessfulPlan(result) {
  assertProcessSuccess(result);
  return JSON.parse(result.stdout);
}

function assertNightlyPlan(
  plan,
  { baseVersion, runNumber, runAttempt = "1", sha, shouldPublish = false, reason },
) {
  assert.equal(plan.baseVersion, baseVersion);
  assert.equal(plan.distTag, "nightly");
  assert.equal(plan.shouldPublish, shouldPublish);
  assert.equal(
    plan.publishVersion,
    `${baseVersion}-nightly.${runNumber}.${runAttempt}.${sha.slice(0, 7)}`,
  );
  assert.match(plan.reason, reason);
}

function assertLatestPlan(plan, { baseVersion, shouldPublish }) {
  assert.equal(plan.baseVersion, baseVersion);
  assert.equal(plan.distTag, "latest");
  assert.equal(plan.shouldPublish, shouldPublish);
  assert.equal(plan.publishVersion, baseVersion);
}

function extractReleaseWorkflowPackageSets(workflow) {
  return [...workflow.matchAll(/packages=\(\n(?<body>[\s\S]*?)\n\s+\)/gu)].map(
    (match) => [...match.groups.body.matchAll(/"(?<packageName>[^"]+)"/gu)].map(
      (packageMatch) => packageMatch.groups.packageName,
    ),
  );
}

test("GitHub Actions release workflow validates releases before guarded publishing", async () => {
  const workflow = await readFile(releaseWorkflowPath, "utf8");
  const packageSets = extractReleaseWorkflowPackageSets(workflow);

  assert.deepEqual(packageSets, [publicPackageSet, publicPackageSet]);

  assertMatchesAll(workflow, [
    /^name: Release$/m,
    /pull_request:\n\s+branches:\n\s+- main/u,
    /push:\n\s+branches:\n\s+- main\n\s+- "issue-\*"/u,
    /workflow_dispatch:/u,
    /contents: read/u,
    /id-token: write/u,
  ]);
  assert.match(
    workflow,
    /DIAGRAMPILOT_NPM_PUBLISH_ENABLED: \$\{\{ vars\.DIAGRAMPILOT_NPM_PUBLISH_ENABLED \}\}/u,
  );
  assertMatchesAll(workflow, [
    /uses: actions\/checkout@v6/u,
    /uses: actions\/setup-node@v6/u,
    /node-version: 22/u,
    /registry-url: https:\/\/registry\.npmjs\.org/u,
    /package-manager-cache: false/u,
    /npm install --global npm@11\.16\.0/u,
    /npm ci/u,
    /npm run check:release-version/u,
    /npm run check:issue-release-version/u,
    /npm run build/u,
    /npm test/u,
    /npm run generate:schema/u,
    /git diff --exit-code -- schema\/diagramspec-v1\.schema\.json/u,
    /npm --workspace website run build/u,
    /npm --workspace website run test/u,
    /node \.\.\/\.\.\/packages\/cli\/dist\/index\.js render docs\/architecture\.dp\.yaml --out docs\/architecture\.svg/u,
    /node \.\.\/\.\.\/packages\/cli\/dist\/index\.js check/u,
    /git diff --exit-code -- demo-projects\/checkout\/docs\/architecture\.svg/u,
    /npm run check:package-readiness/u,
    /node scripts\/plan-release-publish\.mjs --github-output/u,
    /needs\.validate-release\.outputs\.should_publish == 'true'/u,
    /RELEASE_DIST_TAG == 'nightly'/u,
    /node scripts\/bump-release-version\.mjs "\$RELEASE_PUBLISH_VERSION"/u,
    /npm run check:package-publish-state -- --expect latest/u,
    /already publishes \$RELEASE_PUBLISH_VERSION under latest/u,
    /npm publish --workspace "\$workspace" --tag "\$RELEASE_DIST_TAG" --access public/u,
    /npm publish --dry-run --workspace "\$workspace" --tag "\$RELEASE_DIST_TAG" --access public/u,
  ]);
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

  assertMatchesAll(workflow, [
    /^  validate-release:$/m,
    /^  publish-packages:$/m,
    /^  prepare-github-release-draft:$/m,
    /^  publish-github-release:$/m,
    /publish-packages:\n(?:    .+\n)*    needs: validate-release/u,
    /prepare-github-release-draft:\n(?:    .+\n)*    needs: \[validate-release, publish-packages\]/u,
    /publish-github-release:\n(?:    .+\n)*    needs: \[validate-release, prepare-github-release-draft\]/u,
    /ref: \$\{\{ github\.sha \}\}/u,
    /contents: write/u,
    /needs\.validate-release\.outputs\.dist_tag == 'latest'/u,
    /environment: github-release-publication/u,
    /GH_TOKEN: \$\{\{ secrets\.GITHUB_TOKEN \}\}/u,
    /node scripts\/generate-release-notes\.mjs/u,
    /gh release view "\$RELEASE_TAG" --json tagName,name,body,isDraft,isPrerelease/u,
    /node scripts\/validate-github-release-draft\.mjs/u,
    /git tag "\$RELEASE_TAG" "\$GITHUB_SHA"/u,
    /git push origin "\$RELEASE_TAG"/u,
    /gh release create "\$RELEASE_TAG"/u,
    /gh release edit "\$RELEASE_TAG" --draft=false --verify-tag --latest/u,
  ]);

  assertMatchesAll(publishPackagesJob, [
    /needs: validate-release/u,
    /npm run check:package-publish-state -- --expect latest/u,
    /npm view "\$workspace@\$RELEASE_PUBLISH_VERSION" version/u,
    /npm dist-tag add "\$workspace@\$RELEASE_PUBLISH_VERSION" "\$RELEASE_DIST_TAG"/u,
    /npm publish --workspace/u,
  ]);

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
  const sha = "abcdef1234567890";

  const result = await withGithubEvent({ ref: "refs/heads/issue-61-release" }, (eventPath) =>
    runReleasePlan(
      releasePlanEnv(eventPath, {
        GITHUB_EVENT_NAME: "push",
        GITHUB_REF: "refs/heads/issue-61-release",
        GITHUB_REF_NAME: "issue-61-release",
        GITHUB_RUN_NUMBER: "42",
        GITHUB_RUN_ATTEMPT: "3",
        GITHUB_SHA: sha,
        DIAGRAMPILOT_NPM_PUBLISH_ENABLED: "true",
      }),
    ),
  );

  const plan = parseSuccessfulPlan(result);
  assertNightlyPlan(plan, {
    baseVersion,
    runNumber: "42",
    runAttempt: "3",
    sha,
    shouldPublish: true,
    reason: /trusted issue branch push/u,
  });
});

test("release publish planner routes main pushes to latest clean versions", async () => {
  const baseVersion = await readWorkspaceVersion();

  const result = await withGithubEvent({ ref: "refs/heads/main" }, (eventPath) =>
    runReleasePlan(
      releasePlanEnv(eventPath, {
        GITHUB_EVENT_NAME: "push",
        GITHUB_REF: "refs/heads/main",
        GITHUB_REF_NAME: "main",
        GITHUB_RUN_NUMBER: "43",
        GITHUB_SHA: "1234567890abcdef",
        DIAGRAMPILOT_NPM_PUBLISH_ENABLED: "true",
      }),
    ),
  );

  const plan = parseSuccessfulPlan(result);
  assertLatestPlan(plan, { baseVersion, shouldPublish: true });
  assert.match(plan.reason, /trusted main push/u);
});

test("release publish planner keeps trusted pushes dry-run until publishing is enabled", async () => {
  const baseVersion = await readWorkspaceVersion();
  const sha = "abcdef1234567890";

  const result = await withGithubEvent({ ref: "refs/heads/issue-61-release" }, (eventPath) =>
    runReleasePlan(
      releasePlanEnv(eventPath, {
        GITHUB_EVENT_NAME: "push",
        GITHUB_REF: "refs/heads/issue-61-release",
        GITHUB_REF_NAME: "issue-61-release",
        GITHUB_RUN_NUMBER: "47",
        GITHUB_SHA: sha,
      }),
    ),
  );

  const plan = parseSuccessfulPlan(result);
  assertNightlyPlan(plan, {
    baseVersion,
    runNumber: "47",
    sha,
    reason: /real publish disabled/u,
  });
});

test("release publish planner keeps pull requests dry-run even when publishing is enabled", async () => {
  const baseVersion = await readWorkspaceVersion();
  const sha = "123abc456def7890";

  const result = await withGithubEvent(
    {
      pull_request: {
        head: { repo: { full_name: "StiensWout/DiagramPilot" } },
        base: { repo: { full_name: "StiensWout/DiagramPilot" } },
      },
    },
    (eventPath) =>
      runReleasePlan(
        releasePlanEnv(eventPath, {
          GITHUB_EVENT_NAME: "pull_request",
          GITHUB_REF: "refs/pull/64/merge",
          GITHUB_REF_NAME: "64/merge",
          GITHUB_RUN_NUMBER: "48",
          GITHUB_SHA: sha,
          DIAGRAMPILOT_NPM_PUBLISH_ENABLED: "true",
        }),
      ),
  );

  const plan = parseSuccessfulPlan(result);
  assertNightlyPlan(plan, {
    baseVersion,
    runNumber: "48",
    sha,
    reason: /pull request validation uses dry-run/u,
  });
});

test("release publish planner keeps fork pull requests and manual runs dry-run only", async () => {
  const baseVersion = await readWorkspaceVersion();
  const forkSha = "fedcba9876543210";

  const forkResult = await withGithubEvent(
    {
      pull_request: {
        head: { repo: { full_name: "someone/DiagramPilot" } },
        base: { repo: { full_name: "StiensWout/DiagramPilot" } },
      },
    },
    (eventPath) =>
      runReleasePlan(
        releasePlanEnv(eventPath, {
          GITHUB_EVENT_NAME: "pull_request",
          GITHUB_REF: "refs/pull/12/merge",
          GITHUB_REF_NAME: "12/merge",
          GITHUB_RUN_NUMBER: "44",
          GITHUB_SHA: forkSha,
          DIAGRAMPILOT_NPM_PUBLISH_ENABLED: "true",
        }),
      ),
  );

  const forkPlan = parseSuccessfulPlan(forkResult);
  assertNightlyPlan(forkPlan, {
    baseVersion,
    runNumber: "44",
    sha: forkSha,
    reason: /fork pull request/u,
  });

  const manualSha = "0123456789abcdef";
  const manualRun = await withGithubEvent({ ref: "refs/heads/main" }, (eventPath) =>
    runReleasePlan(
      releasePlanEnv(eventPath, {
        GITHUB_EVENT_NAME: "workflow_dispatch",
        GITHUB_REF: "refs/heads/main",
        GITHUB_REF_NAME: "main",
        GITHUB_RUN_NUMBER: "45",
        GITHUB_SHA: manualSha,
      }),
    ),
  );

  const manualPlan = parseSuccessfulPlan(manualRun);
  assertNightlyPlan(manualPlan, {
    baseVersion,
    runNumber: "45",
    sha: manualSha,
    reason: /manual dry-run/u,
  });
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

  assertMatchesAll(workflow, [
    /\.github\/workflows\/release\.yml/u,
    /trusted publisher/u,
    /OIDC/u,
    /`nightly`/u,
    /`latest`/u,
    /Pull requests perform validation and npm publish dry-runs only/u,
    /manual dry-run/u,
    /Issue Release/u,
    /GitHub Release draft/u,
    /scripts\/generate-release-notes\.mjs/u,
    /scripts\/validate-github-release-draft\.mjs/u,
    /npm `latest` publish succeeds/u,
    /Nightly .*skip GitHub Releases/u,
  ]);

  for (const packageName of publicPackageSet) {
    assert.match(workflow, new RegExp(packageName.replace("/", "\\/"), "u"));
  }
});
