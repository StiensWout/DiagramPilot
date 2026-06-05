Status: completed

# Split CLI under file-size gate

## Parent

- [PRD](../PRD.md)

## What to build

Keep `packages/cli/src/index.ts` and related CLI authored files below the 1000
LOC hard gate by extracting command planning, argument parsing, output
formatting, and execution-edge responsibilities where that matches existing
architecture.

## Acceptance criteria

- [x] `packages/cli/src/index.ts` is below 1000 LOC.
- [x] CLI command behaviour for `init`, `check`, `validate`, `render`, and
      `export` is unchanged.
- [x] Existing command planning seams remain testable without spawning the
      executable for every rule.
- [x] Files are split by responsibility rather than by arbitrary line chunks.
- [x] Validation, diagnostics, render/export orchestration, and filesystem
      writes remain at the intended package boundaries.
- [x] CLI smoke tests and focused command-planning tests continue to pass.
- [x] The file-size gate passes for CLI-authored files.

## Blocked by

- [49 Add maintainability file-size gate definition](./49-add-maintainability-file-size-gate-definition.md)

## Validation plan

```bash
npm run build
node --test test/cli-command-planning.test.mjs test/cli-smoke.test.mjs
npm test
npm run audit:maintainability
```

## Implementation notes

- Split `packages/cli/src/index.ts` into responsibility-focused modules:
  `argument-parsing.ts`, `cli-output.ts`, `command-planning.ts`,
  `execution.ts`, `init-command.ts`, and `types.ts`.
- Kept `packages/cli/src/index.ts` as the executable and package export
  surface for `run`, `planCommand`, and related public types.
- Added a focused command-planning seam test that imports the planner from
  `packages/cli/dist/command-planning.js`, so planning behavior remains
  testable without spawning the CLI executable.
- Updated CLI architecture boundary tests to inspect the extracted command
  planning module where validation, diagnostics, and repo workflow delegation
  now live.
- Current CLI source file sizes: `index.ts` 55 LOC, `command-planning.ts` 389
  LOC, `argument-parsing.ts` 289 LOC, `init-command.ts` 135 LOC,
  `cli-output.ts` 120 LOC, `execution.ts` 24 LOC, and `types.ts` 18 LOC.

## Validation results

```bash
npm run build
node --test test/cli-command-planning-seam.test.mjs
node --test test/cli-command-planning.test.mjs test/cli-smoke.test.mjs
node --test test/cli-workflow-architecture.test.mjs
npm test
npm run audit:maintainability
```

All commands passed. The maintainability audit checked 51 files and reported no
violations.
