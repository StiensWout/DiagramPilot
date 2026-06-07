Status: ready-for-agent
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

- [ ] Artifact mapping entries accept exactly one of `source` or `sourceGlob`.
- [ ] Output formats are closed to `svg`, `png`, `mermaid`, `d2`, `dot`, and
      `markdown`.
- [ ] Path templates support only `{stem}`, `{sourceDir}`, `{sourcePath}`, and
      `{format}`.
- [ ] Matched mappings replace the default SVG expectation for that source.
- [ ] Unmatched sources keep the default SVG expectation.
- [ ] Source ignore patterns do not suppress failures for explicitly
      configured artifacts.
- [ ] Mermaid, D2, and DOT freshness use content comparison.
- [ ] SVG freshness continues using provenance.
- [ ] PNG freshness uses provenance if feasible, or presence-only freshness
      with documented v0.3.0 behavior.
- [ ] `check` reports configured artifact failures without writing files.
- [ ] `check --json` returns structured configured artifact results.
- [ ] Tests cover explicit sources, source globs, replacement of default SVG
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
node packages/cli/dist/index.js check demo-projects/checkout --json
git diff --check
```
