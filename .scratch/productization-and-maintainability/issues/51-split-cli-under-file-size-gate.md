Status: ready-for-agent

# Split CLI under file-size gate

## Parent

- [PRD](../PRD.md)

## What to build

Keep `packages/cli/src/index.ts` and related CLI authored files below the 1000
LOC hard gate by extracting command planning, argument parsing, output
formatting, and execution-edge responsibilities where that matches existing
architecture.

## Acceptance criteria

- [ ] `packages/cli/src/index.ts` is below 1000 LOC.
- [ ] CLI command behaviour for `init`, `check`, `validate`, `render`, and
      `export` is unchanged.
- [ ] Existing command planning seams remain testable without spawning the
      executable for every rule.
- [ ] Files are split by responsibility rather than by arbitrary line chunks.
- [ ] Validation, diagnostics, render/export orchestration, and filesystem
      writes remain at the intended package boundaries.
- [ ] CLI smoke tests and focused command-planning tests continue to pass.
- [ ] The file-size gate passes for CLI-authored files.

## Blocked by

- [49 Add maintainability file-size gate definition](./49-add-maintainability-file-size-gate-definition.md)

## Validation plan

```bash
npm run build
node --test test/cli-command-planning.test.mjs test/cli-smoke.test.mjs
npm test
```
