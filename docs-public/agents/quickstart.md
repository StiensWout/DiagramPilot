# Try DiagramPilot With The Checkout Demo Project

Use the Checkout Demo Project when you want the shortest real repository
workflow for DiagramPilot. It is a small repo-shaped checkout system with local
source snippets, a DiagramPilot source file, and a committed SVG artifact.

## Goal

Run the repo review workflow with `diagrampilot check`, repair DiagramSpec
source problems with `validate`, review readability warnings with `lint`,
refresh the committed SVG with `render --out`, render PNG when a raster
artifact is needed, inspect SVG provenance, and export when another
diagram-as-code format is needed.

## Local Invocation

The command examples use `diagrampilot`. In this repository, build the local
CLI before running the demo:

```bash
npm install
npm run build
```

After `cd demo-projects/checkout`, use this local command if `diagrampilot` is
not linked on `PATH`:

```bash
node ../../packages/cli/dist/index.js
```

## Demo Files

From the repository root, the demo lives here:

```text
demo-projects/checkout
```

DiagramPilot Source Files use `*.dp.yaml`. The demo uses:

```text
demo-projects/checkout/docs/architecture.dp.yaml
```

Derived Artifacts produced or refreshed by this workflow:

```text
demo-projects/checkout/docs/architecture.svg
demo-projects/checkout/docs/architecture.png
demo-projects/checkout/docs/architecture.d2
demo-projects/checkout/docs/architecture.dot
```

`architecture.svg` is committed with the demo. `architecture.png`,
`architecture.d2`, and `architecture.dot` are optional derived files created
only when their render or export commands use `--out`.
`architecture.dp.yaml` is the editable source of truth. SVG, Mermaid, D2, DOT,
and PNG are derived artifacts; regenerate them from the source instead of
hand-editing generated output.

Create a new starter DiagramPilot Source File when a repository does not have
one yet:

```bash
diagrampilot create docs/architecture.dp.yaml --template architecture
diagrampilot create docs/system-context.dp.yaml --template system-context
diagrampilot create docs/service-map.dp.yaml --template service-map
diagrampilot validate docs/architecture.dp.yaml
diagrampilot render docs/architecture.dp.yaml --out docs/architecture.svg
```

Maintained Source Creation templates are `architecture`, `flow`, `package-map`,
`system-context`, and `service-map`. `create` writes `*.dp.yaml` source files
only and refuses to overwrite an existing file.

`*.dp.json` is not a DiagramPilot Source File path. Source files are
`*.dp.yaml` only, repo discovery ignores JSON source files, and DiagramPilot
does not provide a migration command. JSON remains available for `--json`
command output, the DiagramSpec JSON Schema helper, SVG provenance metadata,
package manifests, and other tooling surfaces.

## Demo Workflow

Run the workflow from the demo project directory:

```bash
cd demo-projects/checkout
diagrampilot check
diagrampilot inspect
diagrampilot lint docs/architecture.dp.yaml
```

Expected check result:

```text
Checked 1 DiagramPilot Source File. All expected SVG artifacts are fresh.
```

`diagrampilot check` is the repo-level review/CI command. It is read-only: it
discovers DiagramPilot source files, validates them, and checks expected
artifacts without rendering, fixing, or writing files.

`diagrampilot inspect` is the read-only inventory command. It reports
discovered DiagramPilot Source Files, title/direction, Diagram Object counts,
Stable IDs, topology roots/depth, and expected artifact status before an agent
edits a source.

`diagrampilot lint <path>` is a read-only readability command for one
DiagramPilot Source File. It validates the source first, then reports warnings
such as orphan nodes, unlabeled edges, missing edge kinds, oversized groups,
high fan-in or fan-out nodes, duplicate node or group labels, and diagrams that
are too large or dense for review. Use `validate` for source correctness,
`lint` for readability, and `check` for expected artifact freshness.

Without Repo Workflow Configuration, `check` uses the next-to-source same-stem
Expected SVG Artifact. For `docs/architecture.dp.yaml`, the expected SVG
artifact is `docs/architecture.svg`.

