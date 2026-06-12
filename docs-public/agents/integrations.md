# Integrations And Agent Recipes

Use these recipes when DiagramPilot should run in automation or inside an AI
coding-agent workflow. They assume `diagrampilot` is available from the local
project install or through `npx`.

## GitHub Actions

GitHub Actions workflows live in `.github/workflows` and run jobs when events
such as pull requests or pushes occur. A DiagramPilot check should stay local
and deterministic: install dependencies, validate the source file, refresh the
expected artifact when the workflow is intended to verify rendering, then run
the repo workflow check.

```yaml
name: DiagramPilot

on:
  pull_request:
  push:
    branches:
      - main

jobs:
  diagrams:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npx diagrampilot validate docs/architecture.dp.yaml
      - run: npx diagrampilot render docs/architecture.dp.yaml --out docs/architecture.svg
      - run: npx diagrampilot check
```

For repositories with configured outputs, use the repo-wide generator before
the final check:

```bash
diagrampilot generate
diagrampilot check
```

For read-only pull request gates that should never rewrite Derived Artifacts,
run:

```bash
diagrampilot check
diagrampilot check docs --json
```

## Coding-Agent Workflow

Give the coding agent a narrow DiagramPilot task, make it inspect first, and
make the final check explicit. This keeps the Agent Authoring Loop centered on
DiagramPilot Source Files instead of generated artifacts.

```text
Update docs/architecture.dp.yaml to include the new checkout worker.

Use this workflow:
1. Run diagrampilot inspect docs --json and identify the existing Stable IDs.
2. Edit only docs/architecture.dp.yaml.
3. Run diagrampilot format docs/architecture.dp.yaml.
4. Run diagrampilot validate docs/architecture.dp.yaml --json.
5. Run diagrampilot render docs/architecture.dp.yaml --out docs/architecture.svg.
6. Run diagrampilot check docs --json.

Do not hand-edit generated SVG, PNG, Mermaid, D2, DOT, or Markdown outputs.
```

For a read-only agent review, use an inspect/check recipe:

```bash
diagrampilot inspect docs --json
diagrampilot check docs --json
```

For a source repair task, validate first and use the repairable diagnostic path
as the editing target:

```bash
diagrampilot validate docs/architecture.dp.yaml --json
diagrampilot format docs/architecture.dp.yaml
diagrampilot validate docs/architecture.dp.yaml
diagrampilot check
```
