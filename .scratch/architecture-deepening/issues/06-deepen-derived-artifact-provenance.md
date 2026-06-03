Status: ready-for-agent

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

- [ ] Rendered SVG provenance still records source path, source SHA-256 hash, DiagramPilot version, renderer name, and renderer version.
- [ ] Rendered SVG provenance still excludes wall-clock timestamps.
- [ ] Provenance metadata construction and SVG metadata insertion are covered by focused tests that do not require D2 rendering.
- [ ] Render smoke coverage still proves the included local D2 path can produce SVG.
- [ ] The render command still validates before writing and still requires an explicit output path.

## Blocked by

- [02 Reuse validated DiagramSpec loading in export and render](./02-reuse-validated-diagramspec-loading-in-export-and-render.md)
