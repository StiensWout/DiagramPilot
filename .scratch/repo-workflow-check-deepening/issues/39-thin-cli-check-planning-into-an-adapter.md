Status: completed

# Thin CLI check planning into an adapter

## Parent

- [PRD](../PRD.md)

## What to build

Refactor CLI check planning so it delegates Repo Workflow Check behaviour to the
deep Repo Workflow Check module. Command planning should remain responsible for
argument handling, text versus JSON output, exit code selection, stdout/stderr
routing, and empty write intent. It should no longer construct the aggregate
check result itself.

The user-facing `diagrampilot check [path] [--json]` contract must remain
unchanged.

## Acceptance criteria

- [x] `diagrampilot check` still checks the current working directory.
- [x] `diagrampilot check <directory>` still checks one explicit directory scope.
- [x] `diagrampilot check <source-file>` still checks one explicit source file.
- [x] `diagrampilot check --json` still emits aggregate JSON to stdout.
- [x] Text success output remains concise and does not list every fresh source.
- [x] Text failure output still points invalid sources to `validate`.
- [x] Text failure output still points missing, stale, malformed, unreadable, and missing-provenance artifacts to `render`.
- [x] Exit code remains `0` for success and no-source directory scopes.
- [x] Exit code remains `1` for command errors and workflow issues.
- [x] `check` command planning still returns no write intents.
- [x] CLI command planning tests use a fake Repo Workflow Check adapter where appropriate.
- [x] Real CLI smoke coverage for `check` continues to pass.

## Blocked by

- [38 Add deep Repo Workflow Check module](./38-add-deep-repo-workflow-check-module.md)

## Implementation notes

- Refactored CLI check planning to call `checkDiagramPilotRepoWorkflow` as the
  single Repo Workflow Check adapter.
- Kept CLI planning responsible for check argument parsing, renderer/version
  adapter options, stdout/stderr routing, exit code selection, and empty write
  intents.
- Removed duplicate check discovery, validated loading, artifact freshness, path
  derivation, and aggregate result construction from the CLI source.
- Updated command planning tests to fake the Repo Workflow Check adapter and
  added architecture coverage that prevents CLI check planning from importing
  lower-level check internals.
- Preserved the CLI JSON contract where `ok` is `false` when workflow issues
  are present, while still using the core aggregate result for scope, summary,
  and source details.

## Validation plan

- `npm run build && node --test test/cli-command-planning.test.mjs test/cli-workflow-architecture.test.mjs`
- `npm test`
- `cd demo-projects/checkout && node ../../packages/cli/dist/index.js check`
- `cd demo-projects/checkout && node ../../packages/cli/dist/index.js check --json`

## Validation performed

- `npm run build && node --test test/cli-command-planning.test.mjs test/cli-workflow-architecture.test.mjs` passed.
- `npm test` passed 98 tests.
- `cd demo-projects/checkout && node ../../packages/cli/dist/index.js check`
  passed.
- `cd demo-projects/checkout && node ../../packages/cli/dist/index.js check --json`
  passed.
