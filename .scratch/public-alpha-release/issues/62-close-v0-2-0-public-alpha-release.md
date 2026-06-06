Status: ready-for-human
Issue Version: 0.2.0

# Close v0.2.0 Public Alpha Release

## Parent

- [PRD](../PRD.md)

## What to build

Close the v0.2.0 scope as the first Public Alpha Release. This issue should
coordinate the final version bump, package publish, public docs, website,
release notes, and public surface audit.

## Acceptance criteria

- [x] The shared DiagramPilot version is `0.2.0` across public packages,
      internal dependencies, lockfile metadata, runtime version metadata, and
      version-sensitive tests.
- [x] Demo SVG provenance and any other version-sensitive Derived Artifacts are
      refreshed and committed.
- [x] Public docs are compact, coherent, structured, current with v0.2.0, and
      published through the Public Website.
- [x] Installation and removal docs are published and linked from README,
      `llms.txt`, and website entrypoints.
- [x] The MIT Code License and Brand Use Policy are present and discoverable.
- [x] Canonical DiagramPilot Brand Assets are committed and applied to website
      and release surfaces where appropriate.
- [x] Public Package Set tarball checks pass.
- [ ] Public Package Set packages are published to npm at `0.2.0` under the
      `latest` dist-tag.
      Pending external release publish from the reviewed `main` release commit.
- [ ] `diagrampilot` can be installed and invoked through the documented npm
      install paths.
      Pending npm `latest` publishing of the `0.2.0` package set.
- [ ] Git tag `v0.2.0` points at the release commit.
      Pending tag creation after the reviewed release commit lands.
- [ ] A GitHub release exists for `v0.2.0` with concise release notes.
      Pending GitHub release creation after the reviewed release commit lands.
- [ ] The Public Website production deployment serves the v0.2.0 docs and
      release-aligned public routes.
      Pending production deployment after merge.
- [x] Internal Documentation, ADRs, agent workflow docs, and `.scratch/`
      planning trackers are not published through website docs routes, included
      in npm package tarballs, or linked as user-facing release materials.
- [x] Generated visual reports and font cache files under `.scratch/` are
      removed from the public release surface unless a specific committed-review
      reason exists.
- [x] Local issue status, acceptance criteria, implementation notes, validation
      plan, and validation results are updated before closeout.

## Blocked by

- [63 Finalize alpha behavior and public surface gate](./63-finalize-alpha-behavior-and-public-surface-gate.md)

## Validation plan

```bash
npm ci
npm run build
npm test
npm --workspace website run build
npm --workspace website run test
npm --workspace website run check:visual
cd demo-projects/checkout && node ../../packages/cli/dist/index.js check
npm run check:release-version
npm run check:package-readiness
npm run check:package-publish-state -- --expect latest
git rev-parse --verify v0.2.0
gh release view v0.2.0 --json tagName,name,url,isDraft,isPrerelease
git diff --check
```

## Implementation notes

- Bumped shared DiagramPilot release metadata from `0.1.9` to `0.2.0` across
  root, public package, private website workspace, exact internal dependency,
  lockfile, and runtime version surfaces with `scripts/bump-release-version.mjs`.
- Rebuilt the CLI and refreshed
  `demo-projects/checkout/docs/architecture.svg` so SVG provenance records
  DiagramPilot `0.2.0`.
- Updated the installation guide release status from future/pre-alpha language
  to the `0.2.0` Public Alpha Release and added regression coverage to keep
  stale `prealpha` wording out of the final public install page.
- Made the MIT Code License and Brand Use Policy discoverable from the public
  docs index and `llms.txt`, with regression coverage for README, public docs,
  and agent entrypoint surfaces.
- Added `npm run check:package-publish-state -- --expect latest` support and
  coverage so the final npm `latest` release state can be verified with one
  release gate after publish.
- Documented the final `latest` publish-state check in
  `docs/development/release-version-workflow.md`.
- Verified tracked public surfaces no longer contain stale `prealpha`,
  pre-alpha, future `0.2.0`, or `0.1.9` release wording.
- External release completion remains pending: npm `latest` still points to
  `0.1.9`, tag `v0.2.0` does not exist, the GitHub release does not exist, and
  production website deployment has not been verified from this branch.
- Existing visual quality screenshots, report, and font cache files under
  `.scratch/productization-and-maintainability/visual-quality/` have the
  committed-review reason recorded in issue 54 and remain excluded from website
  routes and npm package tarballs.

## Validation results

```bash
node scripts/check-release-version.mjs 0.2.0
node scripts/bump-release-version.mjs 0.2.0
node scripts/check-release-version.mjs 0.2.0
npm run build
cd demo-projects/checkout && node ../../packages/cli/dist/index.js render docs/architecture.dp.yaml --out docs/architecture.svg
cd demo-projects/checkout && node ../../packages/cli/dist/index.js check
node --test --test-concurrency=1 test/documentation-contract.test.mjs
node --test --test-concurrency=1 test/docs-public-boundary.test.mjs
node --test --test-concurrency=1 test/package-publish-state.test.mjs
rg -n 'prealpha|pre-alpha|pre alpha|preparing `0\.2\.0`|0\.1\.x packages are pre-alpha|0\.1\.9' README.md llms.txt docs-public website/src packages package.json package-lock.json demo-projects/checkout/docs/architecture.svg
npm ci
npm run build
npm test
npm --workspace website run build
npm --workspace website run test
npm --workspace website run check:visual
npm run check:release-version
npm run check:package-readiness
cd demo-projects/checkout && node ../../packages/cli/dist/index.js check
npm run check:package-publish-state -- --expect latest
git tag --points-at HEAD
git rev-parse --verify v0.2.0
gh release view v0.2.0 --json tagName,name,url,isDraft,isPrerelease
git diff --check
```

- `node scripts/check-release-version.mjs 0.2.0` failed before the bump,
  proving the version gate caught `0.1.9` release metadata.
- `node scripts/bump-release-version.mjs 0.2.0` passed.
- `node scripts/check-release-version.mjs 0.2.0` passed after the bump.
- `npm run build` passed.
- Demo render and `node ../../packages/cli/dist/index.js check` passed.
- `node --test --test-concurrency=1 test/documentation-contract.test.mjs`
  failed before the install-guide release-status update, then passed.
- `node --test --test-concurrency=1 test/docs-public-boundary.test.mjs`
  failed before public license/policy links were added, then passed.
- `node --test --test-concurrency=1 test/package-publish-state.test.mjs`
  failed before `--expect latest` support, then passed.
- The stale public-surface wording scan returned no matches.
- `npm ci` passed with 0 vulnerabilities and existing npm allow-scripts
  warnings for `esbuild` and `sharp`.
- `npm test` passed with 162 tests.
- `npm --workspace website run build` passed; Astro emitted the existing
  deprecated markdown plugin configuration warning and built 9 pages.
- `npm --workspace website run test` passed with 16 tests.
- `npm --workspace website run check:visual` passed.
- `npm run check:release-version` passed at `0.2.0`.
- `npm run check:package-readiness` passed for 6 public packages.
- `git diff --check` passed.
- `npm run check:package-publish-state -- --expect latest` failed as an
  external release-state check because all six packages still have npm
  `latest` at `0.1.9`; expected `0.2.0`.
- `git tag --points-at HEAD` returned no tags, and
  `git rev-parse --verify v0.2.0` failed because the release tag has not been
  created yet.
- `gh release view v0.2.0 --json tagName,name,url,isDraft,isPrerelease` failed
  with `release not found`.
