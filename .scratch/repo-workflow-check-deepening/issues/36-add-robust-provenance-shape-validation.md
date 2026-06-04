Status: completed

# Add robust provenance shape validation

## Parent

- [PRD](../PRD.md)

## What to build

Make DiagramPilot provenance parsing reject malformed valid-JSON metadata
without throwing. SVG Artifact Freshness should classify missing required
provenance fields, non-string provenance fields, and missing renderer
name/version fields as malformed artifact evidence. Missing DiagramPilot
provenance should remain a distinct artifact state.

This slice should preserve the current provenance-only check behaviour and the
current stale reason model for well-shaped provenance.

## Acceptance criteria

- [x] Valid JSON provenance with a missing `sourcePath` is reported as malformed artifact evidence.
- [x] Valid JSON provenance with a missing `sourceSha256` is reported as malformed artifact evidence.
- [x] Valid JSON provenance with a missing `diagramPilotVersion` is reported as malformed artifact evidence.
- [x] Valid JSON provenance with a missing `renderer` object is reported as malformed artifact evidence.
- [x] Valid JSON provenance with missing renderer `name` or `version` is reported as malformed artifact evidence.
- [x] Valid JSON provenance with non-string required fields is reported as malformed artifact evidence.
- [x] Malformed JSON provenance remains malformed artifact evidence.
- [x] Missing DiagramPilot provenance remains a missing provenance artifact state.
- [x] Well-shaped stale provenance still returns stale reason names.
- [x] SVG Artifact Freshness does not throw for any malformed provenance fixture covered by this issue.

## Blocked by

None - can start immediately

## Implementation notes

- Added explicit DiagramPilot provenance shape validation before SVG Artifact
  Freshness compares expected and actual provenance.
- Missing or non-string `sourcePath`, `sourceSha256`,
  `diagramPilotVersion`, `renderer.name`, and `renderer.version` now return a
  `malformed-artifact` state.
- Missing or non-object `renderer` now returns `malformed-artifact` instead of
  allowing stale comparison to throw.
- Extended SVG Artifact Freshness tests with table-driven malformed valid-JSON
  provenance fixtures while preserving existing malformed JSON, missing
  provenance, and stale reason coverage.

## Validation plan

- `npm run build && node --test test/svg-artifact-freshness.test.mjs`
- `npm test`

## Validation performed

- `npm run build && node --test test/svg-artifact-freshness.test.mjs` passed.
- `npm test` passed 88 tests.
