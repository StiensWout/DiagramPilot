Status: completed

# Reuse DiagramSpec topology in containment validation

## Parent

- [PRD](../PRD.md)

## What to build

Use the DiagramSpec topology module to improve locality for Group containment
validation. Validation should continue enforcing the same DiagramSpec v1 rules:
Groups may contain Nodes and Groups, each contained object has at most one
parent Group, Groups are not Edge endpoints, and containment cycles are invalid.

This slice should reduce repeated containment and Stable ID lookup knowledge
without changing which DiagramPilot Source Files are valid.

## Acceptance criteria

- [x] Group containment validation consumes shared topology where it improves locality.
- [x] Duplicate containment, unknown containment references, Edge containment, Group endpoint, and containment cycle failures keep current repairable behaviour.
- [x] Valid nested Group fixtures remain valid.
- [x] Validation does not rewrite DiagramPilot Source Files.
- [x] Existing validation tests for Group containment, Edge endpoints, Stable IDs, Metadata, and Icon References continue to pass.

## Blocked by

- [04 Add DiagramSpec topology for export traversal](./04-add-diagramspec-topology-for-export-traversal.md)

## Comments

Implemented 2026-06-03:

- Added topology-owned containment reference classification to
  `createDiagramSpecTopology(spec)`, including parent Group index, contained
  index, contained ID, and object type classification for Node, Group, Edge,
  and unknown references.
- Added a traversal recursion guard so topology can be constructed for
  validation-compatible sources that still contain invalid Group cycles.
- Routed containment reference, duplicate parentage, containment cycle, and
  edge endpoint validation through topology-derived lookup maps when the source
  shape is safe for topology construction.
- Preserved the existing fallback validation path for malformed source shapes
  that cannot safely construct topology yet.
- Added focused topology and core validation tests covering containment
  reference classification, repairable containment diagnostics, Group endpoint
  diagnostics, and source-object preservation.

Validation plan:

- Check whitespace in the diff:

  ```bash
  git diff --check
  ```

- Run the full workspace test suite:

  ```bash
  npm test
  ```

Validation performed 2026-06-03:

- `git diff --check` passed.
- `npm test` passed 70 tests.
