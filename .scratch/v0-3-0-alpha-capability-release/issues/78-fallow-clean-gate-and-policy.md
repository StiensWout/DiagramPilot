Status: ready-for-agent
Issue Version: 0.2.16

# Fallow clean gate and policy

## Parent

- [PRD](../PRD.md)

## What to build

Make Fallow clean as an intentional v0.3.0 pre-closeout quality gate. Duplicate,
health, and dead-code debt should not remain parked in baselines. Repository
policy should say that Fallow baselines are expected to stay empty after this
cleanup, with narrow documented exceptions only for static-analysis limitations.

## Acceptance criteria

- `fallow-baselines/dead-code.json` remains empty of findings.
- `fallow-baselines/dupes.json` has no remaining clone groups, or duplicate
  baseline wiring is removed from the Fallow gate.
- `fallow-baselines/health.json` has no remaining health findings, or health
  baseline wiring is removed from the Fallow gate.
- `npm run audit:fallow` passes without relying on any non-empty Fallow debt
  baseline.
- `npm run audit:fallow:changed` passes without relying on any non-empty Fallow
  debt baseline.
- `.fallowrc.jsonc` contains only narrow, commented exceptions for intentional
  package edges or static-analysis limitations.
- `docs/development/maintainability.md` documents the new policy: Fallow
  baselines should stay empty after the cleanup, and future findings should be
  fixed rather than parked in baselines except for narrow documented tool
  limitations.
- The v0.3.0 closeout issue can depend on this issue as the final Fallow quality
  gate.

## Implementation notes

- This issue is the final verification and policy cleanup after issues 76 and
  77 reduce the duplicate and health baselines.
- Do not broaden the Fallow command surface or introduce hosted-workspace
  dependencies for core workflows.

## Validation plan

```bash
npm test
npm run audit:fallow
npm run audit:fallow:changed
git diff --check
```
