Status: ready-for-agent
Issue Version: 0.2.14

# Fallow duplicate-code cleanup and MCP version sync fix

## Parent

- [PRD](../PRD.md)

## What to build

Eliminate the existing Fallow duplicate-code baseline before v0.3.0 closeout.
This is an intentional tech-debt reduction issue, not feature work. The goal is
for duplicate-code findings to be fixed through real refactors so the Fallow
dupes baseline no longer parks repository debt.

Current baseline target: `fallow-baselines/dupes.json` contains 65 clone groups.

Also fix the MCP package release-version bug observed during update: the
Node.js-facing `@diagrampilot/mcp` version must change when DiagramPilot release
metadata is synced for the issue, and the MCP server runtime must report the
same synced version.

## Acceptance criteria

- Resolve every existing clone group represented in
  `fallow-baselines/dupes.json`.
- Refresh `fallow-baselines/dupes.json` so it has no remaining clone groups, or
  update the Fallow gate to run without a duplicate-code debt baseline.
- Preserve public behavior for CLI, core, MCP, website, and generated artifact
  workflows.
- Prefer shared helpers, focused module extraction, or clearer test fixtures
  over broad formatting churn.
- Add or update regression coverage where extracted helpers or shared fixtures
  carry behavior that was previously duplicated inline.
- Do not add broad duplicate-code suppressions. A narrow `.fallowrc.jsonc`
  exception is only acceptable for a documented static-analysis limitation that
  cannot be fixed by code structure.
- Reproduce the MCP version bug with a deterministic local check before fixing
  it.
- `npm run sync:issue-release-version -- --issue
  .scratch/v0-3-0-alpha-capability-release/issues/76-fallow-duplicate-code-cleanup.md`
  updates the `@diagrampilot/mcp` Node.js package metadata and package-lock
  metadata to `0.2.14`.
- The built MCP server runtime reports the synced DiagramPilot version through
  the MCP stdio initialization/server-info surface, not a stale previous
  version.
- Both launch paths keep working after the fix:
  `node packages/cli/dist/index.js mcp --help` and
  `node packages/mcp/dist/index.js --help`.
- Add regression coverage that fails if the MCP package version or MCP runtime
  server version drifts from the synced Issue Version.

Acceptance progress as of 2026-06-10:

- MCP package metadata sync is covered and passing for `@diagrampilot/mcp`.
- Release metadata, package-lock metadata, and built CLI/MCP help paths validate
  at `0.2.14`.
- Duplicate-code helper extractions reduced some test duplication, but the
  acceptance criterion to remove the duplicate-code debt baseline remains open.

## Implementation notes

- Duplicate cleanup may touch CLI, core, tests, website, and scripts.
- Treat test duplication as real debt when shared test helpers can remove it
  without making individual tests harder to read.
- Keep unrelated public contract changes out of this issue.
- The MCP version bug fix is included in this issue by user direction even
  though the main cleanup target is duplicate-code debt.
- 2026-06-10 implementation update:
  - Synced release metadata to Issue Version `0.2.14`; `packages/mcp/package.json`
    now reports `0.2.14` alongside the CLI/core/workspace packages.
  - Added release tooling regression coverage so the fixture includes
    `packages/mcp/package.json`.
  - Extracted small test helpers for repeated YAML repair-hint assertions, MCP
    mutation no-write failure assertions, and SVG freshness fixture setup.
  - Fallow duplicate gates pass against the existing baseline, but live
    no-baseline duplicate analysis still reports residual test clone groups.
    The duplicate baseline is therefore not eliminated in this update.

## Validation plan

```bash
npm test
npm run sync:issue-release-version -- --issue .scratch/v0-3-0-alpha-capability-release/issues/76-fallow-duplicate-code-cleanup.md
npm run check:issue-release-version -- --issue .scratch/v0-3-0-alpha-capability-release/issues/76-fallow-duplicate-code-cleanup.md
node packages/cli/dist/index.js mcp --help
node packages/mcp/dist/index.js --help
npm run audit:fallow:dupes
npm run audit:fallow
npm run audit:fallow:changed
git diff --check
```

Validation performed 2026-06-10:

- `node --test --test-concurrency=1 test/svg-artifact-freshness.test.mjs`
  passed.
- `node --test --test-concurrency=1 test/mcp-source-mutation.test.mjs`
  passed.
- `node --test --test-concurrency=1 test/release-version-tooling.test.mjs`
  passed after the MCP package fixture regression was added.
- `npm run sync:issue-release-version -- --issue .scratch/v0-3-0-alpha-capability-release/issues/76-fallow-duplicate-code-cleanup.md`
  passed and synced metadata to `0.2.14`.
- `npm run check:issue-release-version -- --issue .scratch/v0-3-0-alpha-capability-release/issues/76-fallow-duplicate-code-cleanup.md`
  passed.
- `node packages/cli/dist/index.js mcp --help` passed.
- `node packages/mcp/dist/index.js --help` passed.
- `npm test` passed 248 tests.
- `npm run audit:fallow:dupes` passed with baseline output.
- `npm run audit:fallow` passed with baseline output.
- `npm run audit:fallow:changed` passed with baseline output.
- `git diff --check` passed.
