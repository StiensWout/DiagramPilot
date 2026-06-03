Status: completed

# Add DiagramSpec topology for export traversal

## Parent

- [PRD](../PRD.md)

## What to build

Create the first vertical slice of a deep DiagramSpec topology module and route
export traversal through it. The module should expose reusable knowledge about
Diagram Objects that exporters currently rediscover, including Group roots,
Group parentage, contained relationships, traversal order, and Node paths where
an export target needs them.

This slice should keep Mermaid and D2 adapters responsible for target-specific
syntax, escaping, direction names, and formatting while moving shared topology
knowledge behind one interface.

## Acceptance criteria

- [x] Topology can describe root Nodes, root Groups, nested Groups, parentage, and traversal order for a valid DiagramSpec.
- [x] D2 export consumes topology-derived Node paths instead of recomputing them independently.
- [x] Mermaid and D2 exports preserve current output for existing valid DiagramSpec fixtures unless a focused review-stable difference is explicitly justified.
- [x] Topology tests cover small fixtures with ungrouped Nodes, one Group, and nested Groups.
- [x] Existing Mermaid and D2 export coverage continues to pass.

## Blocked by

None - can start immediately

## Comments

Implemented 2026-06-03:

- Added `createDiagramSpecTopology(spec)` in `@diagrampilot/core`.
- The topology exposes Node, Edge, and Group lookup maps; root Nodes; root
  Groups; parent Group IDs for contained Diagram Objects; contained object
  entries per Group; preorder traversal entries; and topology-derived Node
  paths.
- Added public topology tests for ungrouped Nodes, one Group, and nested
  Groups.
- Routed D2 edge endpoint paths through `topology.nodePathsById`, with D2 still
  owning the `.` path separator and target syntax.
- Routed Mermaid and D2 Group traversal through topology roots and contained
  object entries while keeping syntax, escaping, direction names, labels, and
  formatting inside the exporters.
- Removed exporter-local Group root, Group parentage, contained-ID, and D2 Node
  path recomputation helpers.
- Existing Mermaid and D2 output fixtures stayed unchanged.

Validation plan:

- Check whitespace in the diff:

  ```bash
  git diff --check
  ```

- Build the TypeScript workspace:

  ```bash
  npm run build
  ```

- Run the full workspace test suite:

  ```bash
  npm test
  ```

Validation performed 2026-06-03:

- `git diff --check` passed.
- `npm run build` passed.
- `npm test` passed 68 tests.
