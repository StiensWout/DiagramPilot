# Release Version Workflow

This guide describes the current DiagramPilot release workflow. It is channel
based: issue work can produce frequent nightly builds, while stable npm
`latest` and the final GitHub Release are reserved for an explicit maintainer
milestone release.

## Release Channels

| Channel | Trigger | Publishes npm | GitHub Release | Purpose |
| --- | --- | --- | --- | --- |
| Pull request | PR to `main` | No, dry-run only | None | Validate changes before merge. |
| Feature nightly | Trusted push to `feature/**` | `nightly` | Prerelease | Make issue work installable without moving stable users. |
| Main validation | Trusted push to `main` | No, validation only | None | Prove the merged release candidate still passes. |
| Manual dry-run | `workflow_dispatch`, `release_kind=dry-run` | No, dry-run only | None | Exercise the final release path before publishing. |
| Milestone release | `workflow_dispatch`, `release_kind=milestone` | `latest` | Reviewed final release | Publish the stable milestone after closeout. |

Do not create one stable release per issue. Use nightlies during issue work and
one milestone release when the scoped work is complete.

Channel behavior in prose: Trusted pushes to `feature/**` branches publish
unique nightly package versions under the `nightly` dist-tag and create GitHub
prereleases. Pull requests perform validation and npm publish dry-runs only.
Trusted pushes to `main` validate release candidates without publishing.
Manual milestone dispatches publish npm `latest`, prepare a GitHub Release
draft, and wait for maintainer review.

## Version Metadata

The root `package.json` version is the canonical release version. The same
version must be reflected in the public packages, private workspace manifests,
exact internal package dependencies, `package-lock.json`, and
`packages/core/src/version.ts`.

Check release metadata before closeout:

```bash
npm run check:release-version
```

Update release metadata when preparing a milestone version:

```bash
node scripts/bump-release-version.mjs <version>
```

The bump command updates workspace manifests, package-lock metadata, internal
workspace dependency versions, and the runtime DiagramPilot version constant.
Use a plain stable version for milestone releases, for example `X.Y.Z`.

`npm run check:issue-release-version` and
`npm run sync:issue-release-version` are legacy compatibility helpers for the
old local issue release train. They are not part of the current CI/CD release
path and should not be used for new milestone releases.

## CI/CD Workflow

`.github/workflows/ci.yml` validates ordinary PR and branch work. It does not
publish packages or create releases.

`.github/workflows/release.yml` is the guarded release workflow. Its
`validate-release` job runs release validation before any side effect:
dependency install, release-version consistency, root build and tests, schema
drift generation, website build/tests, checkout demo render plus
`diagrampilot check`, Public Package Set readiness, and package publish
dry-runs.

The workflow uses `scripts/plan-release-publish.mjs` to choose the channel from
the GitHub event. Real npm publish is disabled unless the repository variable
`DIAGRAMPILOT_NPM_PUBLISH_ENABLED` is set to `true`.

Release publishing uses npm trusted publishing through GitHub OIDC. Each public
package needs npm trusted publisher setup for this GitHub repository and release
workflow. Keep using `actions/setup-node` with
`registry-url: https://registry.npmjs.org` and `id-token: write`; do not add
long-lived `NPM_TOKEN` or `NODE_AUTH_TOKEN` secrets to the release workflow.

## Nightly Builds

A trusted push to `feature/**` publishes a unique prerelease version to npm with
the `nightly` dist-tag after validation passes. The nightly version format is:

```text
<base-version>-nightly.<run-number>.<run-attempt>.<short-sha>
```

Nightly GitHub releases must be marked as prereleases. Their notes stay compact:
version, tag, branch, commit, workflow run, validation status, and npm package
links.

Nightly branch publishes create GitHub prereleases. The milestone release flow starts final GitHub Release draft preparation only after npm `latest` publish succeeds.

Nightlies must not move `latest`, publish the final milestone tag, or use the
polished milestone release-note format.

## Manual Milestone Release

Use the manual milestone release only after the scoped work is complete and the
closeout issue is ready.

