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
- Local issue numbers under `.scratch/` must be globally unique across all
  PRD directories. Before creating or renaming issue files, scan existing
  `.scratch/**/issues/<NN>-*.md` files and use the next unused number.
- Create a new git branch for every issue or task before making implementation
  edits. Include the globally unique issue number and slug in the branch name
  when available.
- Create task branches without tracking `origin/main`; for example:
  `git switch --create issue-17-write-d2-export-only-when-out-provided --no-track origin/main`.
- After committing implementation work, push the current branch to a matching
  remote branch with `git push -u origin HEAD`. Do not push implementation
  commits directly to `main` or to `origin/main`.
- Before opening a pull request, verify `git branch --show-current` is the task
  branch, not `main`, and verify its upstream is the matching
  `origin/<task-branch>` rather than `origin/main`.
- When creating a pull request, use `main` as the base and the current task
  branch as the head. A PR command must never pass `--head main`.
- Prefer small, incremental edits over full diagram rewrites.
- Keep generated SVG outputs next to their source spec when practical.
- Public docs and URLs must use `https://diagrampilot.com`.
- Do not introduce a hosted-workspace dependency for core workflows.
- Do not hand-edit generated artifacts unless the user explicitly asks.
- At the end of implementation work, include a validation plan with the exact
  commands or checks the user can run to verify the change themselves.
- After implementing an issue, update its local markdown file under
  `.scratch/`: set the status appropriately, check completed acceptance
  criteria, and add implementation notes plus the validation plan.

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
- `docs-public/agents/quickstart.md`: shortest path for creating a diagram.
- `docs-public/agents/spec.md`: expected spec structure.
- `docs-public/agents/error-repair.md`: how to fix invalid specs.
- `docs-public/agents/examples.md`: canonical diagram examples.
- `docs-public/agents/mcp.md`: planned MCP interface notes.
- `docs-public/agents/prompting.md`: recommended prompts for agents.
- `docs/agents/issue-tracker.md`: local markdown issue and PRD workflow.
- `docs/agents/triage-labels.md`: status vocabulary for triage.
- `docs/agents/domain.md`: domain-doc lookup rules for engineering skills.
- `docs/development/architecture.md`: maintainer architecture notes.
- `docs/development/roadmap.md`: implementation priorities.
- `docs/adr/0006-public-docs-live-under-docs-public.md`: public/internal docs
  split decision.

## Agent skills

### Issue tracker

Issues and PRDs are tracked as local markdown files under `.scratch/`. See
`docs/agents/issue-tracker.md`.
Issue numbers must not overlap between PRD directories.

### Triage labels

Triage uses the default local status vocabulary. See
`docs/agents/triage-labels.md`.

### Domain docs

This repo uses a single-context domain docs layout. See
`docs/agents/domain.md`.

## Implemented CLI Shape

```bash
diagrampilot init
diagrampilot check
diagrampilot check docs --json
diagrampilot validate docs/architecture.dp.yaml
diagrampilot validate docs/architecture.dp.yaml --json
diagrampilot render docs/architecture.dp.yaml --out docs/architecture.svg
diagrampilot export docs/architecture.dp.yaml --format mermaid
diagrampilot export docs/architecture.dp.yaml --format d2 --out docs/architecture.d2
```

`check` is the read-only repo review/CI command. It discovers DiagramPilot
source files in the current directory, one explicit directory, or one explicit
source file; validates them; and checks next-to-source same-stem expected SVG
artifacts through DiagramPilot provenance metadata only.

`render` requires `--out`. `export` prints to stdout by default and writes a
file only when `--out` is provided.
