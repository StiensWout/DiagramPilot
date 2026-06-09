Status: completed
Issue Version: 0.2.11

# MCP Source Creation

## Parent

- [PRD](../PRD.md)

## What to build

Add MCP Source Creation from structured input, writing valid YAML DiagramPilot
Source Files rather than raw YAML text replacement. Source Creation must
require caller-provided Stable IDs and should include a read-only Stable ID
suggestion helper so agents can propose valid IDs before writing.

Created sources should use canonical YAML key order and validate before the
tool reports success.

## User stories covered

- 51, 55-58

## Acceptance criteria

- [ ] MCP exposes a Source Creation tool that accepts structured diagram input.
- [ ] Source Creation writes YAML DiagramPilot Source Files only.
- [ ] Source Creation requires caller-provided Stable IDs for created objects.
- [ ] Source Creation rejects missing, duplicate, or invalid Stable IDs with
      repairable diagnostics.
- [ ] A read-only Stable ID suggestion helper proposes valid IDs without
      writing files.
- [ ] Created YAML uses canonical key order.
- [ ] Created sources validate before the tool reports success.
- [ ] Invalid structured input fails without writing files.
- [ ] The tool returns a structured before/after summary and written paths, not
      a full diff.
- [ ] Tests cover successful creation, required Stable IDs, invalid IDs,
      duplicates, suggestion helper behavior, YAML-only output, canonical key
      order, validation-before-success, invalid input rollback, and structured
      tool responses.

## Blocked by

- [67 YAML-only source support](./67-yaml-only-source-support.md)
- [72 MCP package, launch, resources, read tools, and prompts](./72-mcp-package-launch-resources-read-tools-and-prompts.md)

## Validation plan

```bash
npm test
node packages/cli/dist/index.js mcp --help
git diff --check
npm run audit:fallow
npm run audit:fallow:changed
```

## Implementation notes

- Added `diagrampilot_create_source` for structured DiagramSpec input.
- Added `diagrampilot_suggest_stable_ids` as a read-only Stable ID suggestion
  helper.
- Created sources are written only to `*.dp.yaml`, use canonical YAML key
  order, validate before success, and return structured before/after summaries
  with written paths instead of full source text.
- Missing, invalid, and duplicate caller-provided Stable IDs fail before write.
- Updated MCP registry, stdio schemas, launch snapshots, and public MCP docs.

## Acceptance criteria status

- MCP Source Creation accepts structured diagram input: done.
- YAML-only DiagramPilot Source File output: done.
- Caller-provided Stable IDs required and validated for missing, invalid, and
  duplicate IDs: done.
- Read-only Stable ID suggestions: done.
- Canonical YAML key order and validation-before-success behavior: done.
- Structured responses include summaries and paths without full diffs: done.

## Validation results

```bash
npm test
node packages/cli/dist/index.js mcp --help
git diff --check
npm run audit:fallow
npm run audit:fallow:changed
```

All commands passed.
