Status: completed
Issue Version: 0.2.15

# Fallow health cleanup before v0.3.0

## Parent

- [PRD](../PRD.md)

## What to build

Eliminate the existing Fallow health baseline before v0.3.0 closeout. This is
an intentional tech-debt reduction issue focused on complexity and CRAP
findings, with behavior preserved and regression coverage maintained.

Original baseline target: `fallow-baselines/health.json` contained 98 findings
across 34 files, including critical complexity, critical CRAP, high CRAP, and
moderate CRAP findings.

## Acceptance criteria

- [x] Resolve every existing health finding represented in
  `fallow-baselines/health.json`.
- [x] Refresh `fallow-baselines/health.json` so it has no remaining findings.
- [x] Reduce complexity through small cohesive functions, clearer command
  planning boundaries, validation helpers, and module splits that match existing
  local patterns.
- [x] Preserve public behavior for CLI, core, MCP, website, scripts, and
  generated artifact workflows.
- [x] Add or update regression coverage for extracted decision logic or split
  modules.
- [x] Do not hide complexity debt with broad suppressions.

## Implementation notes

- Cleared the unbaselined Fallow health report to zero moderate-or-higher
  findings and regenerated `fallow-baselines/health.json` as an empty health
  debt baseline.
- Split complex CLI planning, argument parsing, workflow config, topology,
  source loading/discovery, workflow artifact, release script, and schema/test
  logic into focused helper functions/modules while preserving public behavior.
- Added regression coverage for D2 export behavior and kept existing CLI,
  workflow, topology, JSON schema, website, release, and maintainability tests
  passing.
- Kept the maintainability file-size gate intact and split/refined files so all
  included authored files are under the 500 LOC limit.

## Validation plan

- [x] `npm test`
- [x] `npm run audit:fallow:health`
- [x] `npm run audit:fallow`
- [x] `npm run audit:fallow:changed`
- [x] `git diff --check`
