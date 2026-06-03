Status: completed

# Centralize Repairable Validation Error diagnostics

## Parent

- [PRD](../PRD.md)

## What to build

Deepen diagnostics so read failures, parse failures, semantic validation
failures, text output, and JSON output share one reporting model. The CLI should
be an adapter over that diagnostic model rather than the place where failure
conversion and rendering rules are scattered.

This slice should preserve the current Repairable Validation Error shape and
the current stdout/stderr rules for `validate`, `export`, and `render`.

## Acceptance criteria

- [x] Read failures, parse failures, and semantic validation failures can be represented through one diagnostic model.
- [x] Text diagnostics preserve the current repair-friendly format for human CLI use.
- [x] JSON diagnostics preserve path, message, bad value when available, expected value, and suggestion for agent repair loops.
- [x] Machine-consumable stdout remains clean when JSON validation output is requested.
- [x] Diagnostics are covered through focused tests at the diagnostic interface plus command-level routing tests.
- [x] Existing repairable-error tests and CLI smoke coverage continue to pass.

## Blocked by

- [01 Add validated DiagramSpec loading for validate](./01-add-validated-diagramspec-loading-for-validate.md)

## Comments

Implemented 2026-06-03:

- Added `RepairableDiagnostic` and `RepairableDiagnosticReport` in
  `@diagrampilot/core`.
- Added `createRepairableDiagnosticReport(failure)` so read failures, parse
  failures, and semantic validation failures share one repairable report shape.
- Kept the existing text diagnostics for source read/parse failures and
  DiagramSpec validation errors in the centralized report text.
- Kept JSON diagnostics as `{ file, ok, errors }`, with each error preserving
  `path`, `message`, optional `badValue`, `expected`, and `suggestion`.
- Routed `validate`, `export`, and `render` failure handling through the
  centralized diagnostic report.
- Removed CLI-local read/parse/semantic diagnostic conversion and formatting.
- Added focused diagnostic-interface coverage plus CLI JSON routing tests for
  read and parse failures.
- Tightened the CLI architecture test to keep command failure handling on the
  centralized repairable diagnostics interface.

Validation plan:

- Run the focused diagnostics, command routing, and CLI architecture coverage:

  ```bash
  npm run build && node --test test/repairable-diagnostics.test.mjs test/cli-smoke.test.mjs test/cli-workflow-architecture.test.mjs
  ```

- Run the full workspace suite:

  ```bash
  npm test
  ```

Validation performed 2026-06-03:

- `npm run build && node --test test/repairable-diagnostics.test.mjs test/cli-smoke.test.mjs test/cli-workflow-architecture.test.mjs`
  passed 57 tests.
- `npm test` passed 65 tests.
