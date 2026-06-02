Status: ready-for-agent

# Enforce Stable ID format and global uniqueness

## Parent

- [PRD](../PRD.md)

## What to build

Add validation for Stable IDs across nodes, edges, and groups using the
lowercase snake case pattern and one global namespace per DiagramSpec. This
slice should make ID-related repairs predictable for agents and maintainers.

## Acceptance criteria

- [ ] Validation rejects IDs that do not match the accepted lowercase snake
      case pattern.
- [ ] Validation rejects duplicate IDs across nodes, edges, and groups in one
      DiagramSpec.
- [ ] Focused tests cover valid IDs, invalid shapes, and cross-object
      duplicate collisions.

## Blocked by

- [05 Validate required top-level DiagramSpec fields](./05-validate-required-top-level-diagramspec-fields.md)
