Status: ready-for-agent

# Validate basic edge semantics between Nodes

## Parent

- [PRD](../PRD.md)

## What to build

Validate Edge behavior so connections are unambiguous and usable for later
export and render steps. This includes Node-only endpoints, optional labels,
directed-by-default behavior, and an explicit way to represent undirected
edges.

## Acceptance criteria

- [ ] Validation rejects edges whose `from` or `to` references are not valid
      Nodes.
- [ ] Edge labels are optional, and default directed behavior is enforced
      consistently.
- [ ] Tests cover valid directed edges, explicit undirected edges, and broken
      endpoint references.

## Blocked by

- [05 Validate required top-level DiagramSpec fields](./05-validate-required-top-level-diagramspec-fields.md)
- [06 Enforce Stable ID format and global uniqueness](./06-enforce-stable-id-format-and-global-uniqueness.md)
