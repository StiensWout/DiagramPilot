Status: ready-for-agent

# Validate node and group label requirements

## Parent

- [PRD](../PRD.md)

## What to build

Enforce required human-readable labels for Nodes and Groups while preserving
the plain-text label contract. This slice should prove labels remain readable
in source and can include line breaks without relying on renderer-specific
markup.

## Acceptance criteria

- [ ] Validation requires `label` on every Node and Group.
- [ ] Plain-text labels with line breaks remain valid.
- [ ] Tests cover missing labels and valid multiline labels.

## Blocked by

- [05 Validate required top-level DiagramSpec fields](./05-validate-required-top-level-diagramspec-fields.md)
