# diagrampilot

CLI for repo-native DiagramSpec workflows.

`diagrampilot` checks, inspects, creates, validates, fixes, lints, formats,
generates, watches, renders, exports, lists packaged icons, and launches MCP for
DiagramPilot Source Files.

Templates: `architecture`, `flow`, `package-map`, `system-context`,
`service-map`.

Supports YAML Source Files, deterministic source-only `fix` repairs,
readability lint warnings, Derived Artifacts, Markdown embeds, SVG/PNG,
Mermaid/D2/DOT, local `lucide:*` icon discovery, and repo checks. Use
`--view <view-id>` with `render` or `export` to produce a declared DiagramSpec
projection from one source file.

Public documentation:

- https://diagrampilot.com/docs/agents/installation.md
- https://diagrampilot.com/docs/agents/quickstart.md
