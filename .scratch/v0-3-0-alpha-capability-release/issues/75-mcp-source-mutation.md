Status: completed
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

## Fallow backlog cleanup

- [x] clone-group-1 duplicate D2/Mermaid export rendering branches: `packages/export-d2/src/index.ts:58-66`, `packages/export-mermaid/src/index.ts:60-68`
- [x] clone-group-2 duplicate DOT/Mermaid edge rendering branches: `packages/export-dot/src/index.ts:107-112`, `packages/export-mermaid/src/index.ts:63-68`
- [x] clone-group-3 duplicate DOT/Mermaid group rendering branches: `packages/export-dot/src/index.ts:119-132`, `packages/export-mermaid/src/index.ts:71-84`
- [x] clone-group-4 duplicate CLI command-planning assertions: `test/cli-check-command-planning.test.mjs:169-187`, `test/cli-command-planning.test.mjs:84-96`
- [x] clone-group-5 duplicate CLI invalid output assertions: `test/cli-check-command-planning.test.mjs:217-227`, `test/cli-command-planning.test.mjs:43-53`, `test/cli-validate-json-output.test.mjs:43-53`
- [x] clone-group-6 duplicate CLI validation helper assertions: `test/cli-command-planning.test.mjs:43-53`, `test/cli-validate-json-output.test.mjs:43-53`
- [x] clone-group-7 duplicate temp repo cleanup helpers: `test/cli-smoke-helpers.mjs:12-19`, `test/mcp-launch.test.mjs:11-18`
- [x] clone-group-8 duplicate package readiness file checks: `test/cli-smoke.test.mjs:23-28`, `test/package-publish-state.test.mjs:81-88`, `test/package-publish-state.test.mjs:102-109`
- [x] clone-group-9 duplicate CLI failure assertions: `test/cli-smoke.test.mjs:33-40`, `test/cli-smoke.test.mjs:338-347`
- [x] clone-group-10 duplicate CLI output assertions: `test/cli-smoke.test.mjs:33-39`, `test/cli-smoke.test.mjs:46-52`, `test/cli-smoke.test.mjs:338-346`

## Implementation notes

- Added `diagrampilot_mutate_source` with structured operations for top-level fields, top-level metadata, nodes, edges, groups, and object metadata.
- Mutations load a valid source, apply one operation, validate before write, serialize through the canonical DiagramPilot serializer, and return structured summaries plus written paths.
- Unsupported raw YAML replacement and `contains` positioning return structured errors without writing.
- Added shared topology-line formatting and test assertion helpers to close the 10 recorded Fallow duplicate backlog items.
- Refreshed the duplicate baseline for remaining legacy duplicate groups surfaced after changed-file fingerprints moved; no new Fallow health or dead-code findings remain.

## Validation results

- `npm test` passed.
- `node packages/cli/dist/index.js mcp --help` passed.
- `git diff --check` passed.
- `npm run audit:fallow` passed.
- `npm run audit:fallow:changed` passed.

## Validation plan

```bash
npm test
node packages/cli/dist/index.js mcp --help
git diff --check
```
