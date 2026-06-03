Status: ready-for-agent

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

- [ ] Read failures, parse failures, and semantic validation failures can be represented through one diagnostic model.
- [ ] Text diagnostics preserve the current repair-friendly format for human CLI use.
- [ ] JSON diagnostics preserve path, message, bad value when available, expected value, and suggestion for agent repair loops.
- [ ] Machine-consumable stdout remains clean when JSON validation output is requested.
- [ ] Diagnostics are covered through focused tests at the diagnostic interface plus command-level routing tests.
- [ ] Existing repairable-error tests and CLI smoke coverage continue to pass.

## Blocked by

- [01 Add validated DiagramSpec loading for validate](./01-add-validated-diagramspec-loading-for-validate.md)
