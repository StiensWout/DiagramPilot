# DiagramPilot Agent Guide

DiagramPilot is a repo-native diagram compiler for software repositories.
Optimize for local files, review-stable rendering, readable specs, and
repairable errors.

## Work Rules

- Treat `*.dp.yaml` and `*.dp.json` as DiagramPilot source files.
- Prefer YAML for human- and agent-authored source files.
- Prefer stable lowercase snake case IDs such as `auth_service`,
  `api_gateway`, and `orders_db`.
- Keep IDs globally unique across nodes, edges, and groups within one
  DiagramSpec.
- Preserve existing IDs when updating diagrams.
- Validate before rendering.
- Prefer small, incremental edits over full diagram rewrites.
- Keep generated SVG outputs next to their source spec when practical.
- Public docs and URLs must use `https://diagrampilot.com`.
- Do not introduce a hosted-workspace dependency for core workflows.
- Do not hand-edit generated artifacts unless the user explicitly asks.
- At the end of implementation work, include a validation plan with the exact
  commands or checks the user can run to verify the change themselves.

## Source Of Truth

The intended source format is DiagramSpec. A DiagramPilot source file stores
DiagramSpec as `*.dp.yaml` or `*.dp.json`.

Mermaid, D2, DOT, SVG, and PNG are outputs or interop targets, not the primary
source of truth.

## DiagramSpec Rules

- Top-level `version`, `title`, and `nodes` are required.
- `nodes` must contain at least one node.
- Node and group `label` fields are required.
- Edge `label` is optional.
- `direction` defaults to `right` and may be `right`, `left`, `down`, or `up`.
- Edges connect nodes only and are directed by default.
- Groups may nest, but each contained object has at most one parent group.
- Groups are not edge endpoints.
- `kind` is an open semantic tag, not a strict enum.
- Icons use namespaced references such as `lucide:database`.
- `metadata.source` is a local repository path or path-like glob.
- `metadata.external_url` is an external URL.

## Useful Docs

- `llms.txt`: public agent documentation index.
- `docs/agents/quickstart.md`: shortest path for creating a diagram.
- `docs/agents/spec.md`: expected spec structure.
- `docs/agents/error-repair.md`: how to fix invalid specs.
- `docs/agents/issue-tracker.md`: local markdown issue and PRD workflow.
- `docs/agents/triage-labels.md`: status vocabulary for triage.
- `docs/agents/domain.md`: domain-doc lookup rules for engineering skills.
- `docs/development/roadmap.md`: implementation priorities.

## Agent skills

### Issue tracker

Issues and PRDs are tracked as local markdown files under `.scratch/`. See
`docs/agents/issue-tracker.md`.

### Triage labels

Triage uses the default local status vocabulary. See
`docs/agents/triage-labels.md`.

### Domain docs

This repo uses a single-context domain docs layout. See
`docs/agents/domain.md`.

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
