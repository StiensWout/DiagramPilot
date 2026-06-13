import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { assertMatchesAll, assertMatchesNone } from "./assertion-helpers.mjs";
import { repoRoot } from "./docs-public-boundary-helpers.mjs";

const releaseWorkflowPath = path.join(
  repoRoot,
  ".github",
  "workflows",
  "release.yml",
);
const releasePackagePublisherPath = path.join(
  repoRoot,
  "scripts",
  "publish-release-packages.mjs",
);
const publicPackageSetPath = path.join(
  repoRoot,
  "scripts",
  "public-package-set.mjs",
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

function extractReleasePublisherPackageSet(script) {
  return [...script.matchAll(/name: "(?<packageName>[^"]+)"/gu)].map(
    (match) => match.groups.packageName,
  );
}

test("GitHub Actions release workflow validates releases before guarded publishing", async () => {
  const workflow = await readFile(releaseWorkflowPath, "utf8");
  const releasePackagePublisher = await readFile(releasePackagePublisherPath, "utf8");
  const publicPackageSetSource = await readFile(publicPackageSetPath, "utf8");
  const packageSet = extractReleasePublisherPackageSet(publicPackageSetSource);

  assert.deepEqual(packageSet, publicPackageSet);

  assertMatchesAll(workflow, [
    /^name: Release$/m,
    /name: Validate release and verify publish artifacts/u,
    /name: Publish npm packages \(nightly or final\)/u,
    /name: Create nightly GitHub prerelease/u,
    /name: Prepare final GitHub Release draft/u,
    /name: Publish final GitHub Release after approval/u,
    /push:\n\s+branches:\n\s+- nightly\n\s+- main/u,
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
    /npm run check:package-size-budgets/u,
    /node scripts\/plan-release-publish\.mjs --github-output/u,
    /needs\.release-checks\.outputs\.should_publish == 'true'/u,
    /RELEASE_DIST_TAG == 'nightly'/u,
    /node scripts\/bump-release-version\.mjs "\$RELEASE_PUBLISH_VERSION"/u,
    /node scripts\/publish-release-packages\.mjs --mode dry-run/u,
    /uses: actions\/upload-artifact@v4/u,
    /uses: actions\/download-artifact@v4/u,
    /diagrampilot-publish-artifacts/u,
    /tar --create --gzip/u,
    /tar --extract --gzip/u,
    /node scripts\/publish-release-packages\.mjs --mode publish/u,
    /Create nightly GitHub prerelease/u,
    /--prerelease/u,
    /--latest=false/u,
    /--title "\$RELEASE_TAG"/u,
    /--kind nightly/u,
    /--kind final/u,
    /gh pr list --state merged --base main/u,
  ]);
  assertMatchesNone(workflow, [
    /npm run check:issue-release-version/u,
    /pull_request:/u,
    /"feature\/\*\*"/u,
    /--title "DiagramPilot \$RELEASE_TAG"/u,
    /NPM_TOKEN|NODE_AUTH_TOKEN|VERCEL|--provenance/u,
    /check:visual|playwright install/u,
  ]);

  assert.match(
    releasePackagePublisher,
    /import \{ PUBLIC_PACKAGE_NAMES \} from "\.\/public-package-set\.mjs";/u,
  );

  for (const packageName of publicPackageSet) {
    assert.match(
      publicPackageSetSource,
      new RegExp(packageName.replace("/", "\\/"), "u"),
    );
  }
});

test("release workflow gates CD side effects behind CI and validates reviewed GitHub Release drafts", async () => {
  const workflow = await readFile(releaseWorkflowPath, "utf8");
  const releaseChecksStart = workflow.indexOf("  release-checks:");
  const publishPackagesStart = workflow.indexOf("  publish-packages:");
  const publishGithubPrereleaseStart = workflow.indexOf(
    "  create-github-prerelease:",
  );
  const prepareGithubReleaseStart = workflow.indexOf(
    "  prepare-github-release-draft:",
  );
  const publishGithubReleaseStart = workflow.indexOf("  publish-github-release:");
  const releaseChecksJob = workflow.slice(releaseChecksStart, publishPackagesStart);
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
    /^  release-checks:$/m,
    /^  publish-packages:$/m,
    /^  create-github-prerelease:$/m,
    /^  prepare-github-release-draft:$/m,
    /^  publish-github-release:$/m,
    /publish-packages:\n(?:    .+\n)*    needs: release-checks/u,
    /create-github-prerelease:\n(?:    .+\n)*    needs: \[release-checks, publish-packages\]/u,
    /prepare-github-release-draft:\n(?:    .+\n)*    needs: \[release-checks, publish-packages\]/u,
    /publish-github-release:\n(?:    .+\n)*    needs: \[release-checks, prepare-github-release-draft\]/u,
    /ref: \$\{\{ github\.sha \}\}/u,
    /contents: write/u,
    /needs\.release-checks\.outputs\.dist_tag == 'latest'/u,
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
    /needs\.release-checks\.outputs\.dist_tag == 'nightly'/u,
    /gh release create "\$RELEASE_TAG"/u,
    /--prerelease/u,
    /--latest=false/u,
    /--kind nightly/u,
  ]);

  assertMatchesAll(publishPackagesJob, [
    /needs: release-checks/u,
    /uses: actions\/download-artifact@v4/u,
    /tar --extract --gzip/u,
    /npm run check:release-version -- "\$RELEASE_PUBLISH_VERSION"/u,
    /node scripts\/publish-release-packages\.mjs --mode publish/u,
  ]);
  assertMatchesNone(publishPackagesJob, [
    /npm ci/u,
    /npm test/u,
    /npm run build/u,
    /npm run generate:schema/u,
    /npm --workspace website run build/u,
    /npm --workspace website run test/u,
    /node \.\.\/\.\.\/packages\/cli\/dist\/index\.js render/u,
    /npm run check:package-readiness/u,
    /npm run check:package-size-budgets/u,
  ]);

  const packageReadiness = releaseChecksJob.indexOf("npm run check:package-readiness");
  const packageSizeBudget = releaseChecksJob.indexOf("npm run check:package-size-budgets");
  const publishDryRun = releaseChecksJob.indexOf(
    "node scripts/publish-release-packages.mjs --mode dry-run",
  );
  const publishArtifact = releaseChecksJob.indexOf(
    "diagrampilot-publish-artifacts.tgz",
  );
  assert.notEqual(packageReadiness, -1);
  assert.notEqual(packageSizeBudget, -1);
  assert.notEqual(publishDryRun, -1);
  assert.notEqual(publishArtifact, -1);
  assert.ok(
    packageReadiness < packageSizeBudget,
    "package readiness should run before package size budgets",
  );
  assert.ok(
    packageSizeBudget < publishDryRun,
    "package size budgets must pass before the publish dry-run",
  );
  assert.ok(
    publishDryRun < publishArtifact,
    "only dry-run-verified publish artifacts should be uploaded",
  );

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
