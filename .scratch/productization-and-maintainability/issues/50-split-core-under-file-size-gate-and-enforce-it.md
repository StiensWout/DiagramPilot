Status: ready-for-agent

# Split core under file-size gate and enforce it

## Parent

- [PRD](../PRD.md)

## What to build

Split `packages/core/src/index.ts` under the 1000 LOC hard gate using real core
seams. Enable the file-size gate as a failing test or equivalent repository
validation once the core violation is removed.

## Acceptance criteria

- [ ] `packages/core/src/index.ts` is below 1000 LOC.
- [ ] Every authored implementation and test file included by the gate is below
      1000 LOC after this slice, or a later CLI-specific blocker is explicitly
      documented.
- [ ] Core exports preserve the existing public package API.
- [ ] Splits follow existing responsibilities such as source loading,
      validation, topology, diagnostics, schema, provenance, discovery, and repo
      workflow checks.
- [ ] No new package is added solely to move code around.
- [ ] Existing tests continue to pass.
- [ ] The file-size gate is enforced in repository validation once current
      included violations are removed.

## Blocked by

- [49 Add maintainability file-size gate definition](./49-add-maintainability-file-size-gate-definition.md)

## Validation plan

```bash
npm run build
npm test
```
