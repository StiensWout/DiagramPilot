Status: completed

# Add maintainability file-size gate definition

## Parent

- [PRD](../PRD.md)

## What to build

Add the file-size gate definition and audit tooling for authored
implementation and test files. The gate is hard by the end of the phase, but
this first slice may report existing violations before the core split slice
enables full enforcement.

## Acceptance criteria

- [x] The gate threshold is 1000 LOC.
- [x] The included paths are `packages/**/*.ts`, `test/**/*.mjs`,
      `website/src/**/*`, and `website/scripts/**/*`.
- [x] Generated output, build artifacts, synced Starlight docs, schema
      artifacts, SVGs, other generated artifacts, Markdown docs, PRDs, issue
      files, lockfiles, and vendored assets are excluded.
- [x] The audit reports each violating file with its line count.
- [x] Current known violations are documented before refactor work begins.
- [x] The gate implementation has focused tests for include and exclude rules.
- [x] The final enforcement point is documented as blocked by the core split.

## Implementation notes

- Added `MAINTAINABILITY_FILE_SIZE_GATE` and
  `auditMaintainabilityFileSizes` to `@diagrampilot/core`.
- Added focused gate tests covering the 1000 LOC threshold, the configured
  included paths, and the requested generated/docs/assets/vendor exclusions.
- Added `npm run audit:maintainability`, which builds the repo and runs the
  advisory audit. It reports violations with line counts and exits
  successfully until the core split enables hard enforcement.
- Documented the gate in `docs/development/maintainability.md` and linked it
  from the roadmap.
- Current known violation before refactor work:
  `packages/core/src/index.ts` at 2366 LOC. `packages/cli/src/index.ts` is 985
  LOC, below the threshold but still close enough to remain part of the phase.
- Hard enforcement remains blocked by issue 50,
  `Split core under file-size gate and enforce it`.

## Validation plan

```bash
find packages test website/src website/scripts -type f | sort
npm run audit:maintainability
npm test
```

Validation completed:

- `find packages test website/src website/scripts -type f | sort`
- `npm run audit:maintainability` reported 33 checked files and one advisory
  violation: `packages/core/src/index.ts` at 2366 LOC.
- `npm test` passed 123 tests.
