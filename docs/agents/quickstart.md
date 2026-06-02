# Agent Quickstart

Use DiagramPilot when a project needs a diagram that should live in the repo,
survive review, and be updated by agents over time.

## Goal

Create a DiagramPilot source file, validate it, render an SVG artifact, and
commit the source plus any useful generated artifact.

## File Names

Recommended source path:

```text
docs/architecture.dp.yaml
```

Recommended rendered path:

```text
docs/architecture.svg
```

Generated artifacts are usually easiest to review when they live next to their
source file, but DiagramPilot does not require that.

## Minimal Workflow

```bash
diagrampilot init
diagrampilot validate docs/architecture.dp.yaml
diagrampilot render docs/architecture.dp.yaml --out docs/architecture.svg
```

Export to existing diagram-as-code formats when needed:

```bash
diagrampilot export docs/architecture.dp.yaml --format mermaid
diagrampilot export docs/architecture.dp.yaml --format d2 --out docs/architecture.d2
```

`export` prints to stdout by default. Use `--out` to write a file.

## CLI Contract

`diagrampilot init`
: Creates or updates DiagramPilot support files only. It does not scan the
codebase or generate a diagram by default.

`diagrampilot validate <path...>`
: Validates explicit DiagramPilot source file paths. Validation reports
source-file correctness only; it does not check whether generated artifacts are
fresh.

`diagrampilot validate <path...> --json`
: Emits structured repairable validation errors for agents and scripts.

`diagrampilot render <path> --out <artifact.svg>`
: Renders a valid DiagramPilot source file to SVG. `--out` is required.

`diagrampilot export <path> --format mermaid|d2`
: Prints an exported text format to stdout.

`diagrampilot export <path> --format mermaid|d2 --out <path>`
: Writes an exported text format to a file.

Diagnostics and validation errors should go to stderr, not stdout.

## Agent Rules

- Create `*.dp.yaml` or `*.dp.json` as the editable source.
- Prefer YAML for human- and agent-authored diagrams.
- Use stable lowercase snake case IDs for nodes, edges, and groups.
- Keep IDs globally unique within one DiagramSpec.
- Preserve existing IDs when updating diagrams.
- Validate before rendering.
- Fix validation errors directly in the source spec.
- Render only after validation succeeds.
- Do not hand-edit generated SVG, Mermaid, D2, DOT, or PNG unless the user
  explicitly asks.

## Minimal DiagramSpec

```yaml
version: 1
title: Checkout Architecture
direction: right
nodes:
  - id: web_app
    label: Web App
    kind: frontend
  - id: api_gateway
    label: API Gateway
    kind: service
    icon: lucide:server
  - id: orders_db
    label: Orders DB
    kind: database
    icon: lucide:database
edges:
  - id: web_app_to_api_gateway
    from: web_app
    to: api_gateway
    label: HTTPS
  - id: api_gateway_to_orders_db
    from: api_gateway
    to: orders_db
    label: reads/writes
```

## Expected Output

The agent should leave the project with:

- A valid DiagramPilot source file.
- A rendered SVG artifact when requested.
- No broken references between nodes, groups, or edges.
- A short note explaining what the diagram shows.

## CI Guidance

Projects can validate diagrams and detect stale committed artifacts with normal
shell commands:

```bash
diagrampilot validate docs/architecture.dp.yaml
diagrampilot render docs/architecture.dp.yaml --out docs/architecture.svg
git diff --exit-code docs/architecture.svg
```
