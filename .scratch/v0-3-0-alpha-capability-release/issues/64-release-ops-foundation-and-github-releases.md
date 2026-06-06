Status: completed
Issue Version: 0.2.1

# Release ops foundation and GitHub Releases

## Parent

- [PRD](../PRD.md)

## What to build

Make each clean `main` implementation merge publish as an Issue Release with
its own Issue Version, npm `latest` publish, Git tag, GitHub Release, and
reviewed release notes. Release notes should be generated from local issue
closeout fields into a GitHub Release draft, not stored as committed files or
under `.scratch/`.

Nightly publishes must keep avoiding GitHub Releases. CI must complete before
any CD side effect, and GitHub Release publication must happen only after npm
`latest` succeeds for the same version.

## User stories covered

- 2-10

## Acceptance criteria

- [x] Maintainer docs define Issue Releases, Issue Versions, and the rule that
      each implementation issue merge to `main` gets a public release.
- [x] The release workflow gates all CD side effects behind successful CI for
      the same commit.
- [x] The release workflow verifies the intended Issue Version before package
      publish, tag creation, or GitHub Release publication.
- [x] A checked-in release-note generator can derive draft release notes from
      completed local issue closeout fields.
- [x] Release-note drafts are reviewed in the GitHub Release draft body and are
      not written as committed release-note files or `.scratch` files.
- [x] The release workflow fails before GitHub Release publication if the
      reviewed draft is missing, empty, or mismatched with the version or tag.
- [x] The release workflow publishes npm `latest`, creates `vX.Y.Z`, and then
      publishes the matching GitHub Release.
- [x] Nightly branch publishes continue to skip GitHub Releases.
- [x] Tests or workflow dry-run coverage prove CI-before-CD ordering and
      GitHub Release draft validation behavior.

## Blocked by

None - can start immediately.

## Validation plan

```bash
npm test
npm run check:release-version
npm run check:package-readiness
git diff --check
```

## Implementation notes

- Split `.github/workflows/release.yml` into validation, package publish,
  GitHub Release draft preparation, and reviewed GitHub Release publication
  jobs. The package publish job needs `validate-release`, checks out the same
  `${{ github.sha }}` commit, verifies the intended Issue Version, rebuilds
  package artifacts, reruns package readiness, and then publishes the Public
  Package Set.
- Added latest-only GitHub Release handling after npm package publish succeeds:
  `prepare-github-release-draft` verifies the Issue Version, creates or
  verifies `vX.Y.Z` for the release commit, generates draft release notes from
  local issue closeout fields, creates or updates the GitHub Release draft, and
  validates the generated draft shape.
- Added the protected `publish-github-release` job with
  `environment: github-release-publication` so maintainers can review the
  GitHub Release draft body before publication. The job revalidates the
  reviewed draft and publishes it only for npm `latest` releases.
- Kept nightly branch publishes on npm `nightly` only. Nightly paths still run
  validation and package publish dry-runs, and they never create Git tags or
  GitHub Releases.
- Added `scripts/generate-release-notes.mjs` to derive a GitHub Release body
  from completed local issue closeout fields. It can take an explicit issue
  path or discover the completed issue by `Issue Version`, writes only to
  stdout, and includes the npm version URL and Public Website URL.
- Added `scripts/validate-github-release-draft.mjs` to validate the JSON shape
  returned by `gh release view --json tagName,name,body,isDraft,isPrerelease`.
  It fails for missing or empty bodies, wrong tags, wrong Issue Versions,
  non-draft releases, and prerelease-marked drafts.
- Updated release maintainer docs with Issue Release rules, release-note draft
  generation, draft review through the protected GitHub environment, nightly
  GitHub Release exclusion, and CI-before-CD workflow ordering.
- Bumped shared DiagramPilot release metadata to Issue Version `0.2.1` and
  refreshed `demo-projects/checkout/docs/architecture.svg` provenance at
  `0.2.1`.

## Validation results

- `node scripts/bump-release-version.mjs 0.2.1` passed.
- `npm run build` passed.
- `cd demo-projects/checkout && node ../../packages/cli/dist/index.js render docs/architecture.dp.yaml --out docs/architecture.svg`
  passed.
- `cd demo-projects/checkout && node ../../packages/cli/dist/index.js check`
  passed: 1 DiagramPilot Source File fresh.
- `node --test --test-concurrency=1 test/github-actions-release.test.mjs test/release-version-tooling.test.mjs test/release-notes.test.mjs`
  passed: 17 tests.
- `npm test` passed: 166 tests.
- `npm run check:release-version` passed at `0.2.1`.
- `npm run check:package-readiness` passed for 6 public packages.
- `node scripts/generate-release-notes.mjs --version 0.2.1 --tag v0.2.1`
  generated the expected GitHub Release draft body from this completed issue.
- `git diff --check` passed.
