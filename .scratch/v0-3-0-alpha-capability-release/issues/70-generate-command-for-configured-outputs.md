Status: completed
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

- [x] `diagrampilot generate` refreshes expected outputs for the current
      working directory scope.
- [x] `diagrampilot generate <directory>` refreshes expected outputs for that
      directory scope.
- [x] `diagrampilot generate <source-file>` refreshes expected outputs for that
      source scope.
- [x] Without config, `generate` refreshes the default SVG output.
- [x] With config, `generate` rewrites all expected outputs in the selected
      scope.
- [x] `generate` creates parent directories for expected outputs.
- [x] `generate` refuses writes outside the config directory tree.
- [x] `generate --json` reports structured written paths, skipped paths, and
      repairable failures.
- [x] Invalid sources and invalid config fail without partial invalid writes.
- [x] Existing `check` behavior remains read-only.
- [x] Tests cover cwd, directory, source-file, zero-config SVG, configured
      outputs, parent directory creation, path safety, JSON output, invalid
      sources, invalid config, and read-only `check`.

## Blocked by

- [69 Configured artifact mappings and freshness](./69-configured-artifact-mappings-and-freshness.md)

## Validation plan

```bash
npm test
npm run audit:fallow
npm run audit:fallow:changed
node packages/cli/dist/index.js generate demo-projects/checkout --json
git diff --check
```

## Implementation notes

- Added `generateDiagramPilotRepoWorkflow` and dependency-injected
  `generateDiagramPilotRepoWorkflowWithDependencies` in core. The generator
  reuses Repo Workflow Configuration discovery, scoped source discovery,
  explicit configured source merging, configured output resolution, and
  centralized repairable source diagnostics.
- `generate` plans all generated content before exposing write intents. Invalid
  config, invalid sources, and generation adapter failures return no planned
  writes, preventing partial invalid artifact updates.
- Zero-config and unmatched configured sources produce the default
  next-to-source SVG output. Matched configured sources produce SVG, PNG,
  Mermaid, D2, and DOT outputs using the CLI render/export adapters.
- Configured Markdown outputs are reported as skipped structured results until
  generated Markdown embeds ship in issue 71.
- Added CLI parsing, help text, and a generate command planning adapter that
  maps core generated artifacts to the existing command write-intent execution
  path, including parent directory creation.
- `generate --json` returns structured `written`, `skipped`, and `failures`
  arrays without embedding generated file contents.
- Added planner, core, and smoke tests covering cwd, directory, source-file,
  zero-config SVG, configured outputs, parent directory creation, path safety,
  JSON output, invalid sources, invalid config, skipped outputs, and existing
  read-only `check` behavior.
- Follow-up quality workflow hardening fixed current Fallow dead-code findings,
  added narrow Fallow configuration for intentional static-analysis blind
  spots, committed Fallow baselines for existing duplication and health debt,
  and made Fallow a blocking local and CI quality gate.

## Validation results

- `npm test` passed: 211 tests.
- `npm run audit:fallow` passed.
- `npm run audit:fallow:changed` passed with only inherited duplication context
  reported from the committed baseline.
- `npm run build` passed after the final cleanup.
- `node packages/cli/dist/index.js generate demo-projects/checkout --json`
  passed with 1 checked source and 1 written SVG artifact.
- `git diff --check` passed.
