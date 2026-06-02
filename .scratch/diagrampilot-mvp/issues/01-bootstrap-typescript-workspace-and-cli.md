Status: completed

# Bootstrap the TypeScript workspace and `diagrampilot` executable

## Parent

- [PRD](../PRD.md)

## What to build

Create the initial TypeScript package workspace for DiagramPilot and wire up a
real `diagrampilot` executable that can be invoked locally. This slice is done
when the repository can install dependencies, build the workspace, and run a
minimal CLI entrypoint end to end.

## Acceptance criteria

- [x] The repo has a TypeScript package workspace aligned with the MVP
      architecture.
- [x] A local `diagrampilot` executable runs successfully through the package
      manager or built artifact.
- [x] A smoke test proves the CLI starts and returns a predictable success
      result.

## Blocked by

None - can start immediately

## Comments

Implemented 2026-06-02:

- Added npm workspaces for the MVP TypeScript package shape.
- Added the initial `diagrampilot` CLI package and version entrypoint.
- Added a smoke test that runs `diagrampilot --version` through
  `npm exec --workspace diagrampilot`.
- Verified with `npm test`.

Follow-up 2026-06-02:

- Fixed the CLI smoke test to remove inherited `FORCE_COLOR` and `NO_COLOR`
  values before spawning `npm exec`, so terminal color settings do not create
  stderr warnings that fail the test.
- User validation plan:
  - Run `npm test`.
  - Run `npm exec --workspace diagrampilot -- diagrampilot --version`.
  - Expect the test summary to report `pass 1` and `fail 0`, and the version
    command to print `diagrampilot 0.1.0`.
