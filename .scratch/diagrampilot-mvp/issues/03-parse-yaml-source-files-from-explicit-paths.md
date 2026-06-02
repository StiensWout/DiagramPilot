Status: ready-for-agent

# Parse YAML DiagramPilot Source Files from explicit paths

## Parent

- [PRD](../PRD.md)

## What to build

Teach the CLI to load YAML DiagramPilot Source Files from explicit file paths
for validation workflows. This slice should establish the explicit-path
contract and return clean parse failures when YAML syntax is broken.

## Acceptance criteria

- [ ] `diagrampilot validate <path>` reads a YAML DiagramPilot Source File from
      an explicit path.
- [ ] Broken YAML produces a parse failure without continuing into misleading
      semantic validation.
- [ ] CLI tests cover successful YAML parsing and parse-failure behavior.

## Blocked by

- [01 Bootstrap the TypeScript workspace and `diagrampilot` executable](./01-bootstrap-typescript-workspace-and-cli.md)
