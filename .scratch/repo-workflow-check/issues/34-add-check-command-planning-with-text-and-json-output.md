Status: completed

# Add check command planning with text and JSON output

## Parent

- [PRD](../PRD.md)

## What to build

Add the `diagrampilot check [path] [--json]` command using the existing command
planning seam. The command should combine discovery, validated DiagramSpec
loading, and SVG Artifact Freshness checks into a read-only repository workflow
health result.

Text output should be concise: summarize checked source count, list actionable
per-source failures, and point to `validate` or `render` repair commands. It
should not embed full repairable validation diagnostics for invalid sources.

JSON output should be aggregate-shaped and include per-source validation and
artifact state. It should preserve validation errors in a shape compatible with
existing repairable diagnostics.

## Acceptance criteria

- [x] `diagrampilot check` checks the current working directory.
- [x] `diagrampilot check <directory>` checks one explicit directory scope.
- [x] `diagrampilot check <source-file>` checks one explicit source file.
- [x] `diagrampilot check --json` emits aggregate JSON to stdout.
- [x] JSON output includes all checked sources, including fresh sources.
- [x] JSON artifact results include expected/actual provenance comparison details without embedding raw SVG metadata text.
- [x] Text success output reports checked DiagramPilot Source File count and fresh SVG status.
- [x] Text success output does not list every checked source by default.
- [x] Text no-source output says no DiagramPilot Source Files were found and exits `0`.
- [x] Text failure output reports invalid sources, missing artifacts, and stale artifacts with repair commands.
- [x] Text stale artifact output shows stale reason names without dumping full hashes or versions.
- [x] Invalid sources skip artifact freshness and point to `diagrampilot validate <source>`.
- [x] Missing or stale SVG artifacts point to `diagrampilot render <source> --out <expected-svg>`.
- [x] Exit code is `0` for success and no-source directory scopes.
- [x] Exit code is `1` for command errors, invalid sources, missing artifacts, unreadable/malformed artifacts, missing provenance, and stale artifacts.
- [x] `check` produces no command write intents.
- [x] v1 supports no `--quiet` and rejects unknown options.
- [x] Existing `validate`, `render`, and `export` command planning behavior continues to pass.
- [x] CLI smoke coverage proves real `diagrampilot check` execution.

## Blocked by

- [32 Add repo workflow source discovery](./32-add-repo-workflow-source-discovery.md)
- [33 Add SVG provenance freshness checking](./33-add-svg-provenance-freshness-checking.md)

## Validation plan

```bash
npm test
(cd demo-projects/checkout && node ../../packages/cli/dist/index.js check)
node packages/cli/dist/index.js check demo-projects/checkout --json
```

## Comments

Implemented 2026-06-04:

- Added `diagrampilot check [path] [--json]` to the CLI planning seam in `packages/cli`, keeping the command read-only with zero write intents.
- Reused `discoverDiagramPilotSourceFiles()` and `checkExpectedSvgArtifactFreshness()` from `@diagrampilot/core`, while validating each discovered source first and skipping artifact freshness for invalid sources.
- Added concise text reporting for success, no-source, and actionable failure cases, with repair commands pointing to `validate` or `render` as appropriate.
- Added aggregate JSON output that includes all checked sources, including fresh ones, with validation errors preserved in the existing repairable-diagnostic shape and stale artifact expected/actual provenance details kept structured.
- Added planner coverage for no-source success, concise text success, mixed failure reporting, aggregate JSON, and unknown `check` options.
- Added real CLI smoke coverage for default cwd scope, explicit directory scope, and explicit source-file scope.

Validation plan:

```bash
npm test
(cd demo-projects/checkout && node ../../packages/cli/dist/index.js check)
node packages/cli/dist/index.js check demo-projects/checkout --json
```

Validation performed 2026-06-04:

- `npm test` passed 75 tests.
