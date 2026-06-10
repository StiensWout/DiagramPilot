Issue Version: 0.2.14
Status: completed
Labels: tech-debt

# Fallow duplicate-code cleanup and MCP version sync fix

## Summary

Eliminate the existing Fallow duplicate-code debt before v0.3.0 closeout, keep
dead-code and dependency analysis clean, and include the MCP package
release-version sync fix. This is cleanup work, not new product behavior.

## Acceptance Criteria

- [x] Resolve every existing Fallow duplicate-code finding represented by
  `fallow-baselines/dupes.json`.
- [x] Refresh `fallow-baselines/dupes.json` so no duplicate-code debt is
  accepted by baseline.
- [x] Keep Fallow dead-code findings clean.
- [x] Keep Fallow unlisted dependency findings clean.
- [x] Keep the MCP package release-version metadata aligned with DiagramPilot
  release metadata at `0.2.14`.
- [x] Validate package-facing MCP help paths still work.
- [x] Keep unrelated public contract changes out.

## Implementation Notes

- Synced release metadata to issue version `0.2.14`; the MCP package metadata
  now aligns with CLI/core/workspace package metadata.
- Added release tooling regression coverage for `packages/mcp/package.json`.
- Extracted shared test helpers for repeated CLI smoke planning, public docs,
  release workflow, DiagramSpec loading, repairable diagnostics, topology,
  MCP mutation, package readiness, publish-state, repo workflow, SVG freshness,
  and website guidance assertions.
- Restored consolidated repo-workflow helper exports used by generated artifact
  and workflow generation tests.
- Declared the internal workspace packages used by
  `test/render-svg-provenance.test.mjs` in the root dev dependencies so
  editor and file-scoped Fallow unlisted dependency diagnostics agree with the
  repo-level gate.
- Replaced the duplicate-code baseline with an empty `clone_groups` list after
  the direct no-baseline duplicate scan returned zero groups.

## Validation Plan And Results

- [x] `node --test --test-concurrency=1 test/svg-artifact-freshness.test.mjs`
  passed.
- [x] `node --test --test-concurrency=1 test/website-vercel-deployment-guidance.test.mjs`
  passed.
- [x] `node --test --test-concurrency=1 test/repo-workflow-configured-artifacts.test.mjs test/repo-workflow-generate.test.mjs`
  passed.
- [x] `node --test --test-concurrency=1 test/render-svg-provenance.test.mjs`
  passed.
- [x] `npm test` passed: 248 tests, 0 failures.
- [x] `npm run sync:issue-release-version -- --issue .scratch/v0-3-0-alpha-capability-release/issues/76-fallow-duplicate-code-cleanup.md`
  passed and confirmed release metadata at `0.2.14`.
- [x] `npm run check:issue-release-version -- --issue .scratch/v0-3-0-alpha-capability-release/issues/76-fallow-duplicate-code-cleanup.md`
  passed.
- [x] `node packages/cli/dist/index.js mcp --help` passed.
- [x] `node packages/mcp/dist/index.js --help` passed.
- [x] `npm run audit:fallow:dupes` passed with an empty duplicate baseline.
- [x] `npm run audit:fallow` passed.
- [x] `npm run audit:fallow:changed` passed.
- [x] Root `package.json` and `package-lock.json` now declare
  `@diagrampilot/core` and `@diagrampilot/render-svg` as dev dependencies for
  root tests that import those package names.
- [x] `./node_modules/.bin/fallow dupes --format compact --quiet --fail-on-issues`
  passed with no baseline.
- [x] `./node_modules/.bin/fallow dead-code --format compact --quiet --fail-on-issues`
  passed with no baseline.
- [x] `./node_modules/.bin/fallow dead-code --format compact --quiet --unlisted-deps --fail-on-issues`
  passed with no baseline.
- [x] `git diff --check` passed.
