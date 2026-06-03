# Architecture Plan

DiagramPilot uses a compiler-style architecture: load a structured DiagramPilot
Source File, validate it as DiagramSpec, then render or export Derived
Artifacts through target adapters.

The current implementation is a TypeScript package workspace. The MVP CLI path
is implemented; the next architecture work is about deepening the current
modules so future capabilities can reuse the same source loading, validation,
topology, diagnostics, and provenance behaviour.

## Current Package Shape

```text
packages/core
packages/cli
packages/export-mermaid
packages/export-d2
packages/render-svg
packages/icons
docs
docs-public        # planned public documentation root
examples           # planned Demo Project and examples root
```

Later packages may include:

```text
packages/export-dot
packages/layout
packages/mcp
```

Do not add new packages just to move code around. A new package should either
create a real seam with more than one adapter, remove meaningful duplication, or
make a core workflow testable through a deeper interface.

## Current Data Flow

```text
*.dp.yaml / *.dp.json
  -> load DiagramPilot Source File
  -> parse YAML or JSON
  -> validate DiagramSpec
  -> export Mermaid or D2
  -> render SVG through D2
```

DiagramSpec remains the source of truth. Mermaid, D2, SVG, DOT, and PNG are
Derived Artifacts. Validation, export, and render must not rewrite DiagramPilot
Source Files.

Normalization is still internal. Until a source mutation tool exists, do not
promise source formatting, comment preservation, or ordering preservation.

## Current Responsibilities

`packages/core`
: DiagramSpec types, DiagramPilot Source File loading, YAML and JSON parsing,
DiagramSpec validation, Repairable Validation Error shape, Stable ID rules,
Metadata reference rules, Icon Reference validation entrypoints, and version
metadata.

`packages/cli`
: User-facing commands, argument parsing, filesystem reads and writes, command
output, exit codes, validation orchestration, export orchestration, render
orchestration, `init` support-file scaffolding, and CLI text/JSON diagnostic
presentation.

`packages/export-mermaid`
: Export valid DiagramSpec data to Mermaid text. The adapter owns Mermaid
syntax, escaping, direction names, Group rendering, Node rendering, and Edge
rendering.

`packages/export-d2`
: Export valid DiagramSpec data to D2 text. The adapter owns D2 syntax,
escaping, direction names, Group rendering, Node rendering, Edge rendering, and
D2-specific path output.

`packages/render-svg`
: Render valid DiagramSpec data to SVG through the included local D2 rendering
path. The adapter owns D2 invocation, worker cleanup, SVG render output, and
SVG metadata insertion for provenance.

`packages/icons`
: Packaged Lucide icon metadata and local validation support for supported
Icon Reference namespaces.

`docs`
: Internal Documentation for maintainers, including roadmap, architecture,
ADRs, issue-tracker workflow, triage labels, and domain-doc guidance.

`docs-public`
: Planned Public Documentation root for AI coding agents and developers using
DiagramPilot in their own repositories. Hosted URLs still use
`https://diagrampilot.com/docs/...`.

`examples`
: Planned Demo Project and example source root.

## CLI Contract

`diagrampilot init`
: Creates or updates DiagramPilot support files only. It does not scan the
codebase or generate diagrams by default.

`diagrampilot validate <path>`
: Validates one explicit DiagramPilot Source File path. It collects all safely
discoverable semantic errors, exits nonzero on failure, and validates source
correctness only.

`diagrampilot validate <path> --json`
: Emits structured validation output suitable for agents and scripts.

`diagrampilot render <path> --out <artifact.svg>`
: Validates and renders SVG. The `--out` flag is required.

`diagrampilot export <path> --format mermaid|d2`
: Exports text to stdout by default.

`diagrampilot export <path> --format mermaid|d2 --out <path>`
: Writes exported text to a file.

Diagnostics and validation errors should go to stderr in text mode. JSON
validation output should go to stdout.

## Current Friction

The MVP implementation deliberately kept modules simple while proving the local
workflow. That made the product checkpoint easier to reach, but a few shallow
modules now reduce locality:

- `validate`, `export`, and `render` each know too much about the load, parse,
  validate, cast, and failure-ordering sequence.
- Mermaid and D2 exporters each rediscover Group roots, Group parentage,
  contained IDs, emitted objects, and Node paths after validation has already
  proven related DiagramSpec rules.
- Repairable Validation Error shape lives in core, while read/parse conversion
  and text/JSON presentation live in CLI.
- Review-Stable Rendering provenance is split between CLI source hashing and
  SVG metadata insertion in the render adapter.
- Most command behaviour is tested through spawned CLI processes, which is
  valuable for smoke coverage but too broad as the only practical seam.

## Architecture Deepening Targets

### Validated DiagramSpec Loading

Add a deep module that owns the ordered lifecycle from explicit DiagramPilot
Source File path to either:

- a valid DiagramSpec with source context, or
- a diagnostic-friendly read, parse, or semantic validation failure.

`validate`, `export`, `render`, future stale artifact checks, and future MCP
tools should use this module instead of repeating the lifecycle. This module
must not write files or rewrite source.

### DiagramSpec Topology

Add a deep module that owns reusable knowledge about Diagram Objects:

- Stable ID lookup.
- Node lookup.
- Edge lookup.
- Group lookup.
- Group roots.
- Group parentage.
- Containment relationships.
- Node paths for targets that need hierarchical paths.
- Traversal order for export adapters.

Validation and export adapters should consume topology where it improves
locality. Mermaid and D2 adapters should still own target-specific syntax and
escaping.

### Diagnostics

Centralize diagnostic modelling so read failures, parse failures, semantic
validation failures, text output, and JSON output share one repairable model.

The CLI should become an adapter over diagnostics. Future MCP support should be
able to reuse the same diagnostic interface rather than reimplementing failure
mapping.

### Derived Artifact Provenance

Deepen provenance so source hashing, no-timestamp policy, metadata
construction, and SVG metadata insertion have one place to live or one clearly
owned seam between CLI and render adapter.

Rendered SVG provenance should continue to include source path, source SHA-256
hash, DiagramPilot version, renderer name, and renderer version. It must not
include wall-clock timestamps.

### Command Planning

Add a command planning seam after validated loading and diagnostics are stable.
Command planning should represent exit code, stdout, stderr, and file-write
intent. Filesystem, streams, and process execution should remain adapters.

Keep executable smoke tests for install-level confidence, but move most command
behaviour tests to the deeper command planning seam.

## Renderer Strategy

Start by compiling to existing ecosystems instead of building every rendering
detail from scratch.

Current targets:

- Mermaid export.
- D2 export.
- SVG render through D2.

The DiagramPilot install includes a pinned, platform-specific D2 rendering
dependency. Users should not need a separate manual D2 installation or a
first-run renderer download.

Rendering should be stable enough for code review for the same DiagramPilot
version, renderer version, input, and environment. Do not promise perfect
determinism across renderer or environment changes.

## Layout Strategy

MVP layout configuration is limited to top-level `direction`.

The default renderer handles layout. Stronger layout configuration, manual
constraints, and dedicated layout packages are future product backlog work.

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

## Documentation Strategy

Public Documentation and Internal Documentation are separate categories.

Internal Documentation stays under `docs/` and includes maintainer workflow,
architecture, roadmap, ADRs, triage labels, and issue-tracker guidance.

Public Documentation should live under `docs-public/` while hosted URLs remain
under `https://diagrampilot.com/docs/...`. `llms.txt` should link only Public
Documentation.

The Checkout Demo Project should live in the examples area and demonstrate one
complete repo-native workflow with a DiagramPilot Source File and SVG Derived
Artifact.

## Constraints

- Core workflows must run locally.
- Generated artifacts must be stable enough for code review.
- Validation errors must be useful to humans and AI coding agents.
- DiagramSpec remains the source of truth.
- Hosted services are optional integrations, not required dependencies.
- The MVP has no arbitrary per-object styling.
- The MVP has no project analyzers.
- MCP comes after the CLI/core workflow and architecture seams are stable.
- Public docs and URLs must use `https://diagrampilot.com`.