SVG freshness is provenance-based. `check` reads DiagramPilot provenance
metadata from the expected SVG artifact; it does not render to compare output.
Configured Mermaid, D2, and DOT artifacts use content comparison against the
current export output. Configured PNG freshness is presence-only:
`check` verifies the configured PNG file exists and defers PNG byte comparison
until readable PNG provenance is available.

Repo Workflow Configuration is optional. `check` discovers the nearest
`diagrampilot.config.yaml` from the command scope upward to the Git root or
filesystem root, validates it before source processing, and includes the config
path in `--json` output when one is used. Start a minimal config explicitly:

```bash
diagrampilot init --config
```

The first config schema requires top-level `version: 1`. Source ignore
patterns live under `sources.ignore`, use gitignore-style paths relative to the
config directory, and apply only to source discovery:

```yaml
version: 1
sources:
  ignore:
    - generated/**
    - vendor/diagrams/**
```

Absolute ignore patterns and patterns that leave the config directory tree are
invalid config.

Configured artifact mappings live under `artifacts`. Each mapping uses exactly
one of `source` or `sourceGlob`; matched mappings replace the default SVG
expectation for that source, while unmatched sources keep the default SVG
expectation:

```yaml
version: 1
artifacts:
  - source: docs/architecture.dp.yaml
    outputs:
      - format: svg
        path: docs/architecture.svg
        profile: presentation
      - format: mermaid
        path: docs/architecture.mmd
        profile: compact
      - format: png
        path: docs/architecture.png
      - format: markdown
        path: docs/architecture.embed.md
  - sourceGlob: docs/diagrams/*.dp.yaml
    outputs:
      - format: d2
        path: artifacts/{sourceDir}/{stem}.{format}
```

Configured output formats are limited to `svg`, `png`, `mermaid`, `d2`, `dot`,
and `markdown`. Output path templates support only `{stem}`, `{sourceDir}`,
`{sourcePath}`, and `{format}`. Markdown outputs are standalone generated
embed files. They reference the other configured artifacts in the same mapping
with paths relative to the embed file. `check` marks a Markdown embed stale
when its generated content differs or when a referenced artifact is missing or
stale.

Configured outputs may set a fixed `profile`: `clean`, `compact`, or
`presentation`. Omit `profile` for compatible clean output. Profiles are
repo-workflow output settings only; do not add styling fields, CSS, themes, or
per-object presentation choices to DiagramSpec source files.

When `check` reports a source problem, use `validate` on the explicit source
file to get the detailed repair loop:

```bash
diagrampilot validate docs/architecture.dp.yaml
```

Expected validation result:

```text
Valid docs/architecture.dp.yaml
```

Validate before rendering. Validation checks the DiagramPilot source file and
reports repairable source errors. It does not check whether generated artifacts
are fresh.

Normalize source YAML before review when you want canonical key order:

```bash
diagrampilot format docs/architecture.dp.yaml
```

`format` parses and validates the source before rewriting it. It preserves
DiagramSpec data, unknown metadata, and object/array order. It does not promise
comment preservation; YAML comments may be removed or moved.

Render the SVG artifact only after validation succeeds:

```bash
diagrampilot render docs/architecture.dp.yaml --out docs/architecture.svg
```

`render` requires `--out` and defaults to SVG. Keep the rendered SVG next to
the source when that is practical for review.

Render a declared projection from the same source when a large diagram needs a
focused review artifact:

```bash
diagrampilot render docs/architecture.dp.yaml --view runtime --out docs/architecture-runtime.svg
```

Views are declared in the DiagramSpec `views` collection. They filter the
validated source before render/export and do not mutate the source file.

Render one group from the same source when reviewers need a bounded subsystem:

```bash
diagrampilot render docs/architecture.dp.yaml --group checkout_runtime --out docs/architecture-checkout-runtime.svg
```

Render a selected node neighborhood when a review starts from one Stable ID:

```bash
diagrampilot render docs/architecture.dp.yaml --around orders_service --depth 1 --out docs/architecture-orders-service.svg
```

Render an overview artifact without edge labels when labels make a large
diagram harder to scan:

