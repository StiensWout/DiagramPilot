Status: planned

# Repo Workflow Check

## Problem Statement

DiagramPilot has a working single-source compiler workflow: validate one
DiagramPilot Source File, render one SVG Derived Artifact, and optionally export
Mermaid or D2 text. That workflow is explicit and safe, but it leaves repository
review and CI checks manual. Maintainers currently need to know which source
files exist, which SVG artifacts are expected, and whether those artifacts still
match the source and generation context recorded in provenance metadata.

This creates friction for AI coding agents and maintainers reviewing repository
diagrams. `validate` correctly checks source correctness only, and public docs
currently recommend re-rendering and checking the Git diff to detect stale SVG
artifacts. That works for one diagram, but it does not scale cleanly to a
repository workflow.

## Solution

Add a read-only Repo Workflow Check as a new `diagrampilot check` command.

The first Repo Workflow Check should discover DiagramPilot Source Files in a
local Check Scope, validate each source through the existing validated
DiagramSpec loading path, derive the Expected SVG Artifact using the
next-to-source same-stem convention, and check SVG Artifact Freshness by reading
DiagramPilot provenance metadata. It should not render, write, update, or
rewrite files.

`check` is separate from `validate`. `validate` remains the single-source
correctness command. `check` becomes the repo-level review and CI command for
diagram workflow health.

## User Stories

1. As an AI coding agent, I want one command to check repo diagram workflow health, so that I can review diagrams without manually enumerating every source file.
2. As a maintainer, I want `validate` to remain single-source validation, so that existing source repair loops do not unexpectedly scan the repo or check artifacts.
3. As a maintainer, I want `check` to discover DiagramPilot Source Files recursively from a local scope, so that repository CI can cover committed diagrams.
4. As an AI coding agent, I want `check` to accept one explicit source file, so that I can rerun a narrow check after repairing one diagram.
5. As a maintainer, I want discovery to ignore common dependency, build, and VCS directories, so that generated trees do not produce noise.
6. As a maintainer, I want discovery to use only documented DiagramPilot Source File extensions, so that `.dp.yaml` and `.dp.json` remain the source contract.
7. As a maintainer, I want each valid source to have an Expected SVG Artifact, so that diagrams are review-ready by default.
8. As a maintainer, I want missing Expected SVG Artifacts to fail `check`, so that CI catches unrendered source changes.
9. As an AI coding agent, I want stale SVG artifacts to identify their reason, so that I can choose the right repair command.
10. As a maintainer, I want SVG Artifact Freshness to compare source hash, DiagramPilot version, renderer name, and renderer version, so that artifacts stay tied to their generation context.
11. As an AI coding agent, I want missing or malformed provenance reported separately, so that artifact problems are not flattened into vague stale output.
12. As a maintainer, I want `check` to be provenance-only in v1, so that it stays fast and read-only.
13. As a maintainer, I want `check` to skip artifact freshness for invalid sources, so that artifact output is not misleading.
14. As an AI coding agent, I want `check --json`, so that structured repo workflow results can be consumed by agents and scripts.
15. As a human CLI user, I want concise text output with repair commands, so that multi-file failures remain readable.
16. As a maintainer, I want public docs updated after `check` lands, so that the documented review workflow uses the implemented command.

## Implementation Decisions

