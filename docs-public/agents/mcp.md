# MCP Plan

DiagramPilot should expose a Model Context Protocol server after the public
website, Public Documentation, and DiagramSpec v1 JSON Schema route are stable.

The MCP interface should operate on structured DiagramSpec objects and project
files. It should not be only a raw Mermaid rendering wrapper.

MCP is not implemented and is not part of the current CLI. The first adapter
should wrap the shipped read/check/validate/render/export workflows before
adding source mutation tools.

## Planned First Tools

`list_diagrams`
: Find DiagramPilot source files in the current repository.

`check_diagrams`
: Run the read-only repo workflow check and return aggregate source and SVG
artifact freshness results.

`validate_diagram`
: Validate one DiagramPilot source file and return repairable errors.

`render_diagram`
: Render a valid DiagramPilot source file to an explicit SVG path.

`export_diagram`
: Export DiagramSpec to Mermaid or D2, printing by default and writing only
when an explicit output path is provided.

## Deferred Mutation Tools

Source mutation tools are deferred until the read-first adapter is useful.

`create_diagram`
: Create a new DiagramPilot source file from structured input.

`add_node`
: Add a node while preserving existing IDs.

`connect_nodes`
: Add an edge between existing nodes.

`update_node`
: Update label, kind, description, icon, or metadata for an existing node.

## Planned Resources

`diagrampilot://schema`
: planned DiagramSpec v1 JSON Schema route:
  `https://diagrampilot.com/schema/diagramspec-v1.schema.json`.

`diagrampilot://docs/agents/quickstart`
: Agent quickstart.

`diagrampilot://docs/agents/spec`
: DiagramSpec documentation.

`diagrampilot://examples`
: Canonical examples.

## Behavior Requirements

- Tools should read project files with explicit paths.
- Render and export writes should require explicit output paths.
- Validation should return structured repair messages.
- Rendering should fail fast if validation fails.
- Tools should preserve stable IDs by default.
- Future mutation tools should avoid destructive source churn.
- The server should work locally without a SaaS account.

## Non-Goals For The First MCP

- Hosted diagram storage.
- Visual editor state synchronization.
- Prompt-only generation.
- Account management.
- Full workspace collaboration.
- Project analyzers.
- Source mutation tools in the first adapter.
