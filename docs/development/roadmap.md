# Development Roadmap

DiagramPilot starts as a local-first compiler and validation engine for
agent-generated diagrams.

## MVP

1. Create a TypeScript package workspace.
2. Define DiagramSpec v1.
3. Publish `schema/diagrampilot.schema.json`.
4. Implement YAML and JSON parsing.
5. Implement validation with repairable text and JSON errors.
6. Implement CLI commands:
   - `diagrampilot init`
   - `diagrampilot validate <path...>`
   - `diagrampilot validate <path...> --json`
   - `diagrampilot render <path> --out <artifact.svg>`
   - `diagrampilot export <path> --format mermaid|d2`
   - `diagrampilot export <path> --format mermaid|d2 --out <path>`
7. Compile DiagramSpec to Mermaid and D2.
8. Render SVG through the included local D2 rendering path.
9. Support packaged `lucide:*` icon references.
10. Add deterministic SVG provenance metadata without timestamps.
11. Ship `llms.txt` and agent docs.
12. Add focused tests for validation, export, render smoke coverage, and
    repairable error shape.

## MVP Boundaries

- `render` produces SVG only.
- `render` requires `--out`.
- `export` supports Mermaid and D2.
- `export` prints to stdout by default.
- `validate` validates explicit source file paths only.
- `validate` does not check stale generated artifacts by default.
- `init` does not scan the codebase or generate diagrams by default.
- No project analyzers.
- No MCP server.
- No hosted workspace dependency.

## Phase 2

- Add DOT export.
- Add PNG rendering if it can be provided locally and predictably.
- Add watch mode.
- Add stronger layout configuration.
- Add diagram discovery across a repository.
- Add generated Markdown embeds.
- Add stale artifact checks, such as `diagrampilot check` or
  `diagrampilot validate --artifacts`.
- Add explicit source formatting if source rewriting becomes useful.
- Add cloud/provider icon namespaces after packaging and licensing are clear.

## Phase 3

- Add MCP server.
- Add tool calls for structured diagram operations.
- Add resources for schema, docs, and examples.
- Add support for incremental updates from agents.
- Preserve source comments and ordering in mutation tools where practical.

## Phase 4

- Add project analyzers:
  - package dependency graphs
  - OpenAPI flows
  - database schema diagrams
  - infrastructure summaries
  - monorepo package maps

## Deferred

- Hosted canvas.
- Drag-and-drop editor.
- Full custom renderer before compiler targets prove useful.
- Large catalog of specialized diagram types.
- Prompt-only SaaS generation.

## First Acceptance Test

An agent can read `https://diagrampilot.com/llms.txt`, create a valid
`docs/architecture.dp.yaml`, validate it, and render `docs/architecture.svg`
with real local CLI commands:

```bash
diagrampilot validate docs/architecture.dp.yaml
diagrampilot render docs/architecture.dp.yaml --out docs/architecture.svg
```
