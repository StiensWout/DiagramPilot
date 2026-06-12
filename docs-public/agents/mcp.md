# DiagramPilot MCP

The DiagramPilot MCP server exposes DiagramPilot context and explicit local
operations to Model Context Protocol clients.

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
results. It also provides read tools for Stable ID suggestions, source
validation, repo workflow checks, Derived Artifact text export, and SVG
rendering.

The write tools are explicit: `diagrampilot_create_source` writes one
`*.dp.yaml` DiagramPilot Source File from structured DiagramSpec input, and
`diagrampilot_generate_repo_outputs` refreshes configured Derived Artifacts for
explicit source paths or directory scopes.

The public prompt set covers creating or updating DiagramPilot Source Files,
repairing validation errors, and refreshing Derived Artifacts from repo context.
