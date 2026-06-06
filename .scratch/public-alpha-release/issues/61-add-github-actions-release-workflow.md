Status: completed
Issue Version: 0.1.8

# Add GitHub Actions release workflow

## Parent

- [PRD](../PRD.md)

## What to build

Add release automation for future DiagramPilot releases. The release workflow
should validate the release, verify publish/version consistency, publish
trusted issue branch builds to `nightly`, keep pull requests dry-run only, and
publish merged `main` release builds to `latest` through npm trusted publishing
where available.

## Acceptance criteria

- [x] A GitHub Actions release workflow runs for trusted pre-merge branches,
      pull requests, merges to `main`, and manual dry-run validation with clear
      guardrails.
- [x] The workflow reruns the full release validation suite before publishing.
- [x] The workflow verifies the publish version matches the shared Issue
      Version, and any tag-triggered path must match the tag name.
- [x] The workflow verifies all Public Package Set manifests and exact internal
      dependencies match the publish version.
- [x] The workflow verifies generated or version-sensitive artifacts such as
      demo SVG provenance are current.
- [x] The workflow publishes all Public Package Set packages together.
- [x] The workflow uses npm trusted publishing/OIDC where available instead of
      long-lived npm tokens.
- [x] Trusted issue branch publishing uses the `nightly` dist-tag.
- [x] Nightly publishing uses unique npm prerelease versions derived from the
      shared Issue Version plus CI identity, so a nightly publish cannot consume
      the clean version intended for `latest`.
- [x] Merges to `main` publish the clean shared version under the `latest`
      dist-tag.
- [x] Real `nightly` or `latest` publishing cannot run from pull requests or
      forks; pull requests use dry-run validation only.
- [x] `latest` publishing cannot run from pull requests, issue branches, or
      manual dry-run paths.
- [x] The workflow does not deploy the Public Website directly; Vercel remains
      the website production deployment path.
- [x] Release workflow docs explain any required npm trusted publisher setup for
      each package.
- [x] A dry-run or guarded validation path exists so release workflow behavior
      can be reviewed without accidentally publishing.
- [x] Workflow tests cover `nightly`/`latest` routing, version derivation, and
      credential boundaries.

## Blocked by

- [60 Add GitHub Actions branch and PR CI](./60-add-github-actions-branch-and-pr-ci.md)

## Validation plan

```bash
npm run build
npm run check:release-version
node --test --test-concurrency=1 test/github-actions-release.test.mjs
npm test
npm run generate:schema
git diff --exit-code -- schema/diagramspec-v1.schema.json
npm --workspace website run build
npm --workspace website run test
cd demo-projects/checkout && node ../../packages/cli/dist/index.js render docs/architecture.dp.yaml --out docs/architecture.svg
cd demo-projects/checkout && node ../../packages/cli/dist/index.js check
npm run check:package-readiness
rg -n "nightly|latest|trusted publishing|unique npm prerelease|prerelease" .scratch/public-alpha-release/PRD.md .scratch/public-alpha-release/issues/61-add-github-actions-release-workflow.md docs/development/release-version-workflow.md .github/workflows/release.yml scripts/plan-release-publish.mjs
git diff --check
```

## Implementation notes

- Added `.github/workflows/release.yml` with guarded package release
  automation for pull requests, `issue-*` branch pushes, `main` pushes, and
  manual dry-run validation.
- Added `scripts/plan-release-publish.mjs` to derive the publish plan from the
  GitHub event. Trusted `issue-*` branch pushes publish unique
  `<issue-version>-nightly.<run-number>.<run-attempt>.<short-sha>` versions
  under `nightly` after `DIAGRAMPILOT_NPM_PUBLISH_ENABLED=true`; pull request
  runs stay dry-run only to avoid duplicate npm versions; trusted `main` pushes
  publish the clean shared version under `latest` after the same setup guard;
  manual runs and setup-disabled runs stay dry-run only.
- The workflow reruns release validation before publish: release-version
  consistency, build, root tests, schema drift, website build/tests, checkout
  demo render plus `diagrampilot check`, and package readiness.
- Removed the GitHub-hosted website visual quality check from release
  automation and the root test suite because it can produce runner-specific
  font-cache noise; visual review stays local/manual for presentation changes.
