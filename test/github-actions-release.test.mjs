import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { assertMatchesAll } from "./assertion-helpers.mjs";
import { repoRoot } from "./docs-public-boundary-helpers.mjs";

const releaseWorkflowPath = path.join(
  repoRoot,
  ".github",
  "workflows",
  "release.yml",
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
    /push:\n\s+branches:\n\s+- main\n\s+- "feature\/\*\*"/u,
    /workflow_dispatch:/u,
    /release_kind:/u,
    /milestone:/u,
    /previous_tag:/u,
    /highlights:/u,
    /breaking_changes:/u,
    /upgrade_notes:/u,
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
    /Publish nightly GitHub prerelease/u,
    /--prerelease/u,
    /--latest=false/u,
    /--kind nightly/u,
    /--kind final/u,
    /gh pr list --state merged --base main/u,
    /npm run check:package-publish-state -- --expect latest/u,
    /already publishes \$RELEASE_PUBLISH_VERSION under latest/u,
    /npm publish --workspace "\$workspace" --tag "\$RELEASE_DIST_TAG" --access public/u,
    /npm publish --dry-run --workspace "\$workspace" --tag "\$RELEASE_DIST_TAG" --access public/u,
  ]);
  assert.doesNotMatch(workflow, /npm run check:issue-release-version/u);
  assert.doesNotMatch(workflow, /NPM_TOKEN|NODE_AUTH_TOKEN|VERCEL|--provenance/u);
  assert.doesNotMatch(workflow, /check:visual|playwright install/u);

  for (const packageName of publicPackageSet) {
    assert.match(workflow, new RegExp(packageName.replace("/", "\\/"), "u"));
  }
});

test("release workflow gates CD side effects behind CI and validates reviewed GitHub Release drafts", async () => {
  const workflow = await readFile(releaseWorkflowPath, "utf8");
  const publishPackagesStart = workflow.indexOf("  publish-packages:");
  const publishGithubPrereleaseStart = workflow.indexOf(
    "  publish-github-prerelease:",
  );
  const prepareGithubReleaseStart = workflow.indexOf(
    "  prepare-github-release-draft:",
  );
  const publishGithubReleaseStart = workflow.indexOf("  publish-github-release:");
  const publishPackagesJob = workflow.slice(
    publishPackagesStart,
    publishGithubPrereleaseStart,
  );
  const publishGithubPrereleaseJob = workflow.slice(
    publishGithubPrereleaseStart,
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
    /^  publish-github-prerelease:$/m,
    /^  prepare-github-release-draft:$/m,
    /^  publish-github-release:$/m,
    /publish-packages:\n(?:    .+\n)*    needs: validate-release/u,
    /publish-github-prerelease:\n(?:    .+\n)*    needs: \[validate-release, publish-packages\]/u,
    /prepare-github-release-draft:\n(?:    .+\n)*    needs: \[validate-release, publish-packages\]/u,
    /publish-github-release:\n(?:    .+\n)*    needs: \[validate-release, prepare-github-release-draft\]/u,
    /ref: \$\{\{ github\.sha \}\}/u,
    /contents: write/u,
    /needs\.validate-release\.outputs\.dist_tag == 'latest'/u,
    /environment: github-release-publication/u,
    /GH_TOKEN: \$\{\{ secrets\.GITHUB_TOKEN \}\}/u,
    /reusing existing release tag/u,
    /node scripts\/generate-release-notes\.mjs/u,
    /gh release view "\$RELEASE_TAG" --json tagName,name,body,isDraft,isPrerelease/u,
    /node scripts\/validate-github-release-draft\.mjs/u,
    /git tag "\$RELEASE_TAG" "\$GITHUB_SHA"/u,
    /git push origin "\$RELEASE_TAG"/u,
    /gh release create "\$RELEASE_TAG"/u,
    /gh release edit "\$RELEASE_TAG" --draft=false --verify-tag --latest/u,
  ]);

  assertMatchesAll(publishGithubPrereleaseJob, [
    /needs\.validate-release\.outputs\.dist_tag == 'nightly'/u,
    /gh release create "\$RELEASE_TAG"/u,
    /--prerelease/u,
    /--latest=false/u,
    /--kind nightly/u,
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
  assert.doesNotMatch(publishGithubReleaseJob, /--target "\$GITHUB_SHA"/u);

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
    /Trusted pushes to `feature\/\*\*` branches/u,
    /Pull requests perform validation and npm publish dry-runs only/u,
    /Trusted pushes to `main` validate release candidates without publishing/u,
    /Manual milestone dispatches publish npm `latest`/u,
    /Milestone Release/u,
    /GitHub prerelease/u,
    /GitHub Release draft/u,
    /scripts\/generate-release-notes\.mjs/u,
    /scripts\/validate-github-release-draft\.mjs/u,
    /npm `latest` publish succeeds/u,
    /Nightly .*create GitHub prereleases/u,
  ]);

  for (const packageName of publicPackageSet) {
    assert.match(workflow, new RegExp(packageName.replace("/", "\\/"), "u"));
  }
});
