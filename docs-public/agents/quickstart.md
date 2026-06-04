# Try DiagramPilot With The Checkout Demo Project

Use the Checkout Demo Project when you want the shortest real repository
workflow for DiagramPilot. It is a small repo-shaped checkout system with local
source snippets, a DiagramPilot source file, and a committed SVG artifact.

## Goal

Validate and render the demo architecture diagram, inspect its provenance, and
export it when another diagram-as-code format is needed.

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
demo-projects/checkout/docs/architecture.d2
```

`architecture.svg` is committed with the demo. `architecture.d2` is an optional
export file created only when the D2 export command uses `--out`.
`architecture.dp.yaml` is the editable source of truth. SVG, Mermaid, D2, DOT,
and PNG are derived artifacts; regenerate them from the source instead of
hand-editing generated output.

## Demo Workflow

Run the workflow from the demo project directory:

```bash
cd demo-projects/checkout
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

`render` requires `--out`. Keep the rendered SVG next to the source when that
is practical for review.

Export to another diagram-as-code format when needed:

```bash
diagrampilot export docs/architecture.dp.yaml --format mermaid
diagrampilot export docs/architecture.dp.yaml --format d2 --out docs/architecture.d2
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
diagrampilot validate docs/architecture.dp.yaml
diagrampilot render docs/architecture.dp.yaml --out docs/architecture.svg
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

Use the same file shape in another repository:

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
diagrampilot validate docs/architecture.dp.yaml
diagrampilot validate docs/architecture.dp.yaml --json
diagrampilot render docs/architecture.dp.yaml --out docs/architecture.svg
diagrampilot export docs/architecture.dp.yaml --format mermaid
diagrampilot export docs/architecture.dp.yaml --format d2 --out docs/architecture.d2
```

`diagrampilot init`
: Creates or updates DiagramPilot support files only. It does not scan the
codebase or generate a diagram by default.

`diagrampilot validate <path>`
: Validates one explicit DiagramPilot source file path.

`diagrampilot validate <path> --json`
: Emits structured repairable validation errors for agents and scripts.

`diagrampilot render <path> --out <artifact.svg>`
: Renders a valid DiagramPilot source file to SVG. `--out` is required.

`diagrampilot export <path> --format mermaid|d2`
: Prints an exported text format to stdout.

`diagrampilot export <path> --format mermaid|d2 --out <path>`
: Writes an exported text format to a file.

Diagnostics and validation errors should go to stderr, not stdout.