- The next phase is Product Capability work in the Repo Workflow area.
- The primary command is `diagrampilot check`.
- `check` is separate from `validate`; `validate` remains source correctness for one explicit DiagramPilot Source File.
- The first `check` scope is source discovery, validation, and SVG Artifact Freshness.
- Mermaid, D2, DOT, and PNG artifact freshness are deferred.
- The first Expected SVG Artifact convention is next-to-source, same filename stem.
- No source schema change, artifact mapping config, or metadata artifact field is included in v1.
- The default Check Scope is the current working directory.
- `diagrampilot check <directory>` checks that directory recursively.
- `diagrampilot check <source-file>` checks one explicit DiagramPilot Source File and its Expected SVG Artifact.
- v1 supports zero or one path argument.
- Directory-scoped provenance source path comparisons use source paths relative to the Check Scope.
- Discovery accepts only `*.dp.yaml` and `*.dp.json`.
- Discovery ignores common dependency, build, and VCS directories by default.
- Discovered sources and reported source results should be sorted by stable normalized relative path.
- v1 has no configurable ignore list.
- Finding no DiagramPilot Source Files in a directory scope is a successful no-op.
- Missing or nonexistent explicit paths are command failures.
- Missing Expected SVG Artifacts are check failures.
- Invalid DiagramPilot Source Files are check failures.
- Artifact freshness is skipped for invalid sources.
- SVG Artifact Freshness is provenance-only in v1.
- `check` does not render, write, update artifacts, or rewrite source files.
- Freshness compares source path, source SHA-256 hash, DiagramPilot version, renderer name, and renderer version.
- Missing provenance is an artifact failure.
- Unreadable SVG, malformed SVG/provenance, missing provenance, stale provenance, fresh artifact, and unchecked artifact should be distinct artifact states.
- Text output should summarize findings and point to `validate` or `render` repair commands.
- Text success output should summarize checked source count and freshness status without listing every source.
- Text stale artifact output should show stale reason names without dumping full expected/actual hashes or versions.
- Text output should not embed full repairable validation diagnostics for invalid sources.
- `check --json` uses an aggregate result shape rather than the single-file `validate --json` shape.
- `check --json` includes all checked sources, including fresh sources.
- `check --json` includes compact expected/actual provenance comparison details for SVG artifact results.
- Binary exit codes are enough for v1: `0` for success/no-op, `1` for command or check failures.
- v1 has no `--quiet`.
- No new package is planned for v1; reusable check primitives should live outside CLI formatting code where future adapters can reuse them.
- ADR 0007 records why Repo Workflow Check is separate, read-only, and provenance-only.

## Testing Decisions

- Discovery tests should cover default current-directory scope, explicit directory scope, explicit source-file scope, supported extensions, ignored directories, and no-source no-op behavior.
- SVG freshness tests should cover fresh, missing artifact, unreadable artifact, malformed SVG/provenance, missing provenance, source hash mismatch, source path mismatch, DiagramPilot version mismatch, renderer mismatch, and invalid source skip behavior.
- Command planning tests should cover text output, JSON output, exit codes, no writes, argument errors, no-source success, and mixed valid/stale/invalid source results.
- CLI smoke tests should cover real `diagrampilot check` execution against a temporary fixture or the Checkout Demo Project.
- Public docs tests should cover the documented `check` workflow once the command lands.
- Existing `validate`, `render`, and `export` command behavior must continue to pass.

## Out of Scope

- Rendering from `check`.
- `--fix`, auto-render, or artifact update modes.
- Freshness checks for Mermaid, D2, DOT, or PNG artifacts.
- Repository-wide source formatting.
- Configurable artifact mappings.
- Configurable ignore patterns.
- Multiple path arguments.
- Git root auto-detection.
- Exact SVG byte comparison.
- MCP implementation.
- Project analyzers.
- Watch mode.
- Hosted workspace dependency.

## Issue Slices

- [32 Add repo workflow source discovery](./issues/32-add-repo-workflow-source-discovery.md)
- [33 Add SVG provenance freshness checking](./issues/33-add-svg-provenance-freshness-checking.md)
- [34 Add check command planning with text and JSON output](./issues/34-add-check-command-planning-with-text-and-json-output.md)
- [35 Update public docs and demo workflow around check](./issues/35-update-public-docs-and-demo-workflow-around-check.md)

## Validation

The full phase should end with:

```bash
npm test
(cd demo-projects/checkout && node ../../packages/cli/dist/index.js check)
node packages/cli/dist/index.js check demo-projects/checkout --json
```
