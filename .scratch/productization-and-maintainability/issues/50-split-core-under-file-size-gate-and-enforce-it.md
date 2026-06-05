Status: completed

# Split core under file-size gate and enforce it

## Parent

- [PRD](../PRD.md)

## What to build

Split `packages/core/src/index.ts` under the 1000 LOC hard gate using real core
seams. Enable the file-size gate as a failing test or equivalent repository
validation once the core violation is removed.

## Acceptance criteria

- [x] `packages/core/src/index.ts` is below 1000 LOC.
- [x] Every authored implementation and test file included by the gate is below
      1000 LOC after this slice, or a later CLI-specific blocker is explicitly
      documented.
- [x] Core exports preserve the existing public package API.
- [x] Splits follow existing responsibilities such as source loading,
      validation, topology, diagnostics, schema, provenance, discovery, and repo
      workflow checks.
- [x] No new package is added solely to move code around.
- [x] Existing tests continue to pass.
- [x] The file-size gate is enforced in repository validation once current
      included violations are removed.

## Blocked by

- [49 Add maintainability file-size gate definition](./49-add-maintainability-file-size-gate-definition.md)

## Implementation notes

- Split the core package facade into focused modules for version/schema,
  DiagramSpec topology, validation, source loading and diagnostics, source
  discovery, SVG provenance/freshness, and repo workflow wiring.
- Kept `packages/core/src/index.ts` as the public package facade so existing
  `@diagrampilot/core` exports remain available from the same package entry.
- Updated repo workflow internals to import types from the new focused modules
  instead of through the facade.
- Added repository-level maintainability gate coverage for the current checkout.
- Changed `npm run audit:maintainability` from advisory reporting to hard
  enforcement by exiting nonzero when violations are present.

## Validation plan

```bash
npm run build
npm test
npm run audit:maintainability
```

Validation completed:

- `npm test` passed 125 tests.
- `npm run audit:maintainability` checked 44 files and reported no violations.
