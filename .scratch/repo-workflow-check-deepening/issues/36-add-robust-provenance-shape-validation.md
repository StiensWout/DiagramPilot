Status: ready-for-agent

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

- [ ] Valid JSON provenance with a missing `sourcePath` is reported as malformed artifact evidence.
- [ ] Valid JSON provenance with a missing `sourceSha256` is reported as malformed artifact evidence.
- [ ] Valid JSON provenance with a missing `diagramPilotVersion` is reported as malformed artifact evidence.
- [ ] Valid JSON provenance with a missing `renderer` object is reported as malformed artifact evidence.
- [ ] Valid JSON provenance with missing renderer `name` or `version` is reported as malformed artifact evidence.
- [ ] Valid JSON provenance with non-string required fields is reported as malformed artifact evidence.
- [ ] Malformed JSON provenance remains malformed artifact evidence.
- [ ] Missing DiagramPilot provenance remains a missing provenance artifact state.
- [ ] Well-shaped stale provenance still returns stale reason names.
- [ ] SVG Artifact Freshness does not throw for any malformed provenance fixture covered by this issue.

## Blocked by

None - can start immediately
