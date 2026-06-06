# Development Roadmap

DiagramPilot is a local-first compiler and validation engine for repo-native
diagrams authored by AI coding agents.

The current implementation has crossed the MVP, architecture-deepening,
docs/demo release-readiness, Repo Workflow Check, and Repo Workflow Check
deepening checkpoints recorded in `.scratch/diagrampilot-mvp/`,
`.scratch/architecture-deepening/`, `.scratch/docs-demo-project-rework/`,
`.scratch/repo-workflow-check/`, and
`.scratch/repo-workflow-check-deepening/`. The current release-readiness path
is Public Website Publication, Productization And Maintainability, and the
Public Alpha Release track for v0.2.0. Keep release-readiness maintenance
separate from product capability work: release readiness keeps the existing
product easy to adopt; product capability work adds new user-facing behaviour.

## Current State

The MVP CLI workflow is implemented in the TypeScript workspace:

- `diagrampilot init`
- `diagrampilot check [path]`
- `diagrampilot check [path] --json`
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
- Read-only Repo Workflow Check for DiagramPilot source discovery, source
  validation, and expected SVG artifact freshness through provenance metadata.
- A CLI command planning seam for validating command behaviour without
  spawning the executable for every rule.
- CLI smoke tests and focused validation/export/render/provenance/topology
  coverage.

The MVP issue slices, architecture-deepening issue slices, docs/demo rework
issue slices, Repo Workflow Check slices, and Repo Workflow Check deepening
slices are completed in the local tracker. The current closeout state is
release readiness and public alpha packaging, not core CLI implementation.

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
- `check` is the read-only repo review/CI command.
- `check [path]` discovers DiagramPilot Source Files in the current directory,
  one explicit directory, or one explicit source file.
- `check` validates discovered source files through the shared validated
  DiagramSpec loading path.
- `check` verifies next-to-source same-stem expected SVG artifacts through
  provenance metadata only.
- `check --json` emits aggregate structured repo workflow results to stdout.
- `check` does not render, write files, update artifacts, rewrite sources, scan
  from the Git root by default, check Mermaid/D2/DOT/PNG freshness, or support
  configurable artifact mappings.
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

## Completed Release Readiness

This track turns the implemented MVP into a clear first user workflow.

1. Split Public Documentation from Internal Documentation.
2. Keep public URLs under `https://diagrampilot.com`.
3. Ensure `llms.txt` links only Public Documentation.
4. Add the Checkout Demo Project fixture.
5. Include one excellent Demo Project DiagramPilot Source File.
6. Render and commit its SVG Derived Artifact.
7. Rework the public quickstart around the Demo Project workflow.
8. Clean up internal docs and planning state after the docs/demo work lands.

Release readiness is complete. An AI coding agent can start at
`https://diagrampilot.com/llms.txt`, follow only Public Documentation, inspect
the Checkout Demo Project, validate its DiagramPilot Source File, render its
SVG Derived Artifact, and repeat the workflow in another repository.

Maintainers can verify the public/internal docs split and demo workflow with:

```bash
node --test test/docs-public-boundary.test.mjs
node --test test/checkout-demo-project.test.mjs
(cd demo-projects/checkout && node ../../packages/cli/dist/index.js validate docs/architecture.dp.yaml)
(cd demo-projects/checkout && node ../../packages/cli/dist/index.js render docs/architecture.dp.yaml --out docs/architecture.svg)
git diff --exit-code demo-projects/checkout/docs/architecture.svg
npm test
```

## Active Backlog

### Public Website Publication

The active release-readiness track is Public Website Publication. It keeps
Public Documentation in `docs-public/`, keeps Internal Documentation in
`docs/`, and prepares the Markdown-first public website without introducing a
hosted-workspace dependency for core workflows.

This track is recorded in `.scratch/public-website-publication/` and covers:

1. Auditing public and internal docs against the shipped CLI.
2. Adding the DiagramSpec v1 JSON Schema artifact after the docs audit.
3. Publishing `docs-public/` through website routes under
   `https://diagrampilot.com`.
