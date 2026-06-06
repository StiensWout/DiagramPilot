Status: completed
Issue Version: 0.1.7

# Add GitHub Actions branch and PR CI

## Parent

- [PRD](../PRD.md)

## What to build

Add GitHub Actions CI that validates branch and pull request changes with the
same checks expected before release.

## Acceptance criteria

- [x] A GitHub Actions workflow runs on pull requests and relevant branch
      pushes.
- [x] CI uses the repository's required Node and npm versions or a documented
      compatible setup.
- [x] CI runs `npm ci`.
- [x] CI runs the root build and test suite.
- [x] CI runs website build and website tests.
- [x] CI runs website visual quality checks in a mode suitable for GitHub-hosted
      runners.
- [x] CI verifies schema generation drift.
- [x] CI verifies the checkout demo workflow, including `diagrampilot check`.
- [x] CI runs package dry-run or package-readiness checks for the Public Package
      Set.
- [x] CI verifies public/internal documentation boundaries still hold.
- [x] CI does not require Vercel credentials or npm publish credentials.
- [x] Internal Documentation and `.scratch/` may remain committed, but CI proves
      they are not published through website docs routes or package tarballs.

## Blocked by

- [59 Prove package publishing readiness and reserve npm names](./59-prove-package-publishing-readiness-and-reserve-npm-names.md)

## Validation plan

```bash
npm ci
npm run check:release-version
npm run build
node --test --test-concurrency=1 test/github-actions-ci.test.mjs
npm test
npm run generate:schema
git diff --exit-code -- schema/diagramspec-v1.schema.json
npm --workspace website run build
npm --workspace website run test
npm --workspace website run check:visual
cd demo-projects/checkout && node ../../packages/cli/dist/index.js render docs/architecture.dp.yaml --out docs/architecture.svg
cd demo-projects/checkout && node ../../packages/cli/dist/index.js check
npm run check:package-readiness
git diff --check
```

## Implementation notes

- Added `.github/workflows/ci.yml` with pull request validation for `main` and
  push validation for `main` and `issue-*` branches.
- CI uses `actions/setup-node@v4` with Node 22, npm cache, and
  `npm@11.16.0` to match the root `packageManager` declaration.
- CI runs `npm ci`, release-version consistency, root build, root tests,
  schema generation drift checks, website build/tests/visual checks, checkout
  demo render plus `diagrampilot check`, and Public Package Set readiness.
- Website visual checks install Chromium with
  `npx playwright install --with-deps chromium` so the Playwright path runs on
  GitHub-hosted Ubuntu runners.
- Added `test/github-actions-ci.test.mjs` as the workflow contract test. The
  initial RED run failed because `.github/workflows/ci.yml` was missing; the
  GREEN run passed after adding the workflow.
- Bumped DiagramPilot Issue Version metadata to `0.1.7` and refreshed checkout
  demo SVG provenance from `0.1.6` to `0.1.7`.
- The workflow does not reference Vercel credentials, npm publish credentials,
  npm publish commands, or `NPM_TOKEN`.

## Validation results

- `npm ci` passed. npm emitted its existing allow-scripts warning for `esbuild`
  and `sharp`; no vulnerabilities were found.
- `npm run check:release-version` passed at `0.1.7`.
- `npm run build` passed.
- `cd demo-projects/checkout && node ../../packages/cli/dist/index.js render docs/architecture.dp.yaml --out docs/architecture.svg`
  passed.
- `cd demo-projects/checkout && node ../../packages/cli/dist/index.js check`
  passed.
- `node --test --test-concurrency=1 test/github-actions-ci.test.mjs` passed: 1
  test.
- `npm test` passed: 150 tests.
- `npm run generate:schema` passed.
- `git diff --exit-code -- schema/diagramspec-v1.schema.json` passed.
- `npm --workspace website run build` passed. Astro emitted the existing
  markdown plugin deprecation warning.
- `npm --workspace website run test` passed: 17 tests.
- `npm --workspace website run check:visual` passed.
- `npm run check:package-readiness` passed for all 6 public packages.
- `git diff --check` passed.
