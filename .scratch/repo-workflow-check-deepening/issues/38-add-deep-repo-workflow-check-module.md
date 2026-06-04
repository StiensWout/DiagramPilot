Status: completed

# Add deep Repo Workflow Check module

## Parent

- [PRD](../PRD.md)

## What to build

Add a deep Repo Workflow Check module that owns the read-only lifecycle from
Check Scope to aggregate check result. The module should handle discovery,
validated DiagramSpec loading, Expected SVG Artifact derivation, provenance-only
SVG Artifact Freshness evaluation, failure classification, and per-source result
construction.

The module should expose a small interface that command planning, tests, and
future adapters can use without reconstructing Repo Workflow Check internals.
It must preserve ADR-0007: `check` remains separate from `validate`, read-only,
and provenance-only.

## Acceptance criteria

- [x] Repo Workflow Check can evaluate the current working directory scope.
- [x] Repo Workflow Check can evaluate an explicit directory Check Scope.
- [x] Repo Workflow Check can evaluate one explicit DiagramPilot Source File Check Scope.
- [x] Repo Workflow Check returns a successful no-op for directory scopes with no DiagramPilot Source Files.
- [x] Repo Workflow Check returns command-style discovery failures for missing or unsupported Check Scopes.
- [x] Repo Workflow Check returns aggregate per-source results for fresh, invalid, missing artifact, malformed artifact, missing provenance, unreadable artifact, and stale artifact states.
- [x] Invalid sources include repairable validation errors and unchecked artifact state.
- [x] Fresh sources include artifact path and provenance details.
- [x] Stale sources include artifact path, reason names, expected provenance, and actual provenance.
- [x] The module produces no write intent and performs no rendering.
- [x] Tests cover the Repo Workflow Check module directly as the highest non-process seam.

## Blocked by

- [37 Check SVG Artifact Freshness from validated source context](./37-check-svg-artifact-freshness-from-validated-source-context.md)

## Implementation notes

- Added a core Repo Workflow Check module with a small public
  `checkDiagramPilotRepoWorkflow` interface and a dependency-backed
  `checkDiagramPilotRepoWorkflowWithDependencies` seam for direct module tests
  and future adapters.
- The module now owns discovery, validated DiagramSpec loading, Expected SVG
  Artifact derivation through SVG Artifact Freshness, source display path
  derivation, repairable validation diagnostics, per-source result construction,
  and aggregate summary counts.
- Directory, current working directory, and explicit source-file scopes are
  supported without rendering or write intents.
- Discovery failures return command-style failures, while valid discovery
  results retain all checked sources with typed artifact states.

## Validation plan

- `npm run build && node --test test/repo-workflow-check.test.mjs`
- `npm test`
- `cd demo-projects/checkout && node ../../packages/cli/dist/index.js check`
- `cd demo-projects/checkout && node ../../packages/cli/dist/index.js check --json`

## Validation performed

- `npm run build && node --test test/repo-workflow-check.test.mjs` passed.
- `npm test` passed 95 tests.
- `cd demo-projects/checkout && node ../../packages/cli/dist/index.js check`
  passed.
- `cd demo-projects/checkout && node ../../packages/cli/dist/index.js check --json`
  passed.
