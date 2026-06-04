Status: ready-for-agent

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

- [ ] Repo Workflow Check can evaluate the current working directory scope.
- [ ] Repo Workflow Check can evaluate an explicit directory Check Scope.
- [ ] Repo Workflow Check can evaluate one explicit DiagramPilot Source File Check Scope.
- [ ] Repo Workflow Check returns a successful no-op for directory scopes with no DiagramPilot Source Files.
- [ ] Repo Workflow Check returns command-style discovery failures for missing or unsupported Check Scopes.
- [ ] Repo Workflow Check returns aggregate per-source results for fresh, invalid, missing artifact, malformed artifact, missing provenance, unreadable artifact, and stale artifact states.
- [ ] Invalid sources include repairable validation errors and unchecked artifact state.
- [ ] Fresh sources include artifact path and provenance details.
- [ ] Stale sources include artifact path, reason names, expected provenance, and actual provenance.
- [ ] The module produces no write intent and performs no rendering.
- [ ] Tests cover the Repo Workflow Check module directly as the highest non-process seam.

## Blocked by

- [37 Check SVG Artifact Freshness from validated source context](./37-check-svg-artifact-freshness-from-validated-source-context.md)
