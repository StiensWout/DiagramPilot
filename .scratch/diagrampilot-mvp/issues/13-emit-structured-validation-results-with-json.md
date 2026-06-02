Status: ready-for-agent

# Emit structured validation results with `validate --json`

## Parent

- [PRD](../PRD.md)

## What to build

Expose the validation result in a machine-consumable JSON format for agents and
scripts. This should preserve the same repairable error content as text mode
while keeping stdout clean for structured consumers.

## Acceptance criteria

- [ ] `diagrampilot validate <path> --json` emits structured validation output
      on stdout.
- [ ] JSON output preserves the repairable error fields needed for automated
      repair loops.
- [ ] Tests prove JSON mode does not mix human diagnostics into stdout.

## Blocked by

- [12 Emit Repairable Validation Errors in text mode](./12-emit-repairable-validation-errors-in-text-mode.md)
