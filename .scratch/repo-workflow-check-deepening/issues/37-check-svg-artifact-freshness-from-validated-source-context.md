Status: ready-for-agent

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

- [ ] Repo Workflow Check can pass validated DiagramPilot Source File context into SVG Artifact Freshness.
- [ ] SVG Artifact Freshness can compute expected provenance from the supplied source context.
- [ ] A discovered valid source is not loaded and validated twice during Repo Workflow Check.
- [ ] Invalid DiagramPilot Source Files still produce unchecked artifact state.
- [ ] Missing Expected SVG Artifacts still produce missing artifact state.
- [ ] Fresh Expected SVG Artifacts still produce fresh state.
- [ ] Stale Expected SVG Artifacts still produce stale state with reason names.
- [ ] Existing text and JSON `diagrampilot check` output remains behaviourally unchanged.

## Blocked by

- [36 Add robust provenance shape validation](./36-add-robust-provenance-shape-validation.md)
