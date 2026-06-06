Status: ready-for-agent
Issue Version: 0.2.12

# MCP Source Mutation

## Parent

- [PRD](../PRD.md)

## What to build

Add MCP Source Mutation through Structured Diagram Operations, not raw YAML
replacement. Mutation should support fine-grained operations for nodes, edges,
groups, top-level title, description, direction, top-level metadata keys, and
object metadata keys.

Each tool call should be atomic: load valid YAML, apply the structured
operation, validate, and roll back invalid results. Targets use Stable IDs
only. Rewrites should use canonical YAML key order, preserve array order unless
the mutation changes it, and support optional `beforeId` or `afterId`
placement for top-level nodes, edges, and groups.

## User stories covered

- 52-60

## Acceptance criteria

- [ ] MCP exposes Structured Diagram Operations for Source Mutation.
- [ ] Mutation tools do not accept raw YAML replacement as their public write
      path.
- [ ] Mutation supports nodes, edges, groups, top-level title, description,
      direction, top-level metadata keys, and object metadata keys.
- [ ] Mutation targets existing objects by Stable ID only.
- [ ] Invalid source files fail with diagnostics before mutation.
- [ ] Each mutation tool call is atomic and rolls back invalid results.
- [ ] Mutated sources validate before the tool reports success.
- [ ] YAML rewrites use canonical key order.
- [ ] Array order is preserved unless the mutation changes it.
- [ ] Top-level node, edge, and group insertion supports optional `beforeId`
      and `afterId`.
- [ ] `contains` positioning is not added.
- [ ] Comment preservation is not promised.
- [ ] The tool returns structured before/after summaries and written paths, not
      a full diff.
- [ ] Tests cover each supported operation family, Stable ID targeting,
      invalid sources, validation rollback, canonical key order, array order,
      insertion positioning, no raw YAML replacement, no `contains`
      positioning, and structured responses.

## Blocked by

- [74 MCP Source Creation](./74-mcp-source-creation.md)

## Validation plan

```bash
npm test
node packages/cli/dist/index.js mcp --help
git diff --check
```
