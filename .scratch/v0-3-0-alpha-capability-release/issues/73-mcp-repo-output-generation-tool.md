Status: ready-for-agent
Issue Version: 0.2.10

# MCP repo output generation tool

## Parent

- [PRD](../PRD.md)

## What to build

Add a side-effecting MCP tool that refreshes configured repo outputs through
DiagramPilot generation. The tool must require explicit paths or scopes and
must not default to the whole repository. It should return a structured
before/after summary and written paths rather than a full diff.

## User stories covered

- 46-48

## Acceptance criteria

- [ ] MCP exposes a side-effecting repo output generation tool.
- [ ] The generation tool requires explicit file paths or explicit directory
      scopes.
- [ ] The generation tool has no whole-repo default.
- [ ] The generation tool validates config before writes.
- [ ] The generation tool uses the same write semantics as `diagrampilot
      generate`.
- [ ] The generation tool returns structured before/after summaries.
- [ ] The generation tool returns written paths, skipped paths, and repairable
      failures.
- [ ] The generation tool does not return full diffs.
- [ ] Invalid config, invalid sources, and unsafe output paths fail with
      repairable diagnostics.
- [ ] Tests cover explicit paths, explicit directory scopes, no whole-repo
      default, configured output writes, path safety, structured summaries,
      written paths, skipped paths, and repairable failures.

## Blocked by

- [70 Generate command for configured outputs](./70-generate-command-for-configured-outputs.md)
- [72 MCP package, launch, resources, read tools, and prompts](./72-mcp-package-launch-resources-read-tools-and-prompts.md)

## Validation plan

```bash
npm test
node packages/cli/dist/index.js mcp --help
git diff --check
```
