Status: ready-for-agent
Issue Version: 0.2.7

# Generate command for configured outputs

## Parent

- [PRD](../PRD.md)

## What to build

Add `diagrampilot generate [path]` as the explicit write command for refreshing
all expected outputs in the selected scope. There is no `--write` flag because
the command itself is the write intent.

Without config, `generate` should refresh the zero-config SVG expectation.
With config, it should rewrite all expected configured outputs in scope, create
parent directories as needed, refuse writes outside the config tree, and expose
structured results through `--json`.

## User stories covered

- 35-36

## Acceptance criteria

- [ ] `diagrampilot generate` refreshes expected outputs for the current
      working directory scope.
- [ ] `diagrampilot generate <directory>` refreshes expected outputs for that
      directory scope.
- [ ] `diagrampilot generate <source-file>` refreshes expected outputs for that
      source scope.
- [ ] Without config, `generate` refreshes the default SVG output.
- [ ] With config, `generate` rewrites all expected outputs in the selected
      scope.
- [ ] `generate` creates parent directories for expected outputs.
- [ ] `generate` refuses writes outside the config directory tree.
- [ ] `generate --json` reports structured written paths, skipped paths, and
      repairable failures.
- [ ] Invalid sources and invalid config fail without partial invalid writes.
- [ ] Existing `check` behavior remains read-only.
- [ ] Tests cover cwd, directory, source-file, zero-config SVG, configured
      outputs, parent directory creation, path safety, JSON output, invalid
      sources, invalid config, and read-only `check`.

## Blocked by

- [69 Configured artifact mappings and freshness](./69-configured-artifact-mappings-and-freshness.md)

## Validation plan

```bash
npm test
node packages/cli/dist/index.js generate demo-projects/checkout --json
git diff --check
```
