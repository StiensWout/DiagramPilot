# Release Version Workflow

DiagramPilot Issue Versions are release versions assigned to implementation
issue closeout in the Public Alpha Release track.

## Issue Version Schedule

Issues 55 through 61 and issue 63 are Pre-Alpha Releases:

| Issue | Issue Version | Release type |
| --- | --- | --- |
| 55 | `0.1.1` | Pre-Alpha Release |
| 56 | `0.1.2` | Pre-Alpha Release |
| 57 | `0.1.3` | Pre-Alpha Release |
| 58 | `0.1.4` | Pre-Alpha Release |
| 59 | `0.1.6` | Pre-Alpha Release |
| 60 | `0.1.7` | Pre-Alpha Release |
| 61 | `0.1.8` | Pre-Alpha Release |
| 63 | `0.1.9` | Pre-Alpha Release |

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
default. Release automation may pass an explicit version, including the
ephemeral nightly prerelease version used for package publish metadata:

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

Run the package publish-state check before the first pre-alpha publish to prove
the package names are still available on the public npm registry:

```bash
npm run check:package-publish-state -- --expect available
```

After a maintainer with npm ownership publishes the Public Package Set under the
`prealpha` dist-tag, rerun the publish-state check to prove the package names
are reserved and `latest` was not moved:

```bash
npm run check:package-publish-state -- --expect prealpha
```

The pre-alpha publish commands are:

```bash
npm publish --workspace diagrampilot --tag prealpha --access public
npm publish --workspace @diagrampilot/core --tag prealpha --access public
npm publish --workspace @diagrampilot/icons --tag prealpha --access public
npm publish --workspace @diagrampilot/export-mermaid --tag prealpha --access public
npm publish --workspace @diagrampilot/export-d2 --tag prealpha --access public
npm publish --workspace @diagrampilot/render-svg --tag prealpha --access public
```

Run the publish commands only from an authenticated npm account that owns the
`diagrampilot` package name and `@diagrampilot` scope.

## Release Automation

`.github/workflows/release.yml` is the guarded package release workflow. It
runs the same release validation suite as branch and pull request CI before any
publish step: dependency install, release-version consistency, root build and
tests, schema drift generation, website build/tests, checkout demo render plus
`diagrampilot check`, and Public Package Set readiness. GitHub-hosted release
automation does not run the website visual quality check because that check can
create runner-specific font-cache noise; keep visual review as a local/manual
validation step when changing landing page or docs presentation.

The workflow uses `scripts/plan-release-publish.mjs` to select one publish
plan from the GitHub event:

- Trusted pushes to `issue-*` branches publish unique prerelease package
  versions under the `nightly` dist-tag.
- Trusted pull requests publish unique prerelease package versions under the
  `nightly` dist-tag.
- Fork pull requests and `workflow_dispatch` runs perform manual dry-run
  validation only.
- Trusted pushes to `main` publish the clean shared Issue Version under the
  `latest` dist-tag.

Nightly versions are derived from the shared Issue Version plus GitHub run
identity: `<issue-version>-nightly.<run-number>.<run-attempt>.<short-sha>`.
This keeps npm's immutable clean Issue Version available for the merged
`latest` publish.

Release publishing uses npm trusted publishing through GitHub OIDC rather than
a long-lived npm token. The workflow grants `id-token: write`, configures
`actions/setup-node` with `registry-url: https://registry.npmjs.org`, and does
not set `NODE_AUTH_TOKEN`; npm automatically generates provenance for trusted
publishes.

Real publish is disabled until the repository variable
`DIAGRAMPILOT_NPM_PUBLISH_ENABLED` is set to `true`. Keep the variable unset
while reviewing the workflow or before npm trusted publishers exist; the
workflow still runs validation and package publish dry-runs. After setup,
trusted `issue-*` and pull request runs publish `nightly`, and trusted `main`
pushes publish `latest`.

Configure a trusted publisher in npm for each package in the Public Package Set
with repository `StiensWout/DiagramPilot`, workflow
`.github/workflows/release.yml`, and the package's public name:

```text
diagrampilot
@diagrampilot/core
@diagrampilot/icons
@diagrampilot/export-mermaid
@diagrampilot/export-d2
@diagrampilot/render-svg
```

The workflow does not require Vercel or npm token secrets. Vercel remains the
Public Website production deployment path; release automation only validates
website output before package publish.

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
