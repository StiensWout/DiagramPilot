# Try DiagramPilot With The Checkout Demo Project

Use the Checkout Demo Project when you want the shortest real repository
workflow for DiagramPilot. It is a small repo-shaped checkout system with local
source snippets, a DiagramPilot source file, and a committed SVG artifact.

## Goal

Run the repo review workflow with `diagrampilot check`, repair DiagramSpec
source problems with `validate`, refresh the committed SVG with `render --out`,
render PNG when a raster artifact is needed, inspect SVG provenance, and export
when another diagram-as-code format is needed.

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

DiagramPilot Source Files use `*.dp.yaml` or `*.dp.json`. The demo uses:

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

## Demo Workflow

Run the workflow from the demo project directory:

```bash
cd demo-projects/checkout
diagrampilot check
```

Expected check result:

```text
Checked 1 DiagramPilot Source File. All expected SVG artifacts are fresh.
```

`diagrampilot check` is the repo-level review/CI command. It is read-only: it
discovers DiagramPilot source files, validates them, and checks the expected
SVG artifact without rendering, fixing, or writing files.

In v1, `check` uses the next-to-source same-stem Expected SVG Artifact. For
`docs/architecture.dp.yaml`, the expected SVG artifact is
`docs/architecture.svg`.

SVG freshness is provenance-only in v1. `check` reads DiagramPilot provenance
metadata from the expected SVG artifact; it does not render to compare output.

`check` does not check Mermaid, D2, DOT, or PNG artifact freshness. v1 also
does not support configurable artifact mappings or ignore patterns.

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

Render the SVG artifact only after validation succeeds:

```bash
diagrampilot render docs/architecture.dp.yaml --out docs/architecture.svg
```

`render` requires `--out` and defaults to SVG. Keep the rendered SVG next to
the source when that is practical for review.

Render PNG from the same local render path when a raster artifact is needed:

```bash
diagrampilot render docs/architecture.dp.yaml --format png --out docs/architecture.png
```

PNG rendering rasterizes the SVG output, so SVG and PNG stay aligned.

Export to another diagram-as-code format when needed:

```bash
diagrampilot export docs/architecture.dp.yaml --format mermaid
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

- Create or update `*.dp.yaml` or `*.dp.json` as the editable source.
- Prefer YAML for human- and agent-authored diagrams.
- Use stable lowercase snake case IDs for nodes, edges, and groups.
- Keep IDs globally unique within one DiagramSpec.
- Preserve existing IDs when updating diagrams.
- Validate before rendering.
- Fix validation errors directly in the source spec.
- Render only after validation succeeds.
- Do not hand-edit generated SVG, Mermaid, D2, DOT, or PNG unless explicitly
  requested.

## CLI Contract

```bash
diagrampilot init
diagrampilot init --docs
diagrampilot check
diagrampilot check demo-projects/checkout --json
diagrampilot validate docs/architecture.dp.yaml
diagrampilot validate docs/architecture.dp.yaml --json
diagrampilot render docs/architecture.dp.yaml --out docs/architecture.svg
diagrampilot render docs/architecture.dp.yaml --format png --out docs/architecture.png
diagrampilot export docs/architecture.dp.yaml --format mermaid
diagrampilot export docs/architecture.dp.yaml --format d2 --out docs/architecture.d2
diagrampilot export docs/architecture.dp.yaml --format dot --out docs/architecture.dot
```

`diagrampilot init` does not create or update `llms.txt` or `docs/diagrampilot.md` by default.
It does not scan the codebase or generate a diagram.

`diagrampilot init --docs`
: Creates or updates the managed local agent docs. Use `diagrampilot init --docs` only when the repository intentionally wants managed local agent docs.

`diagrampilot check [path]`
: Read-only repo review/CI command. Discovers DiagramPilot source files in the
given scope, validates them, and checks next-to-source same-stem expected SVG
artifacts through provenance metadata only.

`diagrampilot check [path] --json`
: Emits structured repo check results to stdout for agents and CI scripts.

`diagrampilot validate <path>`
: Validates one explicit DiagramPilot source file path.

`diagrampilot validate <path> --json`
: Emits structured repairable validation errors for agents and scripts.

`diagrampilot render <path> --out <artifact.svg>`
: Renders a valid DiagramPilot source file to SVG. `--out` is required and SVG is the default render format.

`diagrampilot render <path> --format svg|png --out <path>`
: Renders SVG explicitly or renders PNG by rasterizing the SVG output from the local render path.

`diagrampilot export <path> --format mermaid|d2|dot`
: Prints an exported text format to stdout.

`diagrampilot export <path> --format mermaid|d2|dot --out <path>`
: Writes an exported text format to a file.

Diagnostics and validation errors should go to stderr, not stdout.
