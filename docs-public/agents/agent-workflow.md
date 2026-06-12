# Agent Workflow

Use this Agent Authoring Loop when an AI coding agent needs to add or update a
DiagramPilot diagram inside a repository. The loop keeps DiagramSpec source
reviewable, refreshes Derived Artifacts from source, and leaves `lint` and
`check` as read-only commands before review or CI.

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
diagrampilot fix docs/architecture.dp.yaml --json
diagrampilot lint docs/architecture.dp.yaml
diagrampilot inspect docs --json
diagrampilot render docs/architecture.dp.yaml --out docs/architecture.svg
diagrampilot check
```

Use `create` only when the source file does not exist yet. For an existing
diagram, inspect first, edit the `*.dp.yaml` file, then continue with
`format`, `validate`, `lint`, `inspect --json`, `render --out`, and `check`.

`validate` reports repairable DiagramSpec source errors. `fix --json` is the
reviewable planning mode for deterministic source-only repairs; apply
`diagrampilot fix <path>` only after reviewing the plan. `lint` validates and
then reports DiagramSpec readability warnings for one source file without
writing files. `inspect --json` is the machine-readable diagnostic and
inventory interface for agents: it exposes discovered sources, Diagram Object
counts, Stable IDs, topology, expected artifacts, and practical stale or
missing artifact summaries.

Use `diagrampilot icons search <query>` and the [Icon reference](icons.md) when
validation reports an unknown `lucide:*` icon.

`render` requires `--out` and defaults to SVG. Use `check` after rendering to
verify Artifact Freshness without rewriting files.

## Pull Request Review

Use `diff` during a pull request review workflow when reviewers need to see
what changed between two DiagramPilot Source Files before looking at rendered
artifacts:

```bash
diagrampilot diff main.dp.yaml branch.dp.yaml --json
diagrampilot diff main.dp.yaml branch.dp.yaml --out review/architecture-diff.svg
diagrampilot inspect docs --json
diagrampilot check
```

`diff` compares two DiagramPilot Source Files by Stable ID. It reports added,
removed, and changed nodes, edges, and groups, including practical field
changes such as labels, containment, endpoints, direction, kinds, icons, and
metadata. JSON output is intended for agents and CI. SVG output renders a
generated diff diagram through DiagramPilot instead of requiring hand-edited
SVG.

## Readability Lint

Use `diagrampilot lint <path>` before rendering large or review-sensitive
diagrams:

```bash
diagrampilot lint docs/architecture.dp.yaml
diagrampilot lint docs/architecture.dp.yaml --json
```

`validate` answers whether the DiagramPilot Source File is structurally valid.
`lint` answers whether a valid DiagramSpec is likely to be readable in review.
`check` answers whether expected Derived Artifacts are fresh. `lint` is
read-only and does not replace either command.

Lint warnings include `path`, `ruleId`, `severity`, `message`, and
`suggestion`. The first readability thresholds are:

- group contains more than 12 direct objects;
- node has more than 6 incoming edges;
- node has more than 6 outgoing edges;
- diagram has more than 50 total nodes, edges, and groups;
- diagram has more than 1.5 edges per node once it has at least 20 nodes.

Lint also reports orphan nodes, unlabeled edges, missing edge kinds, and
duplicate node or group labels.

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
