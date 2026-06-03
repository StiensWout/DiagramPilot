Status: completed

# Reuse validated DiagramSpec loading in export and render

## Parent

- [PRD](../PRD.md)

## What to build

Route `export` and `render` through the validated DiagramSpec loading module so
the source loading, validation, failure ordering, and valid DiagramSpec handoff
are shared across commands.

This slice should preserve current CLI behaviour for Mermaid export, D2 export,
and SVG rendering. Export should still print to stdout by default and write only
when `--out` is provided. Render should still require an explicit output path
and should still validate before writing a Derived Artifact.

## Acceptance criteria

- [x] `export` uses the shared validated DiagramSpec loading path before producing Mermaid or D2 text.
- [x] `render` uses the shared validated DiagramSpec loading path before producing SVG.
- [x] Invalid DiagramPilot Source Files still fail before export or render output is written.
- [x] `export` stdout, `--out`, and source-preservation behaviour remains unchanged.
- [x] `render --out` behaviour, missing-output-path behaviour, and source-preservation behaviour remains unchanged.
- [x] Existing export and render smoke coverage continues to pass.

## Blocked by

- [01 Add validated DiagramSpec loading for validate](./01-add-validated-diagramspec-loading-for-validate.md)

## Comments

Implemented 2026-06-03:

- Routed `diagrampilot export <path> --format mermaid|d2` through
  `loadValidatedDiagramSpec()` and exports from the validated `spec` handoff.
- Routed `diagrampilot render <path> --out <path>` through
  `loadValidatedDiagramSpec()` and renders from the validated `spec` handoff.
- Removed the CLI's direct use of the lower-level source loading and semantic
  validation primitives.
- Shared text-mode validated loading failure formatting across validate, export,
  and render while preserving existing validate JSON handling.
- Added a focused architecture check that keeps CLI commands on validated
  DiagramSpec loading rather than lower-level loading primitives.
- Extended CLI smoke coverage for export invalid-input `--out` write safety and
  render source preservation.

Validation plan:

- Run the focused architecture and CLI smoke coverage:

  ```bash
  node --test test/cli-workflow-architecture.test.mjs test/cli-smoke.test.mjs
  ```

- Run the full workspace suite:

  ```bash
  npm test
  ```

Validation performed 2026-06-03:

- `node --test test/cli-workflow-architecture.test.mjs test/cli-smoke.test.mjs`
  passed 51 tests.
- `npm test` passed 59 tests.