```bash
diagrampilot render docs/architecture.dp.yaml --hide-edge-labels --out docs/architecture-overview.svg
```

Focused render filters apply after `--view` when both are provided. They write
only the requested Derived Artifact and never mutate the DiagramPilot Source
File.

Render PNG from the same local render path when a raster artifact is needed:

```bash
diagrampilot render docs/architecture.dp.yaml --format png --out docs/architecture.png
```

PNG rendering rasterizes the SVG output, so SVG and PNG stay aligned.

Export to another diagram-as-code format when needed:

```bash
diagrampilot export docs/architecture.dp.yaml --format mermaid
diagrampilot export docs/architecture.dp.yaml --view runtime --format mermaid --out docs/architecture-runtime.mmd
diagrampilot export docs/architecture.dp.yaml --format d2 --out docs/architecture.d2
diagrampilot export docs/architecture.dp.yaml --format dot --out docs/architecture.dot
```

`export` prints to stdout by default. Use `--out` only when you want to write a
derived export file.

## SVG Provenance

Rendered SVG includes deterministic provenance metadata:

- `sourcePath`
- `sourceSha256`
- `diagramPilotVersion`
- `renderer`

The provenance does not include wall-clock timestamps. This keeps rendered SVG
review-stable and makes stale artifacts easy to detect by re-rendering and
checking the Git diff.

```bash
diagrampilot check
diagrampilot inspect
diagrampilot lint docs/architecture.dp.yaml
diagrampilot validate docs/architecture.dp.yaml
diagrampilot render docs/architecture.dp.yaml --out docs/architecture.svg
diagrampilot render docs/architecture.dp.yaml --format png --out docs/architecture.png
git diff --exit-code docs/architecture.svg
```

## What The Demo Shows

The checkout demo source demonstrates the current DiagramSpec shape:

- Nodes for browser, API, service, database, event stream, and worker concepts.
- Groups for customer experience, runtime, and fulfillment boundaries.
- `lucide:*` icons.
- Labeled directed edges.
- `metadata.source` references to local repository paths.

Use these local references when updating a diagram so reviewers can connect a
diagram object back to the code it represents.

## Create Your Own Diagram

To copy the same source/render pattern into another repository, use this file
shape:

```text
docs/architecture.dp.yaml
docs/architecture.svg
```

Agent rules:

- Create or update `*.dp.yaml` as the editable source.
- Use stable lowercase snake case IDs for nodes, edges, and groups.
- Keep IDs globally unique within one DiagramSpec.
- Preserve existing IDs when updating diagrams.
- Validate before rendering.
- Fix validation errors directly in the source spec.
- Render only after validation succeeds.
- Do not hand-edit generated SVG, Mermaid, D2, DOT, PNG, or Markdown embeds
  unless explicitly requested.

## CLI Contract

```bash
diagrampilot init
diagrampilot init --docs
diagrampilot init --config
diagrampilot check
diagrampilot inspect
diagrampilot generate
diagrampilot watch docs
diagrampilot check demo-projects/checkout --json
diagrampilot inspect demo-projects/checkout --json
diagrampilot validate docs/architecture.dp.yaml
diagrampilot validate docs/architecture.dp.yaml --json
diagrampilot lint docs/architecture.dp.yaml
diagrampilot lint docs/architecture.dp.yaml --json
diagrampilot format docs/architecture.dp.yaml
diagrampilot render docs/architecture.dp.yaml --out docs/architecture.svg
diagrampilot render docs/architecture.dp.yaml --view runtime --out docs/architecture-runtime.svg
diagrampilot render docs/architecture.dp.yaml --group checkout_runtime --out docs/architecture-checkout-runtime.svg
diagrampilot render docs/architecture.dp.yaml --around orders_service --depth 1 --out docs/architecture-orders-service.svg
diagrampilot render docs/architecture.dp.yaml --hide-edge-labels --out docs/architecture-overview.svg
diagrampilot render docs/architecture.dp.yaml --format png --out docs/architecture.png
diagrampilot export docs/architecture.dp.yaml --format mermaid
diagrampilot export docs/architecture.dp.yaml --view runtime --format mermaid --out docs/architecture-runtime.mmd
diagrampilot export docs/architecture.dp.yaml --format d2 --out docs/architecture.d2
diagrampilot export docs/architecture.dp.yaml --format dot --out docs/architecture.dot
```

