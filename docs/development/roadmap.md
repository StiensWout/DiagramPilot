# Development Roadmap

DiagramPilot is a local-first compiler and validation engine for repo-native
diagrams authored by AI coding agents.

The current implementation has crossed the MVP and architecture-deepening
checkpoints recorded in `.scratch/diagrampilot-mvp/` and
`.scratch/architecture-deepening/`. The next work is release readiness:
separating public documentation from internal maintainer documentation and
adding the Checkout Demo Project workflow. Keep that track separate from the
product capability backlog. Release readiness makes the existing product easy
to adopt; product capability work adds new user-facing behaviour.

## Current State

The MVP CLI workflow is implemented in the TypeScript workspace:

- `diagrampilot init`
- `diagrampilot validate <path>`
- `diagrampilot validate <path> --json`
- `diagrampilot render <path> --out <artifact.svg>`
- `diagrampilot export <path> --format mermaid`
- `diagrampilot export <path> --format d2`
- `diagrampilot export <path> --format mermaid|d2 --out <path>`

The implemented MVP includes:

- DiagramSpec v1 source loading from YAML and JSON DiagramPilot Source Files.
- Validated DiagramSpec loading through a shared core lifecycle.
- Repairable text and JSON validation errors.
- Stable lowercase snake case IDs across nodes, edges, and groups.
- Node, Edge, Group, Metadata, Source Reference, External Reference, and Icon
  Reference validation.
- Reusable DiagramSpec topology for Group roots, Group parentage, containment,
  traversal order, and Node paths.
- Mermaid and D2 text export.
- SVG rendering through the included local D2 path.
- Packaged `lucide:*` Icon Reference validation.
- Deterministic SVG provenance metadata without wall-clock timestamps.
- A CLI command planning seam for validating command behaviour without
  spawning the executable for every rule.
- CLI smoke tests and focused validation/export/render/provenance/topology
  coverage.

The MVP issue slices and architecture-deepening issue slices are completed in
the local tracker. The remaining closeout work is documentation, the demo
project workflow, and planning-state cleanup, not core CLI implementation.

## Current Contract

These behaviours are product contracts unless a future PRD explicitly changes
them:

- DiagramSpec remains the source of truth.
- DiagramPilot Source Files are `*.dp.yaml` and `*.dp.json`.
- YAML is preferred for human- and agent-authored source.
- Derived Artifacts include SVG, Mermaid, D2, DOT, and PNG.
- `validate` validates explicit source file paths only.
- `validate` does not scan the repository.
- `validate` does not check generated artifact freshness by default.
- `render` produces SVG only.
- `render` requires `--out`.
- `export` supports Mermaid and D2.
- `export` prints to stdout by default.
- `export` writes a file only when `--out` is provided.
- `init` creates or updates support files only.
- `init` does not scan the codebase or generate diagrams.
- Generated SVG provenance records source path, source SHA-256 hash,
  DiagramPilot version, renderer name, and renderer version.
- Generated SVG provenance must not include wall-clock timestamps.
- Core workflows must remain local and must not depend on a hosted workspace.

## Active Backlog

### Release Readiness

This track turns the implemented MVP into a clear first user workflow.

1. Split Public Documentation from Internal Documentation.
2. Keep public URLs under `https://diagrampilot.com`.
3. Ensure `llms.txt` links only Public Documentation.
4. Add the Checkout Demo Project fixture.
5. Include one excellent Demo Project DiagramPilot Source File.
6. Render and commit its SVG Derived Artifact.
7. Rework the public quickstart around the Demo Project workflow.
8. Clean up internal docs and planning state after the docs/demo work lands.

Release readiness is complete when an AI coding agent can start at
`https://diagrampilot.com/llms.txt`, follow only Public Documentation, inspect
the Checkout Demo Project, validate its DiagramPilot Source File, render its
SVG Derived Artifact, and repeat the workflow in another repository.

## Completed Architecture Deepening

The architecture-deepening tracker slices under
`.scratch/architecture-deepening/issues/` are completed in the current checkout.
Treat these as current architecture, not future backlog:

1. Validated DiagramSpec loading: the core package owns the ordered lifecycle
   from an explicit DiagramPilot Source File path to a valid DiagramSpec or a
   diagnostic-friendly failure.
2. Shared validation loading in `export` and `render`, so those commands
   validate before producing derived artifacts through the same path as
   `validate`.
3. Centralized Repairable Validation Error diagnostics for read, parse, and
   semantic validation failures.
4. DiagramSpec topology: the core package owns reusable knowledge about Diagram
   Objects, including Stable ID lookup, Group roots, Group parentage,
   containment relationships, Node paths, and traversal order.
5. Group containment validation reuses the shared topology where it improves
   locality while preserving repairable validation behaviour.
6. SVG provenance construction and SVG metadata insertion are isolated in the
   render package and covered without requiring D2 rendering.
7. CLI command planning represents exit code, stdout, stderr, and file-write
   intent for `validate`, `export`, and `render`; filesystem reads and writes
   remain at command execution edges.

## Product Backlog

### Repo Workflow

- Add stale artifact checks, such as `diagrampilot check` or
  `diagrampilot validate --artifacts`.
- Add diagram discovery across a repository.
- Add watch mode for local authoring loops.
- Add generated Markdown embeds.
- Add explicit source formatting if source rewriting becomes useful.

### Export And Rendering

- Add DOT export.
- Add PNG rendering if it can be provided locally and predictably.
- Add stronger layout configuration beyond top-level `direction`.
- Evaluate dedicated layout packages when renderer defaults are not enough.

Later layout candidates:

- ELKJS for compound directed diagrams.
- Dagre for simpler directed graphs.
- Graphviz for DOT output workflows.

### Icons

- Add cloud/provider icon namespaces only after packaging and licensing are
  clear.
- Keep namespaced Icon References as the long-term shape.
- Avoid unqualified icon names.

### MCP And Structured Agent Operations

MCP comes after release readiness and the public demo workflow are stable.

- Add MCP server.
- Add resources for schema, docs, and examples.
- Add tool calls for structured diagram operations.
- Add support for incremental updates from agents.
- Preserve source comments and ordering in mutation tools where practical.

### Project Analyzers

Project analyzers come after the compiler workflow is useful without analysis.

- Package dependency graphs.
- OpenAPI flows.
- Database schema diagrams.
- Infrastructure summaries.
- Monorepo package maps.

## Deferred

These are intentionally outside the current product path:

- Hosted canvas.
- Drag-and-drop editor.
- Prompt-only SaaS generation.
- Full custom renderer before compiler targets prove useful.
- Large catalog of specialized diagram types.
- Arbitrary per-object styling in DiagramSpec v1.
- Project analyzers in the core MVP workflow.
- Hosted workspace dependency for core workflows.

## Acceptance Checkpoints

### MVP Acceptance

An agent can create a valid DiagramPilot Source File, validate it, and render
an SVG Derived Artifact with real local CLI commands:

```bash
diagrampilot validate docs/architecture.dp.yaml
diagrampilot render docs/architecture.dp.yaml --out docs/architecture.svg
```

### Demo Project Acceptance

After the Checkout Demo Project lands, the public workflow should be checked
with real local commands against the demo source:

```bash
diagrampilot validate <demo-source>.dp.yaml
diagrampilot render <demo-source>.dp.yaml --out <demo-output>.svg
```

### Maintainer Verification

Before merging roadmap-relevant implementation work, run:

```bash
npm test
```
