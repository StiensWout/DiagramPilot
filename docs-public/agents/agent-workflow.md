# Agent Workflow

Use this Agent Authoring Loop when an AI coding agent needs to add or update a
DiagramPilot diagram inside a repository. The loop keeps DiagramSpec source
reviewable, refreshes Derived Artifacts from source, and leaves `check` as the
read-only command before review or CI.

## Source And Artifacts

A DiagramPilot Source File stores DiagramSpec as `*.dp.yaml`. It is the
editable source of truth.

Derived Artifacts are generated from a DiagramPilot Source File:

- SVG
- PNG
- Mermaid
- D2
- DOT
- generated Markdown embeds

Edit the `*.dp.yaml` source, then regenerate outputs. Do not hand-edit
generated SVG, PNG, Mermaid, D2, or DOT outputs.

## Canonical Command Sequence

Create or update the source first:

```bash
diagrampilot create docs/architecture.dp.yaml --template architecture
diagrampilot create docs/system-context.dp.yaml --template system-context
diagrampilot create docs/service-map.dp.yaml --template service-map
diagrampilot format docs/architecture.dp.yaml
diagrampilot validate docs/architecture.dp.yaml
diagrampilot inspect docs --json
diagrampilot render docs/architecture.dp.yaml --out docs/architecture.svg
diagrampilot check
```

Use `create` only when the source file does not exist yet. For an existing
diagram, inspect first, edit the `*.dp.yaml` file, then continue with
`format`, `validate`, `inspect --json`, `render --out`, and `check`.

`validate` reports repairable DiagramSpec source errors. `inspect --json` is
the machine-readable diagnostic and inventory interface for agents: it exposes
discovered sources, Diagram Object counts, Stable IDs, topology, expected
artifacts, and practical stale or missing artifact summaries.

`render` requires `--out` and defaults to SVG. Use `check` after rendering to
verify Artifact Freshness without rewriting files.

## Stable IDs

Stable IDs make diagram changes reviewable. Preserve an object's ID when its
label, description, group, icon, or connected edges change. Create a new ID
only when the underlying diagram object is new.

Stable IDs should be lowercase snake_case within one DiagramSpec. They keep
review diffs focused on the actual architecture change instead of turning a
label edit into delete-and-add churn.

## Nightly Builds

Use Nightly Builds only when you are testing a current build that is not on the
normal `latest` install path. Pin the nightly exactly so local and CI runs use
the same package:

```bash
npm install --save-dev --save-exact diagrampilot@nightly
```

Nightly Builds can change between publishes. Use the normal installation guide
for routine repository workflows, and keep nightly usage scoped to explicit
testing branches or maintainer-directed checks.

## Windows Paths

Use forward-slash paths in commands on every platform:

```bash
diagrampilot render docs/architecture.dp.yaml --out docs/architecture.svg
diagrampilot check docs
```

Avoid backslash command paths such as `docs\architecture.dp.yaml`. SVG
provenance includes the source path used at render time. On Windows, a
backslash-rendered artifact can later produce a Windows provenance mismatch
when `check` expects the same source through a forward-slash repo path.

If `check` reports a source path mismatch after a successful render, rerun the
render command with forward-slash paths and commit the refreshed Derived
Artifact.
