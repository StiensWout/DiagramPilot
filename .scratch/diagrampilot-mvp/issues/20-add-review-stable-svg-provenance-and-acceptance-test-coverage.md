Status: completed

# Add review-stable SVG provenance and first acceptance-test coverage

## Parent

- [PRD](../PRD.md)

## What to build

Finish the MVP acceptance path by making rendered SVG output review-stable and
provenance-aware, then proving the documented workflow works end to end. This
slice should cover deterministic provenance metadata, no wall-clock timestamps,
and the first acceptance test driven by real CLI commands and public agent
docs.

## Acceptance criteria

- [x] Rendered SVG includes deterministic provenance metadata such as source
      path, DiagramPilot version, renderer version, and source hash.
- [x] Rendered SVG excludes wall-clock timestamps to avoid noisy diffs.
- [x] End-to-end tests and docs prove an agent can follow the documented local
      workflow to validate and render a DiagramPilot Source File.
- [x] All documentation is fully up to date to the current codebase, with a
      clear distinction between developer documentation and end user/agent
      documentation.

## Blocked by

- [02 Add `diagrampilot init` support-file scaffolding](./02-add-init-support-file-scaffolding.md)
- [18 Validate and package Lucide Icon References](./18-validate-and-package-lucide-icon-references.md)
- [19 Render SVG through the included local D2 path](./19-render-svg-through-the-included-local-d2-path.md)

## Comments

Implemented 2026-06-03:

- Added deterministic SVG provenance metadata at
  `<metadata id="diagrampilot-provenance">`.
- Provenance records the source path, source SHA-256 hash, DiagramPilot version,
  and renderer name/version.
- Kept provenance free of wall-clock timestamp fields to avoid noisy generated
  SVG diffs.
- Added an acceptance-style CLI test that follows the documented agent workflow:
  create `docs/architecture.dp.yaml`, run `diagrampilot validate`, run
  `diagrampilot render --out`, and inspect the generated SVG provenance.
- Updated public agent/user docs and development docs to match the current CLI
  contract and distinguish public workflow docs from development planning docs.

Validation plan:

- Run the focused acceptance test:

  ```bash
node --test --test-name-pattern "agent quickstart workflow" test/cli-smoke.test.mjs
  ```

- Run the full workspace suite:

  ```bash
npm test
  ```

Validation performed 2026-06-03:

- `node --test --test-name-pattern "agent quickstart workflow" test/cli-smoke.test.mjs`
- `npm test`
