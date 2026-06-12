# @diagrampilot/mcp

Model Context Protocol server for DiagramPilot.

Most users should launch MCP through the `diagrampilot mcp` command. Use this
package when an MCP client expects a dedicated package-level executable:

```bash
diagrampilot-mcp
```

MCP support is alpha. The server exposes read-only DiagramPilot resources,
tools, and prompts for AI coding agents working in local repositories.

In the v0.4.0 Alpha Capability Release, MCP covers validation, repo workflow
checks, export, render, repo output generation, Source Creation, and Source
Mutation. Source Creation and Source Mutation use Stable IDs and Structured Diagram Operations rather than raw YAML replacement as the supported agent workflow.

Public documentation:

- https://diagrampilot.com/docs/agents/mcp.md
- https://diagrampilot.com/docs/agents/quickstart.md
- https://diagrampilot.com/docs/agents/spec.md
