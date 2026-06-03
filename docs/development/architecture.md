# Architecture Plan

DiagramPilot uses a compiler-style architecture: parse structured source files,
validate them, normalize them internally, then render or export through target
adapters.

The MVP implementation is a TypeScript package workspace.

## MVP Packages

```text
packages/core
packages/cli
packages/export-mermaid
packages/export-d2
packages/render-svg
packages/icons
schema
docs
examples
```

Later packages:

```text
packages/export-dot
packages/layout
packages/mcp
```

## Data Flow

```text
.dp.yaml/.dp.json
  -> parse
  -> validate
  -> normalize
  -> render/export adapter
  -> svg/mermaid/d2
```

Normalization is internal in the MVP. `validate`, `render`, and `export` should
not rewrite source files.

## Core Responsibilities

`packages/core`
: Types, normalized model, validation, repair error format, ID rules,
DiagramSpec utilities.

`packages/cli`
: User-facing commands, file IO, command output, exit codes.

`packages/export-mermaid`
: Export DiagramSpec to Mermaid text.

`packages/export-d2`
: Export DiagramSpec to D2 text.

`packages/render-svg`
: Render valid DiagramSpec to SVG through the included local D2 rendering path.

`packages/icons`
: Packaged icon metadata and SVG assets for supported namespaces such as
`lucide`.

`schema`
: JSON Schema for DiagramSpec.

## CLI Behavior

`diagrampilot init`
: Creates or updates DiagramPilot support files only. It does not scan the
codebase or generate diagrams by default.

`diagrampilot validate <path>`
: Validates one explicit DiagramPilot source file path. It collects all safely
discoverable errors, exits nonzero on failure, and validates source correctness
only.

`diagrampilot validate <path> --json`
: Emits structured validation output suitable for agents and scripts.

`diagrampilot render <path> --out <artifact.svg>`
: Validates and renders SVG. The `--out` flag is required.

`diagrampilot export <path> --format mermaid|d2`
: Exports text to stdout by default.

`diagrampilot export <path> --format mermaid|d2 --out <path>`
: Writes exported text to a file.

Diagnostics and validation errors should go to stderr, not stdout.

## Renderer Strategy

Start by compiling to existing ecosystems instead of building every rendering
detail from scratch.

MVP targets:

- Mermaid export.
- D2 export.
- SVG render through D2.

The DiagramPilot install includes a pinned, platform-specific D2 rendering
dependency. Users should not need a separate manual D2 installation or a
first-run renderer download.

Rendered SVGs include deterministic provenance metadata inside
`<metadata id="diagrampilot-provenance">`. The metadata records source path,
source SHA-256 hash, DiagramPilot version, and renderer name/version. It does
not include wall-clock timestamps.

Rendering should be stable enough for code review for the same DiagramPilot
version, renderer version, input, and environment. Do not promise perfect
determinism across renderer or environment changes.

## Layout Strategy

MVP layout configuration is limited to top-level `direction`.

The default renderer handles layout. Stronger layout configuration, manual
constraints, and dedicated layout packages are Phase 2 concerns.

Later layout candidates:

- ELKJS for compound directed diagrams.
- Dagre for simpler directed graphs.
- Graphviz for DOT output workflows.

## Icon Strategy

Icons are part of the MVP, using namespaced references such as:

```yaml
icon: lucide:database
```

The MVP supports packaged Lucide icons. Validation rejects unsupported icon
namespaces and unknown icons in supported namespaces.

Cloud/provider namespaces such as `aws`, `gcp`, and `azure` are deferred until
packaging and licensing are clear.

## Constraints

- Core workflows must run locally.
- Generated artifacts must be stable enough for code review.
- Validation errors must be useful to agents.
- DiagramSpec remains the source of truth.
- Hosted services are optional integrations, not required dependencies.
- The MVP has no arbitrary per-object styling.
- The MVP has no project analyzers.
- MCP comes after the CLI/core workflow is useful.
