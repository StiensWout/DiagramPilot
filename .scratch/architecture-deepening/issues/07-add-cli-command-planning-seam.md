Status: ready-for-agent

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

- [ ] Command planning can represent exit code, stdout, stderr, and write intent for validation, export, and render paths.
- [ ] Filesystem reads and writes remain at the edge of command execution.
- [ ] Tests cover command behaviour directly at the planning seam for success, validation failure, parse/read failure, missing arguments, `--out`, stdout, and stderr cases.
- [ ] Real executable smoke tests remain for package startup, validate, export, render, and init.
- [ ] Existing public CLI behaviour remains unchanged.

## Blocked by

- [02 Reuse validated DiagramSpec loading in export and render](./02-reuse-validated-diagramspec-loading-in-export-and-render.md)
- [03 Centralize Repairable Validation Error diagnostics](./03-centralize-repairable-validation-error-diagnostics.md)
