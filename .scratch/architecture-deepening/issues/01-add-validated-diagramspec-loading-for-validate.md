Status: ready-for-agent

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

- [ ] `validate` still accepts one explicit DiagramPilot Source File path and does not scan the repository.
- [ ] Valid YAML and JSON DiagramPilot Source Files still produce the existing successful text and JSON validation results.
- [ ] Read failures, YAML parse failures, JSON parse failures, and semantic validation failures still preserve current exit-code, stdout, stderr, and structured error behaviour.
- [ ] A focused test covers the validated DiagramSpec loading interface without depending on private parser helpers.
- [ ] Existing CLI smoke coverage for `validate` continues to pass.

## Blocked by

None - can start immediately
