Status: ready-for-agent

# Preserve open `kind` and unknown `metadata` keys through validation

## Parent

- [PRD](../PRD.md)

## What to build

Keep DiagramSpec flexible by validating `kind` as an open semantic tag and by
preserving unknown metadata keys rather than forcing a closed model. This slice
should protect future extensibility without weakening the core validation
contract.

## Acceptance criteria

- [ ] Validation accepts unknown but well-formed `kind` values.
- [ ] Validation preserves unknown metadata keys instead of stripping or
      rejecting them by default.
- [ ] Tests cover pass-through behavior for open semantic tags and metadata
      extensions.

## Blocked by

- [05 Validate required top-level DiagramSpec fields](./05-validate-required-top-level-diagramspec-fields.md)
