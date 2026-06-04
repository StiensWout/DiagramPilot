Status: ready-for-agent

# Centralize provenance construction across render and check

## Parent

- [PRD](../PRD.md)

## What to build

Make rendering and freshness checking share one provenance model and source hash
construction path. Review-Stable Rendering provenance should continue to record
source path, source SHA-256 hash, DiagramPilot version, renderer name, and
renderer version without wall-clock timestamps.

SVG metadata insertion and D2 rendering should remain in the render SVG adapter.
This slice centralizes the provenance facts that both rendering and Repo
Workflow Check need; it should not move D2-specific rendering behaviour into the
Repo Workflow Check module.

## Acceptance criteria

- [ ] Rendering and SVG Artifact Freshness use one provenance shape.
- [ ] Rendering and SVG Artifact Freshness use one source SHA-256 construction behaviour.
- [ ] DiagramPilot version, renderer name, and renderer version are populated consistently for render and check paths.
- [ ] Provenance construction continues to omit wall-clock timestamps.
- [ ] SVG metadata insertion remains owned by the render SVG adapter.
- [ ] D2 invocation and worker cleanup remain owned by the render SVG adapter.
- [ ] Existing render provenance tests continue to pass.
- [ ] Existing SVG Artifact Freshness tests continue to pass.

## Blocked by

- [36 Add robust provenance shape validation](./36-add-robust-provenance-shape-validation.md)
