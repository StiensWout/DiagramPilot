# diagrampilot

DiagramPilot command line interface for repo-native DiagramSpec workflows.

Use this package when you want the `diagrampilot` executable for checking,
inspecting, creating, validating, formatting, generating, watching, rendering,
and exporting DiagramPilot Source Files in a repository.

The CLI supports YAML-only source files, `diagrampilot inspect` for read-only
source inventory and topology, `diagrampilot create <path> --template
architecture|flow|package-map` for maintained starter source files,
`diagrampilot generate` for configured Derived Artifacts and Markdown embed
files, `diagrampilot format` for canonical YAML cleanup, `diagrampilot watch`
for local authoring loops, `diagrampilot export --format dot`, `diagrampilot
render --format png`, and `diagrampilot mcp` for the MCP server.

Public documentation:

- https://diagrampilot.com/docs/agents/installation.md
- https://diagrampilot.com/docs/agents/quickstart.md
