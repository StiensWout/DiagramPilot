# DiagramPilot

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/brand/diagrampilot-logo-light.svg">
  <img src="assets/brand/diagrampilot-logo.svg" alt="DiagramPilot wordmark">
</picture>

DiagramPilot is a local-first, repo-native diagram compiler for AI coding
agents. It validates structured DiagramSpec source files, renders review-stable
SVG artifacts, and exports Mermaid, D2, or DOT text from the same source of
truth.

Public documentation is hosted at `https://diagrampilot.com`.

## Try DiagramPilot

Install, run, or remove the package with the canonical public guide:

- [Installation and removal guide](https://diagrampilot.com/docs/agents/installation.md)

Start with the canonical Checkout Demo Project quickstart:

- [Checkout demo quickstart](https://diagrampilot.com/docs/agents/quickstart.md)
- Demo source file: `demo-projects/checkout/docs/architecture.dp.yaml`
- Demo SVG artifact: `demo-projects/checkout/docs/architecture.svg`

The examples below assume `diagrampilot` is available on `PATH`. For
contributor source checkouts of this repository, run `npm install` and
`npm run build`; from
`demo-projects/checkout`, use `node ../../packages/cli/dist/index.js` in place
of `diagrampilot` if the binary is not linked.

Run the primary workflow from the repository root:

```bash
cd demo-projects/checkout
diagrampilot check
diagrampilot validate docs/architecture.dp.yaml
diagrampilot render docs/architecture.dp.yaml --out docs/architecture.svg
diagrampilot export docs/architecture.dp.yaml --format mermaid
diagrampilot export docs/architecture.dp.yaml --format d2 --out docs/architecture.d2
diagrampilot export docs/architecture.dp.yaml --format dot --out docs/architecture.dot
```

Use `check` as the read-only repo review/CI command. Use `validate` when you
need explicit source repair output. `render` requires `--out`; `export` prints
to stdout by default and writes a file only when `--out` is provided.

## Source Of Truth

DiagramSpec is the source model. A DiagramPilot source file stores DiagramSpec
as YAML or JSON:

- `*.dp.yaml`
- `*.dp.json`

Agents should update DiagramPilot source files and regenerate outputs rather
than hand-editing generated artifacts. Rendered SVG artifacts include
deterministic provenance metadata with the source path, source SHA-256 hash,
DiagramPilot version, and renderer version.

The DiagramSpec v1 JSON Schema is a helper for editors, code generators, and
other tooling. Core validation remains authoritative for semantic rules.

## Public Documentation

- [Checkout demo quickstart](https://diagrampilot.com/docs/agents/quickstart.md)
- [Installation and removal guide](https://diagrampilot.com/docs/agents/installation.md)
- [DiagramSpec guide](https://diagrampilot.com/docs/agents/spec.md)
- [Error repair guide](https://diagrampilot.com/docs/agents/error-repair.md)
- [Agent examples](https://diagrampilot.com/docs/agents/examples.md)
- [Agent prompting guide](https://diagrampilot.com/docs/agents/prompting.md)
- [DiagramSpec v1 JSON Schema](https://diagrampilot.com/schema/diagramspec-v1.schema.json)

## License And Brand

DiagramPilot code and repository materials use the [MIT Code License](LICENSE).
The DiagramPilot name, mark, wordmark, `diagrampilot.com` domain, and official
release identity are covered separately by the
[Brand Use Policy](BRAND_USE_POLICY.md).

Canonical DiagramPilot Brand Assets live in `assets/brand/`: the
[DiagramPilot mark](assets/brand/diagrampilot-mark.svg) for icon-sized
placements, the [DiagramPilot wordmark](assets/brand/diagrampilot-logo.svg) for
light surfaces, and the
[DiagramPilot light wordmark](assets/brand/diagrampilot-logo-light.svg) for
dark surfaces.

## CLI Commands

```bash
diagrampilot init
diagrampilot init --docs
diagrampilot check
diagrampilot check docs --json
diagrampilot validate docs/architecture.dp.yaml
diagrampilot validate docs/architecture.dp.yaml --json
diagrampilot render docs/architecture.dp.yaml --out docs/architecture.svg
diagrampilot export docs/architecture.dp.yaml --format mermaid
diagrampilot export docs/architecture.dp.yaml --format d2 --out docs/architecture.d2
diagrampilot export docs/architecture.dp.yaml --format dot --out docs/architecture.dot
```

`init` does not create local agent docs by default. Use `init --docs` only
when the repository intentionally wants managed `llms.txt` and
`docs/diagrampilot.md` guidance.

`check` discovers DiagramPilot source files in the current directory, one
explicit directory, or one explicit source file. It validates them and checks
next-to-source same-stem expected SVG artifacts through DiagramPilot provenance
metadata only.
