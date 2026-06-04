# DiagramPilot

DiagramPilot is a repo-native diagram compiler for AI coding agents.

The goal is to let AI coding agents create, validate, repair, update, render,
and export diagrams inside a repository using a stable structured source
format. DiagramPilot is local-first, version-control friendly, and useful
without a hosted workspace.

Public documentation uses `https://diagrampilot.com`.

## Try DiagramPilot

Start with the Checkout Demo Project:

- [Checkout demo quickstart](https://diagrampilot.com/docs/agents/quickstart.md)
- Demo source file: `demo-projects/checkout/docs/architecture.dp.yaml`
- Demo SVG artifact: `demo-projects/checkout/docs/architecture.svg`

Run the primary workflow from the repository root:

```bash
cd demo-projects/checkout
diagrampilot validate docs/architecture.dp.yaml
diagrampilot render docs/architecture.dp.yaml --out docs/architecture.svg
diagrampilot export docs/architecture.dp.yaml --format mermaid
diagrampilot export docs/architecture.dp.yaml --format d2 --out docs/architecture.d2
```

Validate before rendering. `render` requires `--out`; `export` prints to stdout
by default and writes a file only when `--out` is provided.

## Product Direction

DiagramPilot is not a prompt-to-diagram canvas. Existing products such as
Eraser, Mermaid Chart, Whimsical, Miro, and Lucid already cover hosted visual
workflows well.

DiagramPilot's wedge is:

- Structured `*.dp.yaml` and `*.dp.json` source files.
- YAML-first authoring for humans and agents.
- Source-file validation for DiagramSpec.
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

Then follow the Checkout Demo Project workflow in:

```text
https://diagrampilot.com/docs/agents/quickstart.md
```

The same source/render pattern applies to project diagrams such as:

```text
docs/architecture.dp.yaml
docs/architecture.svg
```

## Current CLI

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

Rendered SVG artifacts include deterministic provenance metadata with the source
path, source SHA-256 hash, DiagramPilot version, and renderer version. The
provenance metadata does not include wall-clock timestamps.

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

## Public Documentation

- [Checkout demo quickstart](https://diagrampilot.com/docs/agents/quickstart.md)
- [DiagramSpec guide](https://diagrampilot.com/docs/agents/spec.md)
- [Error repair guide](https://diagrampilot.com/docs/agents/error-repair.md)
- [Agent examples](https://diagrampilot.com/docs/agents/examples.md)
- [MCP plan](https://diagrampilot.com/docs/agents/mcp.md)
- [Agent prompting guide](https://diagrampilot.com/docs/agents/prompting.md)

## Internal Documentation

- [Development roadmap](docs/development/roadmap.md)
- [Architecture notes](docs/development/architecture.md)
- [Market research](docs/development/market-research.md)
- [Issue tracker workflow](docs/agents/issue-tracker.md)
- [Triage labels](docs/agents/triage-labels.md)
- [Domain docs](docs/agents/domain.md)
- [Public/internal docs split ADR](docs/adr/0006-public-docs-live-under-docs-public.md)

## Status

MVP, architecture deepening, and docs/demo rework checkpoints are complete. The
TypeScript workspace includes core source loading and validation, CLI commands
for `init`, `validate`, `render`, and `export`, Mermaid and D2 export, SVG
rendering through the included local D2 path, packaged Lucide icon validation,
deterministic SVG provenance metadata, the Checkout Demo Project, and the
public/internal documentation split.
