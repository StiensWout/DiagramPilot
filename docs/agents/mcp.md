# MCP Plan

DiagramPilot should expose a Model Context Protocol server after the CLI and
core validation workflow are useful.

The MCP interface should operate on structured DiagramSpec objects and project
files. It should not be only a raw Mermaid rendering wrapper.

MCP is not part of the MVP.

## Planned Tools

`create_diagram`
: Create a new DiagramPilot source file from structured input.

`validate_diagram`
: Validate a DiagramPilot source file and return repairable errors.

`render_diagram`
: Render a valid DiagramPilot source file to SVG.

`export_diagram`
: Export DiagramSpec to Mermaid, D2, or another supported target.

`add_node`
: Add a node while preserving existing IDs.

`connect_nodes`
: Add an edge between existing nodes.

`update_node`
: Update label, kind, description, icon, or metadata for an existing node.

`list_diagrams`
: Find DiagramPilot source files in the current repository.

## Planned Resources

`diagrampilot://schema`
: Current JSON Schema for DiagramSpec.

`diagrampilot://docs/agents/quickstart`
: Agent quickstart.

`diagrampilot://docs/agents/spec`
: DiagramSpec documentation.

`diagrampilot://examples`
: Canonical examples.

## Behavior Requirements

- Tools should read and write project files with explicit paths.
- Validation should return structured repair messages.
- Rendering should fail fast if validation fails.
- Tools should preserve stable IDs by default.
- Mutation tools should avoid destructive source churn.
- The server should work locally without a SaaS account.

## Non-Goals For The First MCP

- Hosted diagram storage.
- Visual editor state synchronization.
- Prompt-only generation.
- Account management.
- Full workspace collaboration.
- Project analyzers.
