Status: completed
Issue Version: 0.2.6

# Configured artifact mappings and freshness

## Parent

- [PRD](../PRD.md)

## What to build

Extend Repo Workflow Configuration with artifact mappings, source globs, output
format declarations, output path templates, and freshness checks for configured
artifacts. Matched config mappings should replace the default SVG expectation
for the matched source, while unmatched sources keep zero-config behavior.

Configured artifact failures must not be hidden by source ignore patterns.
Freshness for text artifacts should use content comparison. SVG should continue
using provenance. PNG should use provenance if feasible; otherwise v0.3.0 may
use presence-only freshness with clear docs and tests.

## User stories covered

- 28-32, 34-36

## Acceptance criteria

- [x] Artifact mapping entries accept exactly one of `source` or `sourceGlob`.
- [x] Output formats are closed to `svg`, `png`, `mermaid`, `d2`, `dot`, and
      `markdown`.
- [x] Path templates support only `{stem}`, `{sourceDir}`, `{sourcePath}`, and
      `{format}`.
- [x] Matched mappings replace the default SVG expectation for that source.
- [x] Unmatched sources keep the default SVG expectation.
- [x] Source ignore patterns do not suppress failures for explicitly
      configured artifacts.
- [x] Mermaid, D2, and DOT freshness use content comparison.
- [x] SVG freshness continues using provenance.
- [x] PNG freshness uses provenance if feasible, or presence-only freshness
      with documented v0.3.0 behavior.
- [x] `check` reports configured artifact failures without writing files.
- [x] `check --json` returns structured configured artifact results.
- [x] Tests cover explicit sources, source globs, replacement of default SVG
      expectations, unmatched defaults, ignored discovery, configured artifact
      failures, text freshness, SVG freshness, PNG freshness, template
      variables, and invalid formats.

## Blocked by

- [65 Add DOT export](./65-add-dot-export.md)
- [66 Add PNG rendering](./66-add-png-rendering.md)
- [68 Repo Workflow Configuration foundation](./68-repo-workflow-configuration-foundation.md)

## Validation plan

```bash
npm test
node scripts/audit-maintainability-file-sizes.mjs
npm run check:package-readiness
node packages/cli/dist/index.js check demo-projects/checkout --json
git diff --check
```

## Implementation notes

- Extended Repo Workflow Configuration with `artifacts` mappings. Each mapping
  uses exactly one of `source` or `sourceGlob` and declares a non-empty
  `outputs` list.
- Validated configured output formats as a closed set: `svg`, `png`,
  `mermaid`, `d2`, `dot`, and `markdown`.
- Validated configured selectors and output paths as config-directory-relative
  paths, rejecting absolute paths and `..` traversal.
- Added output path template expansion for `{stem}`, `{sourceDir}`,
  `{sourcePath}`, and `{format}` only.
- Implemented mapping resolution for explicit sources and source globs.
  Matched mappings replace the default next-to-source SVG expectation; sources
  that do not match any mapping keep zero-config SVG behavior.
- Ensured explicitly configured `source` entries are checked even when
  `sources.ignore` would suppress source discovery, so configured artifact
  failures are not hidden by ignore patterns.
- Added structured configured artifact results under each source's `artifacts`
  list while preserving the existing `artifact` field for zero-config SVG
  callers.
- Added configured freshness checks: SVG continues to use provenance, Mermaid,
  D2, and DOT use content comparison, and PNG uses documented v0.3.0
  presence-only freshness.
- Threaded text-export freshness through a core dependency seam so `core` stays
  independent from export packages while the CLI supplies the real Mermaid, D2,
  and DOT exporters during `check`.
- Updated CLI text output to report configured artifact failures with
  format-specific repair commands and to keep `check` read-only.
- Updated public and internal current-state docs, bumped shared DiagramPilot
  release metadata to `0.2.6`, and refreshed checkout demo SVG provenance.
- Split configured artifact and check-output tests into focused files to keep
  authored test files under the maintainability gate.
- Lowered the maintainability file-size gate to 500 LOC and split/refactored
  oversized core, test, and website script files so the stricter gate passes.

## Validation results

- `node scripts/bump-release-version.mjs 0.2.6` passed.
- `npm run build && cd demo-projects/checkout && node ../../packages/cli/dist/index.js render docs/architecture.dp.yaml --out docs/architecture.svg`
  passed and refreshed demo SVG provenance at `0.2.6`.
- `npm test` passed: 202 tests.
- `node packages/cli/dist/index.js check demo-projects/checkout --json` passed
  with 1 fresh source and demo SVG provenance version `0.2.6`.
- `node scripts/check-release-version.mjs` passed at `0.2.6`.
- `npm run check:package-readiness` passed for 7 public packages.
- `node scripts/audit-maintainability-file-sizes.mjs` passed with gate `500 LOC`
  and no violations across 83 checked files.
- `git diff --check` passed.

## User-facing docs links

- https://diagrampilot.com/docs/agents/quickstart.md
- https://diagrampilot.com/docs/agents/installation.md
- https://diagrampilot.com/llms.txt

## Known limitations

- Configured PNG freshness is presence-only in v0.3.0. PNG byte or provenance
  freshness remains deferred until readable PNG provenance is available.
- `markdown` is accepted as a configured output format for the v0.3.0 config
  shape, but generated Markdown embed freshness is scoped to issue 71.
