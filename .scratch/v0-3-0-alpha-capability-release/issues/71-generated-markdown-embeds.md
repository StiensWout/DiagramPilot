Status: completed
Issue Version: 0.2.8

# Generated Markdown embeds

## Parent

- [PRD](../PRD.md)

## What to build

Add generated Markdown embeds as standalone generated files. DiagramPilot
should not edit arbitrary prose documents in place. Configured Markdown embeds
should depend on the freshness of referenced artifacts, so a clean embed cannot
hide a stale diagram image or export.

## User stories covered

- 37-39

## Acceptance criteria

- [x] Repo Workflow Configuration can declare generated Markdown embed
      outputs.
- [x] Markdown embeds are written as standalone generated files.
- [x] DiagramPilot does not edit arbitrary existing prose documents in place.
- [x] Markdown embeds reference configured generated artifacts using stable
      relative paths.
- [x] Markdown embed freshness depends on referenced artifact freshness.
- [x] `check` reports stale or missing Markdown embeds without writing.
- [x] `generate` writes Markdown embeds after required referenced artifacts are
      generated or verified.
- [x] `generate --json` includes Markdown embed write results.
- [x] All Fallow findings discovered during this issue are resolved as part of
      this issue.
- [x] Tests cover standalone embed generation, no in-place prose edits,
      relative references, stale referenced artifacts, stale embeds, check
      output, generate output, and JSON output.

## Blocked by

- [69 Configured artifact mappings and freshness](./69-configured-artifact-mappings-and-freshness.md)
- [70 Generate command for configured outputs](./70-generate-command-for-configured-outputs.md)

## Validation plan

```bash
npm test
npm run audit:fallow
npm run audit:fallow:changed
node packages/cli/dist/index.js check demo-projects/checkout --json
git diff --check
```

## Implementation notes

- Added configured `format: markdown` support as standalone generated embed
  files, written after referenced artifacts and included in generate write
  results.
- Markdown embeds render a generated header, source title, a primary SVG/PNG
  image reference, and links to additional configured Mermaid, D2, DOT, or PNG
  artifacts with paths relative to the embed file.
- `check` now compares Markdown embed content and reports the embed stale when a
  referenced configured artifact is missing, unreadable, unchecked, or stale.
- `generate` does not edit arbitrary prose documents in place; smoke coverage
  verifies an existing `docs/guide.md` remains unchanged.
- Updated public docs and installation cleanup guidance to describe standalone
  Markdown embed artifacts.
- Completed a Fallow cleanup pass around changed code: split configured artifact
  path and Markdown freshness helpers out of the main checker, shared source
  loading/path helpers between check and generate, reduced CLI parser/planner
  duplication, and kept authored files under the 500 LOC maintainability gate.
- Required Fallow gates pass with no introduced findings. A no-baseline snapshot
  still shows inherited baseline debt, but this issue reduced it to 0 dead-code
  issues, 80 health findings, and 115 duplicate groups.

## Validation results

- `npm test` passed: 214 tests.
- `npm run audit:fallow` passed.
- `npm run audit:fallow:changed` passed.
- `node packages/cli/dist/index.js check demo-projects/checkout --json` passed
  with `ok: true`, 1 checked source, 1 fresh source, and 0 issues.
- `git diff --check` passed.
