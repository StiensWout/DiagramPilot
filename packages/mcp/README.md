# @diagrampilot/mcp

Model Context Protocol server for DiagramPilot.

Install this optional adapter when a local MCP client needs DiagramPilot tools
without adding MCP runtime dependencies to the core `diagrampilot` CLI package:

```bash
npm install --save-dev @diagrampilot/mcp
```

Launch the package-level executable:

```bash
diagrampilot-mcp
```

Keeping MCP in this package keeps CLI/CI installs smaller, lowers the default
security surface for compiler users, and lets the adapter iterate independently.

The server exposes read-only DiagramPilot resources, tools, and prompts for AI
coding agents working in local repositories.

MCP covers validation, repo workflow checks, export, render, repo output
generation, Source Creation, and Source Mutation. Source Creation and Source
Mutation use Stable IDs and Structured Diagram Operations rather than raw YAML
replacement as the supported agent workflow.

Public documentation:

- https://diagrampilot.com/docs/agents/mcp.md
- https://diagrampilot.com/docs/agents/quickstart.md
- https://diagrampilot.com/docs/agents/spec.md
