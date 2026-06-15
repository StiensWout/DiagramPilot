# DiagramPilot MCP

The DiagramPilot MCP server exposes DiagramPilot context and explicit local
operations to Model Context Protocol clients.

Install the optional adapter package when a local MCP client needs DiagramPilot
tools:

```bash
npm install --save-dev @diagrampilot/mcp
```

Launch the dedicated package executable:

```bash
diagrampilot-mcp
```

The MCP adapter is separate from the core `diagrampilot` CLI so routine CLI/CI
installs stay smaller, the default dependency surface stays lower, and MCP can
iterate without forcing every compiler user to install server-facing runtime
dependencies.

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
