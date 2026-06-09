# DiagramPilot MCP

MCP support is alpha. The DiagramPilot MCP server exposes read-only
DiagramPilot context and operations to local Model Context Protocol clients.

Launch it through the main CLI:

```bash
diagrampilot mcp
```

Clients that require a dedicated package executable can use:

```bash
diagrampilot-mcp
```

The server provides resources for the DiagramSpec schema, public docs,
examples, discovered DiagramPilot Source Files, and Repo Workflow Check
results. It provides read tools for validating sources, checking repo workflow
health, exporting Derived Artifact text, and rendering SVG text. These tools do
not write files.

The public prompt set covers creating or updating DiagramPilot Source Files,
repairing validation errors, and refreshing Derived Artifacts from repo
context.