`diagrampilot init` does not create or update `llms.txt` or `docs/diagrampilot.md` by default.
It does not create Repo Workflow Configuration by default, scan the codebase,
or generate a diagram.

`diagrampilot init --docs`
: Creates or updates the managed local agent docs. Use `diagrampilot init --docs` only when the repository intentionally wants managed local agent docs.

`diagrampilot init --config`
: Creates a minimal `diagrampilot.config.yaml`. Use `diagrampilot init --config`
only when the repository intentionally wants `diagrampilot.config.yaml`. It
fails with repair guidance when the config already exists.

`diagrampilot check [path]`
: Read-only repo review/CI command. Discovers DiagramPilot source files in the
given scope, validates them, and checks expected artifacts. Without config it
checks next-to-source same-stem expected SVG artifacts through provenance
metadata. When `diagrampilot.config.yaml` is found, `check` validates config
first, applies `sources.ignore` only to source discovery, and checks configured
artifact mappings for matched sources.

`diagrampilot check [path] --json`
: Emits structured repo check results to stdout for agents and CI scripts,
including the config path when config is used.

`diagrampilot inspect [path]`
: Emits concise read-only inventory for humans, including discovered source
files, diagram counts, Stable IDs, topology summary, and artifact expectations.

`diagrampilot inspect [path] --json`
: Emits stable read-only inventory for agents, including invalid-source
diagnostics and stale or missing artifact summaries when practical.

`diagrampilot generate [path]`
: Rewrites configured Derived Artifacts and generated Markdown embed files for
the given scope.

`diagrampilot watch [path]`
: Runs a local authoring loop for the given scope. It watches `*.dp.yaml` and
`diagrampilot.config.yaml`, debounces changes, checks first, and generates only
when source/config state is valid.

`diagrampilot validate <path>`
: Validates one explicit DiagramPilot source file path.

`diagrampilot validate <path> --json`
: Emits structured repairable validation errors for agents and scripts.

`diagrampilot lint <path>`
: Validates one DiagramPilot Source File, then reports readability warnings
without writing files. Warnings include `path`, `ruleId`, `severity`,
`message`, and `suggestion`.

`diagrampilot lint <path> --json`
: Emits stable machine-readable lint output for agents and CI scripts.

`diagrampilot format <path>`
: Validates and rewrites one `*.dp.yaml` source into canonical YAML. Formatting
preserves DiagramSpec data and object/array order, but YAML comments may be
removed or moved.

`diagrampilot render <path> --out <artifact.svg>`
: Renders a valid DiagramPilot source file to SVG. `--out` is required and SVG is the default render format.

`diagrampilot render <path> --view <view-id> --out <artifact.svg>`
: Renders a declared DiagramSpec view projection to SVG without changing the
source file.

`diagrampilot render <path> --group <group-id> --out <artifact.svg>`
: Renders one group with its contained nodes, nested groups, and local edges
while excluding unrelated diagram objects.

`diagrampilot render <path> --around <node-id> --depth <n> --out <artifact.svg>`
: Renders a node neighborhood to the requested connection depth, preserving
group context for included nodes.

`diagrampilot render <path> --hide-edge-labels --out <artifact.svg>`
: Renders an overview artifact without edge labels and without changing the
source file.

`diagrampilot render <path> --format svg|png --out <path>`
: Renders SVG explicitly or renders PNG by rasterizing the SVG output from the local render path.

`diagrampilot export <path> --format mermaid|d2|dot`
: Prints an exported text format to stdout.

`diagrampilot export <path> --view <view-id> --format mermaid|d2|dot`
: Prints a declared view projection in the selected text format.

`diagrampilot export <path> --format mermaid|d2|dot --out <path>`
: Writes an exported text format to a file.

Diagnostics and validation errors should go to stderr, not stdout.
