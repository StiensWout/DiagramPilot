Status: pending

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

- [ ] `diagrampilot check` checks the current working directory.
- [ ] `diagrampilot check <directory>` checks one explicit directory scope.
- [ ] `diagrampilot check <source-file>` checks one explicit source file.
- [ ] `diagrampilot check --json` emits aggregate JSON to stdout.
- [ ] JSON output includes all checked sources, including fresh sources.
- [ ] JSON artifact results include expected/actual provenance comparison details without embedding raw SVG metadata text.
- [ ] Text success output reports checked DiagramPilot Source File count and fresh SVG status.
- [ ] Text success output does not list every checked source by default.
- [ ] Text no-source output says no DiagramPilot Source Files were found and exits `0`.
- [ ] Text failure output reports invalid sources, missing artifacts, and stale artifacts with repair commands.
- [ ] Text stale artifact output shows stale reason names without dumping full hashes or versions.
- [ ] Invalid sources skip artifact freshness and point to `diagrampilot validate <source>`.
- [ ] Missing or stale SVG artifacts point to `diagrampilot render <source> --out <expected-svg>`.
- [ ] Exit code is `0` for success and no-source directory scopes.
- [ ] Exit code is `1` for command errors, invalid sources, missing artifacts, unreadable/malformed artifacts, missing provenance, and stale artifacts.
- [ ] `check` produces no command write intents.
- [ ] v1 supports no `--quiet` and rejects unknown options.
- [ ] Existing `validate`, `render`, and `export` command planning behavior continues to pass.
- [ ] CLI smoke coverage proves real `diagrampilot check` execution.

## Blocked by

- [32 Add repo workflow source discovery](./32-add-repo-workflow-source-discovery.md)
- [33 Add SVG provenance freshness checking](./33-add-svg-provenance-freshness-checking.md)

## Validation plan

```bash
npm test
(cd demo-projects/checkout && node ../../packages/cli/dist/index.js check)
node packages/cli/dist/index.js check demo-projects/checkout --json
```
