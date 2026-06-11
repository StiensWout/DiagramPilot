Status: completed
Issue Version: 0.3.1

# Consolidate configured artifact freshness mapping

## Parent

[PRD](../PRD.md)

## What to build

After check and generate share artifact planning, remove avoidable duplicate configured artifact mapping logic where doing so concentrates Derived Artifact freshness behavior without changing status names, messages, or provenance details.

## Acceptance criteria

- [x] Configured artifact freshness result mapping is no more scattered than before.
- [x] Format-specific adapters remain explicit and readable.
- [x] No behavior changes for SVG, Mermaid, D2, DOT, PNG, or Markdown configured outputs.

## Blocked by

- [Issue 81](81-route-check-through-artifact-plan.md)
- [Issue 82](82-route-generate-through-artifact-plan.md)

## Implementation notes

Configured artifact checking now receives planned artifact paths and planned Markdown references. Format-specific read-only freshness adapters remain explicit; stale path helper re-exports were removed after Fallow flagged them.

2026-06-11 release follow-up: assigned Issue Version 0.3.1 after the first main release run attempted to prepare GitHub Release v0.3.0, which already existed as a published non-draft release. Synced shared release metadata to 0.3.1.

## Validation plan

- `npm test`
- `npm run audit:fallow`
- `npm run check:release-version`
- `npm run check:issue-release-version -- --issue .scratch/repo-workflow-artifact-planning/issues/83-consolidate-configured-artifact-freshness-mapping.md`
