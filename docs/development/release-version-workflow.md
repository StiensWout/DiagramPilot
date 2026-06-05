# Release Version Workflow

DiagramPilot Issue Versions are release versions assigned to implementation
issue closeout in the Public Alpha Release track.

## Issue Version Schedule

Issues 55 through 61 are Pre-Alpha Releases:

| Issue | Issue Version | Release type |
| --- | --- | --- |
| 55 | `0.1.1` | Pre-Alpha Release |
| 56 | `0.1.2` | Pre-Alpha Release |
| 57 | `0.1.3` | Pre-Alpha Release |
| 58 | `0.1.4` | Pre-Alpha Release |
| 59 | `0.1.5` | Pre-Alpha Release |
| 60 | `0.1.6` | Pre-Alpha Release |
| 61 | `0.1.7` | Pre-Alpha Release |

Issue 62 is `0.2.0`, the first Public Alpha Release.

## Version Tooling

Run the bump command from the repository root with the issue's assigned Issue
Version:

```bash
node scripts/bump-release-version.mjs <issue-version>
```

The bump command updates:

- Root, public package, and private workspace manifest versions.
- Exact internal dependencies between packages in the Public Package Set.
- Matching package-lock package versions and internal dependency versions.
- `packages/core/src/version.ts`.

Run the consistency check before closeout:

```bash
node scripts/check-release-version.mjs
```

The check uses the root `package.json` version as the expected version by
default. Release automation may pass an explicit version:

```bash
node scripts/check-release-version.mjs <expected-version>
```

The check fails if a public package version, private workspace version, exact
internal package dependency, lockfile package version, lockfile internal
dependency, or runtime DiagramPilot version drifts.

Run the package readiness check whenever release licensing or package publish
metadata changes:

```bash
npm run check:package-readiness
```

The package readiness check validates MIT license metadata, private workspace
boundaries, public package repository/homepage/bugs/keywords/publish settings,
package-local MIT license files, and `npm pack --dry-run` output for the Public
Package Set.

## Closeout

Issue closeout includes:

1. Confirm the local issue file has the assigned `Issue Version`.
2. Run `node scripts/bump-release-version.mjs <issue-version>`.
3. Run `npm run build` so CLI and package dist files carry the bumped runtime
   version.
4. Refresh version-sensitive artifacts. The checkout demo SVG must be rendered
   whenever DiagramPilot version metadata changes because SVG provenance
   includes `diagramPilotVersion`:

   ```bash
   cd demo-projects/checkout
   node ../../packages/cli/dist/index.js render docs/architecture.dp.yaml --out docs/architecture.svg
   node ../../packages/cli/dist/index.js check
   ```

5. Run and record validation results for the issue's validation plan.
6. Run `npm run check:package-readiness` when package publish metadata,
   licensing, or tarball boundaries are in scope.
7. Update the local issue file with completed acceptance criteria,
   implementation notes, validation results, and `Status: completed`.

If a version metadata change does not alter a version-sensitive artifact, record
the explicit validation result in the issue implementation notes.