4. Building the public landing page.
5. Adding deployment guidance.

### Productization And Maintainability

The Productization And Maintainability track starts after Public Website
Publication closes and is recorded in
`.scratch/productization-and-maintainability/`.

This track covers:

1. Cleaning the Current-State Public Surface and reworking the canonical
   quickstart.
2. Adding a hard 1000 LOC gate for authored implementation and test files,
   defined in `docs/development/maintainability.md`.
3. Splitting large core and CLI modules under the file-size gate.
4. Formalizing the Documentation Contract.
5. Redesigning the Public Landing Page around product storytelling.
6. Adding website visual quality checks.

MCP remains a later product capability phase, not part of this
release-readiness track.

### Public Alpha Release

The next release-readiness track after Productization And Maintainability is
Public Alpha Release. It is recorded in `.scratch/public-alpha-release/` and
prepares v0.2.0 as the first public and published alpha release.

This track covers:

1. Adding release version tooling and the Issue Version workflow.
2. Adding the MIT Code License, package metadata, package tarball checks, and
   Brand Use Policy.
3. Committing and applying DiagramPilot Brand Assets.
4. Adding installation and removal Public Documentation.
5. Proving Package Publishing Readiness and reserving npm names with a
   pre-alpha publish under the `prealpha` dist-tag.
6. Adding GitHub Actions branch and pull request CI.
7. Adding GitHub Actions release automation for package publishing.
8. Finalizing alpha behavior and the public surface gate, including
   `diagrampilot init --docs`, a website repository CTA, a quick install command
   bar, and a full docs refinement and simplification pass.
9. Closing v0.2.0 as the Public Alpha Release with packages, docs, website,
   release notes, and public surface checks aligned.

Pre-alpha Issue Versions can be tagged before npm publishing is ready. The
first package-ready pre-alpha publish uses the `prealpha` npm dist-tag, and
v0.2.0 is published under `latest`.

Issue Version bumping and closeout are documented in
`docs/development/release-version-workflow.md`.

### v0.3.0 Release Operations

After v0.2.0 proves the first public alpha package and website release path,
v0.3.0 should add GitHub Releases for public release visibility.

This track should cover:

1. Creating a GitHub Release for each clean public release tag, starting with
   `v0.3.0`.
2. Publishing concise release notes that link the npm `latest` package version,
   the public website, and the relevant public docs.
3. Keeping npm package publishing on the public npm registry; GitHub Packages
   remains out of scope unless a later distribution decision explicitly adds it.
4. Making GitHub Release creation a guarded release workflow step, after the
   npm `latest` publish succeeds.

### Completed Repo Workflow Check

Repo Workflow Check is complete. The implementation is recorded in
`.scratch/repo-workflow-check/` and deepened in
`.scratch/repo-workflow-check-deepening/`.

The shipped `diagrampilot check [path] [--json]` command:

1. Discovers DiagramPilot Source Files from the current directory, one explicit
   directory, or one explicit source file.
2. Validates discovered source files through the shared validated DiagramSpec
   loading path.
3. Derives the next-to-source same-stem Expected SVG Artifact for each valid
   source.
4. Checks SVG Artifact freshness by reading DiagramPilot provenance metadata.
5. Emits concise text output and aggregate JSON output.

The first `check` command does not render, write files, update artifacts,
rewrite sources, scan from the Git root by default, check Mermaid/D2/DOT/PNG
freshness, or use configurable artifact mappings.

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

- Add generated artifact checks beyond next-to-source SVG provenance freshness,
  such as explicit Mermaid or D2 artifact checks.
- Add configurable artifact mappings and ignore patterns.
- Add repository-wide discovery controls when the current scope-based discovery
  is not enough.
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

### Repo Workflow Check Acceptance

The shipped repo review workflow should be checked with the read-only command
before rendering or rewriting artifacts:

```bash
diagrampilot check
diagrampilot check demo-projects/checkout --json
```

### Maintainer Verification

Before merging roadmap-relevant implementation work, run:

```bash
npm test
```
