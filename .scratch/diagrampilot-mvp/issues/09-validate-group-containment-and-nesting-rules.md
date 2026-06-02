Status: ready-for-agent

# Validate Group containment and nesting rules

## Parent

- [PRD](../PRD.md)

## What to build

Implement Group validation so DiagramSpec supports nested organization without
becoming impossible to render. This slice should allow valid containment while
rejecting group cycles and duplicate containment.

## Acceptance criteria

- [ ] Groups can contain Nodes and other Groups according to the DiagramSpec
      contract.
- [ ] Validation rejects group cycles and duplicate containment of the same
      object.
- [ ] Tests cover valid nesting, containment cycles, and duplicate parentage.

## Blocked by

- [05 Validate required top-level DiagramSpec fields](./05-validate-required-top-level-diagramspec-fields.md)
- [06 Enforce Stable ID format and global uniqueness](./06-enforce-stable-id-format-and-global-uniqueness.md)
- [07 Validate node and group label requirements](./07-validate-node-and-group-label-requirements.md)
