Status: completed

# Add validated DiagramSpec loading for validate

## Parent

- [PRD](../PRD.md)

## What to build

Create the first vertical slice of a deep validated DiagramSpec loading module
and route the `validate` command through it. The module should own the ordered
path from an explicit DiagramPilot Source File to either a valid DiagramSpec or
a diagnostic-friendly read, parse, or semantic validation failure.

This slice should preserve the current `validate` user experience while giving
callers one interface for source loading and validation. It should not rewrite
DiagramPilot Source Files.

## Acceptance criteria

- [x] `validate` still accepts one explicit DiagramPilot Source File path and does not scan the repository.
- [x] Valid YAML and JSON DiagramPilot Source Files still produce the existing successful text and JSON validation results.
- [x] Read failures, YAML parse failures, JSON parse failures, and semantic validation failures still preserve current exit-code, stdout, stderr, and structured error behaviour.
- [x] A focused test covers the validated DiagramSpec loading interface without depending on private parser helpers.
- [x] Existing CLI smoke coverage for `validate` continues to pass.

## Blocked by

None - can start immediately

## Comments

Implemented 2026-06-03:

- Added `loadValidatedDiagramSpec(path)` in `@diagrampilot/core`.
- The loader owns the ordered path from explicit DiagramPilot Source File path
  to source read, YAML/JSON parse, semantic DiagramSpec validation, and typed
  success with source context.
- Read and parse failures preserve the existing `SourceLoadFailure` shapes.
- Semantic validation failures return the loaded source context plus existing
  repairable `DiagramSpecValidationError` values.
- Routed `diagrampilot validate <path> [--json]` through the validated
  DiagramSpec loader while preserving the existing text and JSON CLI output.
- Left `export` and `render` on the existing path for the follow-up reuse issue.
- Added focused loader-interface tests covering valid YAML, valid JSON, read
  failure, YAML parse failure, JSON parse failure, and semantic validation
  failure without depending on private parser helpers.

Validation plan:

- Run the focused loader and CLI smoke tests:

  ```bash
  node --test test/validated-diagramspec-loading.test.mjs test/cli-smoke.test.mjs
  ```

- Run the full workspace suite:

  ```bash
  npm test
  ```

Validation performed 2026-06-03:

- `node --test test/validated-diagramspec-loading.test.mjs test/cli-smoke.test.mjs`
  passed 55 tests.
- `npm test` passed 57 tests.
