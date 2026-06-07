Status: completed
Issue Version: 0.2.2

# Add DOT export

## Parent

- [PRD](../PRD.md)

## What to build

Add DOT as an exported artifact through `diagrampilot export <path> --format
dot`. DOT should follow the existing export contract: stdout by default,
explicit file writes only with `--out`, and repairable diagnostics for invalid
input.

The output should use `digraph`, encode undirected edges with `dir=none`, and
represent groups as Graphviz clusters where practical without adding
Graphviz-specific DiagramSpec semantics.

## User stories covered

- 11-14

## Acceptance criteria

- [x] `diagrampilot export <source> --format dot` writes DOT to stdout.
- [x] `diagrampilot export <source> --format dot --out <path>` writes DOT only
      when the user explicitly provides `--out`.
- [x] DOT output uses `digraph`.
- [x] Undirected DiagramSpec edges are emitted with `dir=none`.
- [x] Groups are emitted as Graphviz clusters where practical.
- [x] Labels, Stable IDs, and metadata-derived output are escaped safely for
      valid DOT.
- [x] Existing Mermaid and D2 export behavior remains unchanged.
- [x] Invalid sources and unsupported options return repairable diagnostics.
- [x] Tests cover stdout output, explicit writes, directed edges, undirected
      edges, group clusters, escaping, and existing export formats.

## Blocked by

None - can start immediately.

## Validation plan

```bash
npm test
node packages/cli/dist/index.js export demo-projects/checkout/docs/architecture.dp.yaml --format dot
npm run check:release-version -- 0.2.2
npm run check:package-readiness
npm publish --dry-run --workspace diagrampilot --tag latest --access public
git diff --check
```

## Implementation notes

- Added `@diagrampilot/export-dot` as a public workspace package with source,
  built package output, package metadata, README, license, TypeScript project
  references, lockfile metadata, and release/package readiness coverage.
- Wired `diagrampilot export <path> --format dot` through the existing command
  planning seam, preserving stdout-by-default behavior and explicit file writes
  only through `--out`.
- Implemented DOT output with `digraph`, DiagramSpec `direction` to Graphviz
  `rankdir`, quoted DOT IDs, DOT-safe quoted labels, directed edges, and
  undirected DiagramSpec edges as directed DOT edges with `dir=none`.
- Rendered DiagramSpec groups as Graphviz `cluster_<stable_id>` subgraphs using
  the existing DiagramSpec topology seam, including nested groups and root
  nodes.
- Mapped existing metadata keys to DOT attributes where useful:
  `metadata.external_url` becomes `URL`, and `metadata.source` becomes
  `tooltip`, using the same escaping path as labels.
- Updated public docs, maintainer docs, demo docs, release workflow matrices,
  package readiness checks, package publish-state checks, and docs drift tests
  to treat DOT as a shipped export target and `@diagrampilot/export-dot` as a
  public package.
- Created the `@diagrampilot/export-dot` package on npm from an authenticated
  passkey-backed CLI publish so npm trusted publishing can be configured for
  the package. The package is visible at `0.2.1`; npm reported both
  `prealpha` and `latest` dist-tags pointing at `0.2.1` after the first
  publish.
- Confirmed npm trusted publishing was configured for `@diagrampilot/export-dot`
  with repository `StiensWout/DiagramPilot` and workflow
  `.github/workflows/release.yml`, matching the other public packages.
- Diagnosed the post-PR release dry-run failure as stale shared release
  metadata: the workflow tried to publish already-published
  `diagrampilot@0.2.1` on `main`. Bumped the shared DiagramPilot release
  metadata to `0.2.2` with `scripts/bump-release-version.mjs` and refreshed
  checkout demo SVG provenance at the new version.

## npm package reservation

```bash
npm whoami
npm run build
npm run check:release-version
npm run check:package-readiness
npm publish --workspace @diagrampilot/export-dot --tag prealpha --access public --auth-type=web
npm view @diagrampilot/export-dot@0.2.1 version dist-tags --json --registry=https://registry.npmjs.org/
```

## Validation results

- `npm run build` passed.
- `node --test test/export-dot.test.mjs test/cli-command-planning.test.mjs test/cli-command-planning-seam.test.mjs test/cli-smoke.test.mjs test/documentation-contract.test.mjs test/docs-public-boundary.test.mjs test/package-readiness.test.mjs test/package-publish-state.test.mjs test/github-actions-release.test.mjs test/release-version-tooling.test.mjs`
  passed: 86 tests.
- `npm test` passed: 173 tests.
- `node packages/cli/dist/index.js export demo-projects/checkout/docs/architecture.dp.yaml --format dot`
  passed and printed DOT with `digraph`, nested clusters, labels, and metadata
  tooltips.
- `npm whoami` passed as `stienswout`.
- `npm publish --workspace @diagrampilot/export-dot --tag prealpha --access public --auth-type=web`
  passed after browser passkey authentication.
- `npm view @diagrampilot/export-dot@0.2.1 version dist-tags --json --registry=https://registry.npmjs.org/`
  passed and returned version `0.2.1` with `prealpha` and `latest` dist-tags.
- `npm run check:release-version -- 0.2.2` passed.
- `npm publish --dry-run --workspace diagrampilot --tag latest --access public`
  passed for `diagrampilot@0.2.2`, matching the release job command that had
  failed at `0.2.1`.
- `npm publish --dry-run --workspace <package> --tag latest --access public`
  passed for all public workspaces: `diagrampilot`, `@diagrampilot/core`,
  `@diagrampilot/icons`, `@diagrampilot/export-mermaid`,
  `@diagrampilot/export-d2`, `@diagrampilot/export-dot`, and
  `@diagrampilot/render-svg`.
- `node scripts/generate-release-notes.mjs --version 0.2.2 --tag v0.2.2`
  passed.
- `git diff --check` passed.
