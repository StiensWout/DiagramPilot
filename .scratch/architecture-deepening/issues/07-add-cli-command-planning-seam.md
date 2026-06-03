Status: completed

# Add CLI command planning seam

## Parent

- [PRD](../PRD.md)

## What to build

Add a command planning seam so CLI behaviour can be tested directly without
spawning the executable for every rule. Command planning should concentrate the
externally visible result of a command: exit code, stdout content, stderr
content, and file-write intent. Filesystem, stream, and process execution should
remain adapters around that behaviour.

This slice should keep a small set of real executable smoke tests while moving
most command behaviour checks to the deeper seam.

## Acceptance criteria

- [x] Command planning can represent exit code, stdout, stderr, and write intent for validation, export, and render paths.
- [x] Filesystem reads and writes remain at the edge of command execution.
- [x] Tests cover command behaviour directly at the planning seam for success, validation failure, parse/read failure, missing arguments, `--out`, stdout, and stderr cases.
- [x] Real executable smoke tests remain for package startup, validate, export, render, and init.
- [x] Existing public CLI behaviour remains unchanged.

## Blocked by

- [02 Reuse validated DiagramSpec loading in export and render](./02-reuse-validated-diagramspec-loading-in-export-and-render.md)
- [03 Centralize Repairable Validation Error diagnostics](./03-centralize-repairable-validation-error-diagnostics.md)

## Comments

Implemented 2026-06-03:

- Added `planCommand()` plus `CommandPlan` and `CommandWriteIntent` in the CLI package.
- Moved validate, export, and render command behaviour into planning functions that return exit code, stdout, stderr, and write intents.
- Kept filesystem writes at command execution by having `run()` materialize planned writes after planning.
- Kept filesystem reads behind planning dependencies so command behaviour can be tested without spawning the executable or touching real files.
- Left `init` as the filesystem-heavy command path and kept real executable smoke coverage for package startup, init, validate, export, and render.
- Added focused planning-seam tests for success, semantic validation failure, parse/read failure, missing arguments, `--out`, stdout, and stderr behaviour.
- Reduced `test/cli-smoke.test.mjs` to smoke coverage instead of using process-spawn tests for most command rules.

Validation plan:

- Run the focused planning, smoke, and architecture coverage:

  ```bash
  npm run build && node --test test/cli-command-planning.test.mjs test/cli-smoke.test.mjs test/cli-workflow-architecture.test.mjs
  ```

- Run the full workspace suite:

  ```bash
  npm test
  ```

Validation performed 2026-06-03:

- `npm run build && node --test test/cli-command-planning.test.mjs test/cli-smoke.test.mjs test/cli-workflow-architecture.test.mjs` passed 22 tests.
- `npm test` passed 41 tests.
