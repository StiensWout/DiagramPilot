# DiagramPilot

DiagramPilot is a repo-native diagram compiler for AI coding agents.

The goal is to let AI coding agents create, validate, repair, update, render,
and export diagrams inside a repository using a stable structured source
format. DiagramPilot is local-first, version-control friendly, and useful
without a hosted workspace.

Public documentation uses `https://diagrampilot.com`.

## Product Direction

DiagramPilot is not a prompt-to-diagram canvas. Existing products such as
Eraser, Mermaid Chart, Whimsical, Miro, and Lucid already cover hosted visual
workflows well.

DiagramPilot's wedge is:

- Structured `*.dp.yaml` and `*.dp.json` source files.
- YAML-first authoring for humans and agents.
- JSON Schema validation.
- Repairable validation errors.
- Stable globally unique node, edge, and group IDs.
- Review-stable rendering to project artifacts.
- SVG rendering through an included local renderer.
- Exports to existing ecosystems such as Mermaid and D2.
- Root `llms.txt` and concise agent documentation from day one.

## Source Of Truth

DiagramSpec is the source model. A DiagramPilot source file stores DiagramSpec
as YAML or JSON.

Mermaid, D2, DOT, SVG, and PNG are derived artifacts. Agents should update
`*.dp.yaml` or `*.dp.json` source files and regenerate outputs rather than
hand-editing generated artifacts.

## First Product Checkpoint

An AI coding agent should be able to read:

```text
https://diagrampilot.com/llms.txt
```

Then create, validate, and render:

```text
docs/architecture.dp.yaml
docs/architecture.svg
```

Using real local CLI commands:

```bash
diagrampilot validate docs/architecture.dp.yaml
diagrampilot render docs/architecture.dp.yaml --out docs/architecture.svg
```

## Initial CLI Shape

```bash
diagrampilot init
diagrampilot validate docs/architecture.dp.yaml
diagrampilot validate docs/architecture.dp.yaml --json
diagrampilot render docs/architecture.dp.yaml --out docs/architecture.svg
diagrampilot export docs/architecture.dp.yaml --format mermaid
diagrampilot export docs/architecture.dp.yaml --format d2 --out docs/architecture.d2
```

`render` requires `--out`. `export` prints to stdout by default and writes a
file only when `--out` is provided.

## MVP Scope

Included in the MVP:

- DiagramSpec v1.
- TypeScript package workspace.
- CLI commands for `init`, `validate`, `render`, and `export`.
- YAML and JSON source files.
- Source-only validation with repairable text and JSON errors.
- SVG rendering.
- Mermaid and D2 export.
- Packaged Lucide icon support.
- Deterministic SVG provenance metadata without timestamps.
- Agent docs and `llms.txt`.

Deferred:

- DOT export.
- PNG rendering.
- MCP server.
- Project analyzers.
- Hosted canvas.
- Drag-and-drop editor.
- Prompt-only SaaS generation.

## Documentation

- [Agent quickstart](https://diagrampilot.com/docs/agents/quickstart.md)
- [DiagramSpec guide](https://diagrampilot.com/docs/agents/spec.md)
- [Error repair guide](https://diagrampilot.com/docs/agents/error-repair.md)
- [Agent examples](https://diagrampilot.com/docs/agents/examples.md)
- [MCP plan](https://diagrampilot.com/docs/agents/mcp.md)
- [Agent prompting guide](https://diagrampilot.com/docs/agents/prompting.md)
- [Development roadmap](https://diagrampilot.com/docs/development/roadmap.md)
- [Architecture plan](https://diagrampilot.com/docs/development/architecture.md)
- [Market research](https://diagrampilot.com/docs/development/market-research.md)

## Status

Planning stage. No runtime implementation exists yet.
