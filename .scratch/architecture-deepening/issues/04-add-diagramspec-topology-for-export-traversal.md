Status: ready-for-agent

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

- [ ] Topology can describe root Nodes, root Groups, nested Groups, parentage, and traversal order for a valid DiagramSpec.
- [ ] D2 export consumes topology-derived Node paths instead of recomputing them independently.
- [ ] Mermaid and D2 exports preserve current output for existing valid DiagramSpec fixtures unless a focused review-stable difference is explicitly justified.
- [ ] Topology tests cover small fixtures with ungrouped Nodes, one Group, and nested Groups.
- [ ] Existing Mermaid and D2 export coverage continues to pass.

## Blocked by

None - can start immediately
