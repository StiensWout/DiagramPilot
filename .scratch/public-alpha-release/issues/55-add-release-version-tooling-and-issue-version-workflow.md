Status: completed
Issue Version: 0.1.1

# Add release version tooling and Issue Version workflow

## Parent

- [PRD](../PRD.md)

## What to build

Add a release version workflow that updates DiagramPilot version metadata
consistently whenever an issue closes. The workflow should make Issue Versions
explicit so each post-54 issue advances the repository by one version until the
v0.2.0 Public Alpha Release.

## Acceptance criteria

- [x] A version bump script or command updates the shared DiagramPilot version
      across public package manifests, exact internal package dependencies,
      lockfile metadata, and `packages/core/src/version.ts`.
- [x] A version consistency check fails when any public package version,
      internal dependency version, lockfile package version, or runtime
      DiagramPilot version drifts from the expected release version.
- [x] The workflow documents that issues 55 through 61 are Pre-Alpha Releases
      and issue 62 is the `0.2.0` Public Alpha Release.
- [x] The workflow documents that issue closeout includes a version bump,
      refreshed version-sensitive artifacts, validation results, and local
      issue status updates.
- [x] Demo SVG provenance is refreshed or explicitly validated whenever
      DiagramPilot version metadata changes.
- [x] Existing CLI `--version`, SVG provenance, and repo workflow freshness
      behavior remain current with the bumped version.
- [x] Tests cover success and failure cases for version consistency.

## Blocked by

- None.

## Validation plan

```bash
npm run build
npm test
node scripts/check-release-version.mjs
cd demo-projects/checkout && node ../../packages/cli/dist/index.js check
git diff --check
```

## Implementation notes

- Added `scripts/bump-release-version.mjs` and
  `scripts/check-release-version.mjs`, with root npm aliases
  `release:bump` and `check:release-version`.
- Bumped the repository to Issue Version `0.1.1` across root, public package,
  and private workspace manifests; exact internal package dependencies;
  `package-lock.json`; and `packages/core/src/version.ts`.
- Added `docs/development/release-version-workflow.md` and linked it from
  `docs/development/roadmap.md` and `AGENTS.md`.
- Refreshed `demo-projects/checkout/docs/architecture.svg` through the built
  CLI so SVG provenance records DiagramPilot `0.1.1`.
- Updated actual CLI and provenance tests to assert against the runtime
  DiagramPilot version instead of a stale hardcoded release value.

## Validation results

```bash
node --test --test-concurrency=1 test/release-version-tooling.test.mjs
npm run build
npm test
node scripts/check-release-version.mjs
cd demo-projects/checkout && node ../../packages/cli/dist/index.js check
git diff --check
```

- `node --test --test-concurrency=1 test/release-version-tooling.test.mjs`
  passed with 4 tests.
- `npm run build` passed.
- `npm test` passed with 137 tests.
- `node scripts/check-release-version.mjs` passed at `0.1.1`.
- `cd demo-projects/checkout && node ../../packages/cli/dist/index.js check`
  passed.
- `git diff --check` passed.
