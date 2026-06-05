Status: ready-for-agent

# Add maintainability file-size gate definition

## Parent

- [PRD](../PRD.md)

## What to build

Add the file-size gate definition and audit tooling for authored
implementation and test files. The gate is hard by the end of the phase, but
this first slice may report existing violations before the core split slice
enables full enforcement.

## Acceptance criteria

- [ ] The gate threshold is 1000 LOC.
- [ ] The included paths are `packages/**/*.ts`, `test/**/*.mjs`,
      `website/src/**/*`, and `website/scripts/**/*`.
- [ ] Generated output, build artifacts, synced Starlight docs, schema
      artifacts, SVGs, other generated artifacts, Markdown docs, PRDs, issue
      files, lockfiles, and vendored assets are excluded.
- [ ] The audit reports each violating file with its line count.
- [ ] Current known violations are documented before refactor work begins.
- [ ] The gate implementation has focused tests for include and exclude rules.
- [ ] The final enforcement point is documented as blocked by the core split.

## Validation plan

```bash
find packages test website/src website/scripts -type f | sort
npm test
```
