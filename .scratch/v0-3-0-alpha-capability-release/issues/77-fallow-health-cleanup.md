Status: ready-for-agent
Issue Version: 0.2.15

# Fallow health cleanup

## Parent

- [PRD](../PRD.md)

## What to build

Eliminate the existing Fallow health baseline before v0.3.0 closeout. This is an
intentional tech-debt reduction issue focused on complexity and CRAP findings,
with behavior preserved and regression coverage maintained.

Current baseline target: `fallow-baselines/health.json` contains 98 findings
across 34 files, including critical complexity, critical CRAP, high CRAP, and
moderate CRAP findings.

## Acceptance criteria

- Resolve every existing health finding represented in
  `fallow-baselines/health.json`.
- Refresh `fallow-baselines/health.json` so it has no remaining findings, or
  update the Fallow gate to run without a health debt baseline.
- Reduce complexity through small cohesive functions, clearer command planning
  boundaries, validation helpers, or module splits that match existing local
  patterns.
- Preserve public behavior for CLI, core, MCP, website, scripts, and generated
  artifact workflows.
- Add or update regression coverage for any extracted decision logic or split
  modules.
- Do not hide complexity debt with broad suppressions. A narrow `.fallowrc.jsonc`
  exception is only acceptable for a documented static-analysis limitation that
  cannot be fixed by code structure.

## Implementation notes

- This issue can depend on duplicate-code cleanup because extracted helpers may
  change the health report.
- Keep refactors focused on Fallow health findings and avoid opportunistic
  product behavior changes.

## Validation plan

```bash
npm test
npm run audit:fallow:health
npm run audit:fallow
npm run audit:fallow:changed
git diff --check
```
