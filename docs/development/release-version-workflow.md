# Release Version Workflow

DiagramPilot Issue Versions are release versions assigned to implementation
issue closeout. Each implementation issue that merges to `main` should produce
an Issue Release with its assigned version. PRD-scoped milestones, such as
`0.3.0`, can use intermediate Issue Releases for individual issues and reserve
the milestone version for the final closeout release where the scoped feature
set is fully functional for that release line. For the v0.3.0 Alpha Capability
Release, individual scoped issues should use `0.2.x` Issue Versions and
`0.3.0` should be reserved for PRD closeout.

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

The v0.3.0 Alpha Capability Release train starts after `0.2.0`. Its
implementation issues are Issue Releases with assigned `0.2.x` Issue Versions,
and its final closeout issue reserves `0.3.0` for the complete scoped release.
Issue 64 is `0.2.1`, the Release Operations foundation Issue Release.

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
npm publish --workspace @diagrampilot/export-dot --tag prealpha --access public
npm publish --workspace @diagrampilot/render-svg --tag prealpha --access public
```

Run the publish commands only from an authenticated npm account that owns the
`diagrampilot` package name and `@diagrampilot` scope.

## GitHub Release Notes

Each Issue Release needs reviewed release notes in a GitHub Release draft. The
draft body is generated from the completed local issue closeout fields and is
reviewed on GitHub; generated release-note files are not committed and are not
written under `.scratch/`.

Preview the draft body locally from the completed issue file after the issue has
`Status: completed`, the assigned `Issue Version`, implementation notes, and
validation results:

```bash
node scripts/generate-release-notes.mjs \
  --issue .scratch/v0-3-0-alpha-capability-release/issues/64-release-ops-foundation-and-github-releases.md \
  --version 0.2.1 \
  --tag v0.2.1 > "$TMPDIR/diagrampilot-v0.2.1-release-notes.md"
```

Do not commit that temporary file. Do not manually create the GitHub Release
draft before the workflow creates the release tag; GitHub release creation can
also create or bind a tag, and DiagramPilot's release workflow must create
`vX.Y.Z` only after npm `latest` publish succeeds. The workflow generates the
same draft body from `.scratch/`, creates or updates the GitHub Release draft
after tag creation, and then waits at the `github-release-publication`
environment before publishing. Configure that environment with required
reviewers so maintainers can review and, if needed, edit the GitHub Release
draft body before approving publication.

The reviewed draft must keep the generated version and tag metadata lines:
`# DiagramPilot vX.Y.Z`, `Issue Version: X.Y.Z`, and `Tag: vX.Y.Z`. The release
workflow validates that reviewed draft before publishing the GitHub Release:

```bash
gh release view v0.2.1 --json tagName,name,body,isDraft,isPrerelease > "$TMPDIR/diagrampilot-v0.2.1-draft.json"
node scripts/validate-github-release-draft.mjs \
  --draft-json "$TMPDIR/diagrampilot-v0.2.1-draft.json" \
  --version 0.2.1 \
  --tag v0.2.1
```

## Release Automation

`.github/workflows/release.yml` is the guarded package and GitHub Release
workflow. Its `validate-release` job runs the same release validation suite as
branch and pull request CI before any CD side effect: dependency install,
release-version consistency, root build and tests, schema drift generation,
website build/tests, checkout demo render plus `diagrampilot check`, Public
Package Set readiness, and package publish dry-runs. GitHub-hosted release
automation does not run the website visual quality check because that check can
create runner-specific font-cache noise; keep visual review as a local/manual
validation step when changing landing page or docs presentation.

The workflow uses `scripts/plan-release-publish.mjs` to select one publish
plan from the GitHub event:

- Trusted pushes to `issue-*` branches publish unique prerelease package
  versions under the `nightly` dist-tag.
- Pull requests perform validation and npm publish dry-runs only, including
  same-repository pull requests.
- `workflow_dispatch` runs perform manual dry-run validation only.
- Trusted pushes to `main` publish the clean shared Issue Version under the
  `latest` dist-tag.

Nightly versions are derived from the shared Issue Version plus GitHub run
identity: `<issue-version>-nightly.<run-number>.<run-attempt>.<short-sha>`.
This keeps npm's immutable clean Issue Version available for the merged
`latest` publish.

Nightly branch publishes skip GitHub Releases. They only publish npm prerelease
packages under the `nightly` dist-tag after `validate-release` succeeds.
Pull requests and manual runs stay dry-run only.

The `publish-packages` job is the only npm side-effect job. It needs
`validate-release`, checks out the same `${{ github.sha }}` release commit,
verifies the intended Issue Version with
`npm run check:release-version -- "$RELEASE_PUBLISH_VERSION"`, rebuilds package
artifacts, reruns package readiness, and then publishes the Public Package Set.
For trusted `main` pushes, GitHub Release publication only starts after npm `latest` publish succeeds for that same Issue Version.
If the complete Public Package Set already publishes that Issue Version under
`latest`, the workflow treats package publishing as idempotently complete and
continues to GitHub Release draft preparation instead of retrying immutable npm
versions.

The `prepare-github-release-draft` job runs only for `latest` releases after
package publish succeeds. It checks out the same release commit, verifies the
intended Issue Version again, creates `vX.Y.Z` for that commit, generates the
GitHub Release draft body with `scripts/generate-release-notes.mjs`, creates or
updates the GitHub Release draft, and validates the generated draft shape.

The `publish-github-release` job needs the draft preparation job and uses the
`github-release-publication` environment as the maintainer review point. After
that review, it validates the reviewed GitHub Release draft again with
`scripts/validate-github-release-draft.mjs` and then publishes the matching
GitHub Release draft. The workflow fails before GitHub Release publication when
the reviewed draft is missing, empty, still mismatched with the version or tag,
not a draft, or marked as a prerelease.

Release publishing uses npm trusted publishing through GitHub OIDC rather than
a long-lived npm token. The workflow grants `id-token: write`, configures
`actions/setup-node` with `registry-url: https://registry.npmjs.org`, and does
not set `NODE_AUTH_TOKEN`; npm automatically generates provenance for trusted
publishes.

Real publish is disabled until the repository variable
`DIAGRAMPILOT_NPM_PUBLISH_ENABLED` is set to `true`. Keep the variable unset
while reviewing the workflow or before npm trusted publishers exist; the
workflow still runs validation and package publish dry-runs. After setup,
trusted `issue-*` branch pushes publish `nightly`, pull requests stay dry-run
only, and trusted `main` pushes publish `latest`.

After a clean public release publishes under `latest`, verify all Public
Package Set dist-tags point at the shared workspace version:

```bash
npm run check:package-publish-state -- --expect latest
```

Configure a trusted publisher in npm for each package in the Public Package Set
with repository `StiensWout/DiagramPilot`, workflow
`.github/workflows/release.yml`, and the package's public name:

```text
diagrampilot
@diagrampilot/core
@diagrampilot/icons
@diagrampilot/export-mermaid
@diagrampilot/export-d2
@diagrampilot/export-dot
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
7. Preview release notes with `scripts/generate-release-notes.mjs` into a
   temporary file if desired. Do not commit generated release-note files and do
   not write them under `.scratch/`. The workflow creates or updates the GitHub
   Release draft after npm `latest` and tag creation; review the draft body in
   GitHub before approving the `github-release-publication` environment.
8. Update the local issue file with completed acceptance criteria,
   implementation notes, validation results, and `Status: completed`.

If a version metadata change does not alter a version-sensitive artifact, record
the explicit validation result in the issue implementation notes.
