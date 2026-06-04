Status: completed

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

- [x] Rendering and SVG Artifact Freshness use one provenance shape.
- [x] Rendering and SVG Artifact Freshness use one source SHA-256 construction behaviour.
- [x] DiagramPilot version, renderer name, and renderer version are populated consistently for render and check paths.
- [x] Provenance construction continues to omit wall-clock timestamps.
- [x] SVG metadata insertion remains owned by the render SVG adapter.
- [x] D2 invocation and worker cleanup remain owned by the render SVG adapter.
- [x] Existing render provenance tests continue to pass.
- [x] Existing SVG Artifact Freshness tests continue to pass.

## Blocked by

- [36 Add robust provenance shape validation](./36-add-robust-provenance-shape-validation.md)

## Implementation notes

- Added a public core `createSvgArtifactProvenance` constructor and
  `CreateSvgArtifactProvenanceOptions` interface for the shared SVG artifact
  provenance model.
- Updated SVG Artifact Freshness expected-provenance construction to use the
  shared core constructor.
- Updated `@diagrampilot/render-svg` so `createSvgRendererProvenance` adapts
  render-specific renderer constants into the shared core constructor instead
  of hashing source content locally.
- Kept SVG metadata insertion, D2 invocation, and worker cleanup in the render
  SVG adapter.
- Added architecture coverage that prevents render SVG provenance construction
  from reintroducing a local `node:crypto` hash path.

## Validation plan

- `npm run build && node --test test/provenance-architecture.test.mjs test/render-svg-provenance.test.mjs`
- `npm run build && node --test test/svg-artifact-freshness.test.mjs`
- `npm test`
- `cd demo-projects/checkout && node ../../packages/cli/dist/index.js check`
- `cd demo-projects/checkout && node ../../packages/cli/dist/index.js check --json`

## Validation performed

- `npm run build && node --test test/provenance-architecture.test.mjs test/render-svg-provenance.test.mjs` passed.
- `npm run build && node --test test/svg-artifact-freshness.test.mjs` passed.
- `npm test` passed 99 tests.
- `cd demo-projects/checkout && node ../../packages/cli/dist/index.js check`
  passed.
- `cd demo-projects/checkout && node ../../packages/cli/dist/index.js check --json`
  passed.
