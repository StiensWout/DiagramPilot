Status: ready-for-agent

# Parse JSON DiagramPilot Source Files from explicit paths

## Parent

- [PRD](../PRD.md)

## What to build

Teach the CLI to load JSON DiagramPilot Source Files from explicit file paths
for validation workflows. This should mirror the YAML path-based behavior while
keeping JSON parse failures isolated from semantic validation.

## Acceptance criteria

- [ ] `diagrampilot validate <path>` reads a JSON DiagramPilot Source File from
      an explicit path.
- [ ] Broken JSON produces a parse failure without continuing into misleading
      semantic validation.
- [ ] CLI tests cover successful JSON parsing and parse-failure behavior.

## Blocked by

- [01 Bootstrap the TypeScript workspace and `diagrampilot` executable](./01-bootstrap-typescript-workspace-and-cli.md)