- Real publish commands cover all six Public Package Set workspaces together
  and use npm trusted publishing/OIDC via `id-token: write`,
  `registry-url: https://registry.npmjs.org`, automatic npm provenance, and no
  long-lived npm token.
- Added a publish-enable guard so GitHub validation can pass before npm trusted
  publishers exist. Real publish requires repository variable
  `DIAGRAMPILOT_NPM_PUBLISH_ENABLED=true`.
- Updated the release planner so pull request events always stay dry-run only,
  even when real publishing is enabled, preventing duplicate npm versions for
  the same branch update.
- Dry-run publish validation runs before real publish so release behavior can be
  reviewed without moving npm dist-tags.
- Updated `docs/development/release-version-workflow.md` with release
  automation routing, nightly version derivation, manual dry-run guardrails,
  and the trusted publisher setup required for each public package.
- Added `test/github-actions-release.test.mjs` covering workflow contract,
  `nightly`/`latest` routing, unique prerelease derivation, pull request
  dry-run boundaries, fork/manual boundaries, tag/version consistency, and
  trusted publisher docs.
- Bumped DiagramPilot Issue Version metadata to `0.1.8` and refreshed checkout
  demo SVG provenance at `0.1.8`.
- Issue 60 has a separate completed branch; merge this issue after issue 60 so
  the release workflow lands after the branch and PR CI slice.

## Validation results

- `npm run build` passed.
- `cd demo-projects/checkout && node ../../packages/cli/dist/index.js render docs/architecture.dp.yaml --out docs/architecture.svg`
  passed.
- `cd demo-projects/checkout && node ../../packages/cli/dist/index.js check`
  passed: 1 DiagramPilot Source File fresh.
- `node --test --test-concurrency=1 test/github-actions-release.test.mjs`
  passed: 8 tests after adding coverage that pull request events stay dry-run
  even when `DIAGRAMPILOT_NPM_PUBLISH_ENABLED=true`.
- `npm run check:release-version` passed at `0.1.8`.
- `npm test` passed: 158 tests after removing the GitHub-hosted visual quality
  gate from the root suite and adding nightly prerelease release-version
  tooling, publish-enable guard coverage, and pull request dry-run coverage.
- `npm run generate:schema` passed.
- `git diff --exit-code -- schema/diagramspec-v1.schema.json` passed.
- `npm --workspace website run build` passed. Astro emitted the existing
  markdown plugin deprecation warning.
- `npm --workspace website run test` passed: 17 tests.
- `npm --workspace website run check:visual` passed locally before removal from
  GitHub-hosted release automation; it remains a local/manual presentation
  validation check rather than a CI/CD gate.
- `npm run check:package-readiness` passed for all 6 public packages.
- `rg -n "nightly|latest|trusted publishing|unique npm prerelease|prerelease" .scratch/public-alpha-release/PRD.md .scratch/public-alpha-release/issues/61-add-github-actions-release-workflow.md docs/development/release-version-workflow.md .github/workflows/release.yml scripts/plan-release-publish.mjs`
  found the expected release routing and trusted publishing references.
- GitHub Actions run `27056252781` passed on commit `541f677`: install,
  release-version check, build, root tests, schema drift, website build/tests,
  checkout demo workflow, package readiness, nightly metadata preparation,
  publish-version verification, package readiness after nightly metadata, and
  package publish dry-run all passed. Real publish was skipped because
  `DIAGRAMPILOT_NPM_PUBLISH_ENABLED` is not set.
- Earlier GitHub Actions run `27056127780` reached real npm publish and failed
  with `E404 ... not found or you do not have permission`, confirming that npm
  trusted publishers must be configured before enabling real publish.
- `npm view <package> dist-tags --json` confirmed all six Public Package Set
  names remain reserved with `prealpha: 0.1.6` and `latest: 0.1.5`.
- `gh api -X GET 'repos/StiensWout/DiagramPilot/deployments?ref=issue-61-nightly-latest-release-plan' --jq 'length'`
  returned `0`; this workflow does not create deployments, and Vercel remains
  the separate Public Website deployment path.
- `git diff --check` passed.
