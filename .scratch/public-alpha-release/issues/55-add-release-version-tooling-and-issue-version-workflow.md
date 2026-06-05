Status: ready-for-agent
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

- [ ] A version bump script or command updates the shared DiagramPilot version
      across public package manifests, exact internal package dependencies,
      lockfile metadata, and `packages/core/src/version.ts`.
- [ ] A version consistency check fails when any public package version,
      internal dependency version, lockfile package version, or runtime
      DiagramPilot version drifts from the expected release version.
- [ ] The workflow documents that issues 55 through 61 are Pre-Alpha Releases
      and issue 62 is the `0.2.0` Public Alpha Release.
- [ ] The workflow documents that issue closeout includes a version bump,
      refreshed version-sensitive artifacts, validation results, and local
      issue status updates.
- [ ] Demo SVG provenance is refreshed or explicitly validated whenever
      DiagramPilot version metadata changes.
- [ ] Existing CLI `--version`, SVG provenance, and repo workflow freshness
      behavior remain current with the bumped version.
- [ ] Tests cover success and failure cases for version consistency.

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

- Fill in after implementation.
