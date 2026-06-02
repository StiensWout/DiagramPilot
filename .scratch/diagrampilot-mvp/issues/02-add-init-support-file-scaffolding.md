Status: ready-for-agent

# Add `diagrampilot init` support-file scaffolding

## Parent

- [PRD](../PRD.md)

## What to build

Implement `diagrampilot init` so it creates or updates DiagramPilot support
files only. The command must be low-risk for adoption: it should not scan the
codebase, generate a DiagramPilot Source File, or create Derived Artifacts.

## Acceptance criteria

- [ ] `diagrampilot init` completes successfully from a repo root.
- [ ] The command creates or updates only support files needed for
      DiagramPilot adoption.
- [ ] Tests prove `init` does not scan the repository or generate diagrams by
      default.

## Blocked by

- [01 Bootstrap the TypeScript workspace and `diagrampilot` executable](./01-bootstrap-typescript-workspace-and-cli.md)
