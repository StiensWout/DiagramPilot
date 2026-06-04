Status: completed

# Check SVG Artifact Freshness from validated source context

## Parent

- [PRD](../PRD.md)

## What to build

Reshape SVG Artifact Freshness so Repo Workflow Check can evaluate an Expected
SVG Artifact from already loaded and validated DiagramPilot Source File context.
The freshness check should no longer independently reload and revalidate the
same source after Repo Workflow Check has already established source
correctness.

The existing public `check` behaviour should remain unchanged: invalid sources
skip artifact freshness, missing artifacts fail, stale artifacts fail, and fresh
artifacts pass.

## Acceptance criteria

- [x] Repo Workflow Check can pass validated DiagramPilot Source File context into SVG Artifact Freshness.
- [x] SVG Artifact Freshness can compute expected provenance from the supplied source context.
- [x] A discovered valid source is not loaded and validated twice during Repo Workflow Check.
- [x] Invalid DiagramPilot Source Files still produce unchecked artifact state.
- [x] Missing Expected SVG Artifacts still produce missing artifact state.
- [x] Fresh Expected SVG Artifacts still produce fresh state.
- [x] Stale Expected SVG Artifacts still produce stale state with reason names.
- [x] Existing text and JSON `diagrampilot check` output remains behaviourally unchanged.

## Blocked by

- [36 Add robust provenance shape validation](./36-add-robust-provenance-shape-validation.md)

## Implementation notes

- Added source `content` to validated DiagramPilot Source File context so
  downstream workflow code can reuse the exact loaded source text.
- Added `checkExpectedSvgArtifactFreshnessForValidatedSource` as the SVG
  Artifact Freshness entrypoint for already validated DiagramPilot Source
  Files.
- Kept `checkExpectedSvgArtifactFreshness` as the explicit-source entrypoint
  for direct callers; it still returns `unchecked` for invalid DiagramPilot
  Source Files.
- Updated `diagrampilot check` command planning to validate each discovered
  source once, pass the validated source context into freshness checking, and
  preserve existing text and JSON output shapes.
- Added focused coverage for validated-source freshness hashing, command
  planning delegation, and source content in validated load results.

## Validation plan

- `npm run build && node --test test/cli-command-planning.test.mjs`
- `npm run build && node --test test/svg-artifact-freshness.test.mjs`
- `npm run build && node --test test/validated-diagramspec-loading.test.mjs`
- `npm test`
- `cd demo-projects/checkout && node ../../packages/cli/dist/index.js check`
- `cd demo-projects/checkout && node ../../packages/cli/dist/index.js check --json`

## Validation performed

- `npm run build && node --test test/cli-command-planning.test.mjs` passed.
- `npm run build && node --test test/svg-artifact-freshness.test.mjs` passed.
- `npm run build && node --test test/validated-diagramspec-loading.test.mjs` passed.
- `npm test` passed 90 tests.
- `cd demo-projects/checkout && node ../../packages/cli/dist/index.js check`
  passed.
- `cd demo-projects/checkout && node ../../packages/cli/dist/index.js check --json`
  passed.