1. Confirm the intended stable version is in release metadata.
2. Run local validation that matches the risk of the change, including
   `npm test` and `npm run audit:fallow`.
3. Open the `Release` workflow in GitHub Actions.
4. Run `workflow_dispatch` with `release_kind=milestone`.
5. Set `version` to the stable release version. It must match `package.json`.
6. Set `milestone` to the release milestone name.
7. Set `previous_tag` when a full changelog comparison is available.
8. Fill `highlights`, `breaking_changes`, and `upgrade_notes` with reviewed
   Markdown. Use `None.` when a required section has no entries.
9. Let the workflow publish npm `latest`, create the release tag, and prepare
   the GitHub Release draft.
10. Review and edit the draft in GitHub if needed.
11. Approve the `github-release-publication` environment to publish the final
    GitHub Release.
12. Verify npm package state, GitHub release state, and the Linear closeout
    issue.

The final GitHub Release must not be marked as a prerelease.

## Release Notes

Final milestone release notes are generated from merged PRs and maintainer
inputs, not from `.scratch` issue files:

```bash
node scripts/generate-release-notes.mjs \
  --kind final \
  --version <version> \
  --tag v<version> \
  --milestone <milestone> \
  --previous-tag <previous-tag> \
  --prs-json <merged-prs.json> \
  --highlights-file <highlights.md> \
  --breaking-changes-file <breaking-changes.md> \
  --upgrade-notes-file <upgrade-notes.md>
```

The final release body must keep these sections:

- Highlights
- What's Changed
- Breaking Changes
- Upgrade Notes
- Packages
- Full Changelog

The generated body should include package links for the Public Package Set and
should preserve Linear issue identifiers when they appear in PR titles or
branch names.

Validate reviewed GitHub Release drafts before publication:

```bash
gh release view v<version> --json tagName,name,body,isDraft,isPrerelease \
  > "$TMPDIR/diagrampilot-release-draft.json"
node scripts/validate-github-release-draft.mjs \
  --draft-json "$TMPDIR/diagrampilot-release-draft.json" \
  --version <version> \
  --tag v<version>
```

Generate compact nightly prerelease notes with:

```bash
node scripts/generate-release-notes.mjs \
  --kind nightly \
  --version <nightly-version> \
  --tag v<nightly-version> \
  --branch <branch> \
  --commit <sha> \
  --run-url <workflow-run-url>
```

Generated release-note files are temporary workflow artifacts. Do not commit
them and do not write them under `.scratch/`.

## Package Checks

The Public Package Set is:

- `diagrampilot`
- `@diagrampilot/core`
- `@diagrampilot/icons`
- `@diagrampilot/export-mermaid`
- `@diagrampilot/export-d2`
- `@diagrampilot/export-dot`
- `@diagrampilot/mcp`
- `@diagrampilot/render-svg`

Run the package readiness check whenever package metadata, licensing, publish
boundaries, or package contents change:

```bash
npm run check:package-readiness
```

Before an initial public publish, verify package-name availability:

```bash
npm run check:package-publish-state -- --expect available
```

After stable publication, verify that the Public Package Set is published under
`latest`:

```bash
npm run check:package-publish-state -- --expect latest
```

For MCP package changes, MCP smoke validation should cover both launch surfaces:

```bash
diagrampilot mcp --help
diagrampilot-mcp --help
```

MCP client configuration should prefer the main command:

```json
{
  "mcpServers": {
    "diagrampilot": {
      "command": "diagrampilot",
      "args": ["mcp"]
    }
  }
}
```

## Closeout Checklist

Before closing a release issue or publishing a milestone:

- Release metadata is consistent with `npm run check:release-version`.
- Root tests pass with `npm test`.
- Fallow passes with `npm run audit:fallow`.
- Changed-code Fallow review passes when preparing a PR:
  `npm run audit:fallow:changed`.
- Package readiness passes when package metadata or contents changed.
- Nightly builds, when used, are marked as GitHub prereleases.
- The final milestone release draft has the required release-note sections.
- The final release is not a prerelease.
- npm package dist-tags are verified after publication.
- The Linear closeout issue records validation results and release links.
