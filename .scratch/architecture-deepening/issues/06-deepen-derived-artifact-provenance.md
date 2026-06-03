Status: completed

# Deepen Derived Artifact provenance

## Parent

- [PRD](../PRD.md)

## What to build

Deepen Derived Artifact provenance so deterministic metadata construction,
source hashing, no-timestamp policy, and SVG metadata insertion have better
locality. The render command should still produce SVG through the local D2 path,
but provenance behaviour should be testable without invoking D2 for every
metadata assertion.

This slice should preserve the current Review-Stable Rendering contract and the
existing generated SVG provenance shape.

## Acceptance criteria

- [x] Rendered SVG provenance still records source path, source SHA-256 hash, DiagramPilot version, renderer name, and renderer version.
- [x] Rendered SVG provenance still excludes wall-clock timestamps.
- [x] Provenance metadata construction and SVG metadata insertion are covered by focused tests that do not require D2 rendering.
- [x] Render smoke coverage still proves the included local D2 path can produce SVG.
- [x] The render command still validates before writing and still requires an explicit output path.

## Blocked by

- [02 Reuse validated DiagramSpec loading in export and render](./02-reuse-validated-diagramspec-loading-in-export-and-render.md)

## Comments

Implemented 2026-06-03:

- Added focused render-package provenance coverage in
  `test/render-svg-provenance.test.mjs` for deterministic metadata
  construction and SVG metadata insertion without invoking D2.
- Added `createSvgRendererProvenance()` so source path, source SHA-256,
  DiagramPilot version, renderer name, renderer version, and the no-timestamp
  policy live together in `@diagrampilot/render-svg`.
- Added `addSvgProvenanceMetadata()` as the public SVG insertion helper and
  routed `renderDiagramSpecToSvg()` through it.
- Updated the CLI render path to delegate provenance construction to
  `@diagrampilot/render-svg` while preserving validation-before-write and
  explicit `--out` behaviour.
- Kept the existing executable render smoke tests as the proof that the
  included local D2 path can still produce SVG.

Validation plan:

- Run the focused no-D2 provenance coverage:

  ```bash
  node --test test/render-svg-provenance.test.mjs
  ```

- Run the render smoke coverage that exercises the included local D2 path:

  ```bash
  node --test --test-name-pattern "diagrampilot render|quickstart workflow" test/cli-smoke.test.mjs
  ```

- Run the full workspace suite:

  ```bash
  npm test
  ```

Validation performed 2026-06-03:

- `node --test test/render-svg-provenance.test.mjs` passed 2 tests.
- `node --test --test-name-pattern "diagrampilot render|quickstart workflow" test/cli-smoke.test.mjs` passed 4 tests.
- `npm test` passed 72 tests.
