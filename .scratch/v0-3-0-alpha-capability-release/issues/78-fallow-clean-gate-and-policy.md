Status: completed
Issue Version: 0.2.16

# Fallow clean gate and policy

Make Fallow clean as an intentional v0.3.0 pre-closeout quality gate.
Duplicate, health, and dead-code debt should not remain parked in baselines.
Repository policy should say that Fallow baselines are expected to stay empty
after this cleanup, with narrow documented exceptions only for static-analysis
limitations.

## Acceptance Criteria

- [x] `fallow-baselines/dead-code.json` remains empty of findings.
- [x] `fallow-baselines/dupes.json` has no remaining clone groups, and the
  duplicate baseline is no longer wired into the Fallow gate.
- [x] `fallow-baselines/health.json` has no remaining health findings, and the
  health baseline is no longer wired into the Fallow gate.
- [x] `npm run audit:fallow` passes without relying on any non-empty Fallow
  debt baseline.
- [x] `npm run audit:fallow:changed` passes without relying on any Fallow debt
  baseline.
- [x] `.fallowrc.jsonc` keeps only narrow commented exceptions for intentional
  package edges or static-analysis limitations.
- [x] `docs/development/maintainability.md` documents that Fallow baselines
  should stay empty after cleanup, and future findings should be fixed rather
  than parked in baselines except for narrow documented tool limitations.
- [x] The v0.3.0 closeout issue can depend on this issue as the final Fallow
  quality gate.

## Implementation Notes

- Removed health and duplicate baseline inputs from the GitHub pull request
  Fallow action while keeping the empty dead-code baseline.
- Removed health and duplicate debt baseline flags from the local
  `audit:fallow`, `audit:fallow:dupes`, `audit:fallow:health`, and
  `audit:fallow:changed` script path.
- Added regression tests for the clean-gate script contract, empty committed
  baseline files, and maintainability policy wording.
- Updated maintainability policy to state that future Fallow findings should be
  fixed instead of parked in baselines, with only narrow documented
  static-analysis limitations represented in `.fallowrc.jsonc`.

## Validation Plan

- [x] `node --test test/github-actions-ci.test.mjs`
- [x] `node --test test/fallow-clean-gate-policy.test.mjs`
- [x] `npm test`
- [x] `npm run audit:fallow`
- [x] `npm run audit:fallow:changed`
- [x] `git diff --check`

## Links

- Depends on cleanup issues 76 and 77.
- Unblocks issue 79 v0.3.0 closeout.
