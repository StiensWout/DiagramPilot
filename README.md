# DiagramPilot

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/brand/diagrampilot-logo-light.svg">
  <img src="assets/brand/diagrampilot-logo.svg" alt="DiagramPilot">
</picture>

DiagramPilot is a local-first, repo-native diagram compiler for AI coding
agents. It validates structured DiagramSpec source files, renders review-stable
SVG or PNG artifacts, and exports Mermaid, D2, or DOT text from the same source
of truth.

The v0.3.0 Alpha Capability Release is the release-aligned public shape:
DiagramPilot Source Files are YAML-only, DOT export and PNG rendering are
available, Repo Workflow Configuration can define expected artifacts,
`diagrampilot generate` refreshes configured Derived Artifacts and generated
Markdown embed files, and MCP is a shipped alpha integration. Existing users
should review the
[0.2 -> 0.3 upgrade guide](https://diagrampilot.com/docs/agents/installation.md#02---03-upgrade-guide).

Public documentation is hosted at `https://diagrampilot.com`.

## Try DiagramPilot

Install, run, or remove the package:

- [Installation and removal guide](https://diagrampilot.com/docs/agents/installation.md)

Start with the Checkout Demo Project:

- [Checkout demo quickstart](https://diagrampilot.com/docs/agents/quickstart.md)
- Demo source file: `demo-projects/checkout/docs/architecture.dp.yaml`
- Demo SVG artifact: `demo-projects/checkout/docs/architecture.svg`

Run the primary workflow from the repository root:

```bash
cd demo-projects/checkout
diagrampilot check
diagrampilot inspect
diagrampilot create docs/new-architecture.dp.yaml --template architecture
diagrampilot validate docs/architecture.dp.yaml
diagrampilot format docs/architecture.dp.yaml
diagrampilot render docs/architecture.dp.yaml --out docs/architecture.svg
diagrampilot render docs/architecture.dp.yaml --format png --out docs/architecture.png
diagrampilot export docs/architecture.dp.yaml --format mermaid
diagrampilot export docs/architecture.dp.yaml --format d2 --out docs/architecture.d2
diagrampilot export docs/architecture.dp.yaml --format dot --out docs/architecture.dot
```

Use `check` as the read-only repo review/CI command. Use `inspect` when an
agent needs a read-only inventory of DiagramPilot Source Files, topology,
Stable IDs, and artifact expectations before editing. Use `create` when a repo
needs a starter `*.dp.yaml` source from the maintained `architecture`, `flow`,
or `package-map` templates. Use `validate` when you need explicit source repair
output. Use `format` to rewrite a valid DiagramPilot Source File into canonical
YAML before review. `render` requires `--out`, defaults to SVG, and supports
`--format svg|png`; PNG rendering rasterizes the SVG render path. `export`
prints to stdout by default and writes only when `--out` is provided.

## Source And Artifacts

DiagramPilot source files store DiagramSpec as YAML:

- `*.dp.yaml`

Agents should update DiagramPilot source files and regenerate outputs rather
than hand-editing generated artifacts. Rendered SVG artifacts include
deterministic provenance metadata with the source path, source SHA-256 hash,
DiagramPilot version, and renderer version.

`*.dp.json` is not a DiagramPilot Source File path. Repo discovery ignores JSON
source files, explicit commands reject non-YAML source paths generically, and
DiagramPilot does not provide a JSON-to-YAML migration command. JSON remains
supported for `--json` CLI output, the DiagramSpec JSON Schema, SVG provenance
metadata, package manifests, and other tooling surfaces.

`diagrampilot format <path>` parses and validates one `*.dp.yaml` source before
rewriting it in canonical YAML key order. Formatting preserves DiagramSpec data,
unknown metadata, and object/array order. In v0.4.0 it does not promise comment
preservation; YAML comments may be removed or moved during formatting.

## License And Brand

DiagramPilot is available under the [MIT Code License](LICENSE).

The DiagramPilot name, logo, and related brand assets are governed by the
[Brand Use Policy](BRAND_USE_POLICY.md).

Canonical DiagramPilot Brand Assets live in `assets/brand/`:

- [DiagramPilot mark](assets/brand/diagrampilot-mark.svg)
- [DiagramPilot wordmark](assets/brand/diagrampilot-logo.svg)
- [DiagramPilot light wordmark](assets/brand/diagrampilot-logo-light.svg)

## CLI Commands

```bash
diagrampilot init
diagrampilot init --docs
diagrampilot init --config
diagrampilot create docs/architecture.dp.yaml --template architecture
diagrampilot check
diagrampilot inspect
diagrampilot generate
diagrampilot watch docs
diagrampilot mcp
diagrampilot check docs --json
diagrampilot inspect docs --json
diagrampilot validate docs/architecture.dp.yaml
diagrampilot validate docs/architecture.dp.yaml --json
diagrampilot format docs/architecture.dp.yaml
diagrampilot render docs/architecture.dp.yaml --out docs/architecture.svg
diagrampilot render docs/architecture.dp.yaml --format png --out docs/architecture.png
diagrampilot export docs/architecture.dp.yaml --format mermaid
diagrampilot export docs/architecture.dp.yaml --format d2 --out docs/architecture.d2
diagrampilot export docs/architecture.dp.yaml --format dot --out docs/architecture.dot
```

`init` does not create local agent docs or Repo Workflow Configuration by
default. Use `init --docs` only when the repository wants managed `llms.txt`
and `docs/diagrampilot.md` guidance. Use `init --config` to create a minimal
`diagrampilot.config.yaml`; rerunning it fails with repair guidance if the
config already exists.

`create <path> --template architecture|flow|package-map` writes a valid starter
DiagramPilot Source File, refuses to overwrite an existing file, and prints the
next `validate` and SVG `render --out` commands.

`check` discovers DiagramPilot source files in the current directory, one
explicit directory, or one explicit source file. It validates them and checks
expected artifacts without writing files. Without config it checks
next-to-source same-stem Expected SVG Artifacts through DiagramPilot provenance
metadata.

`inspect` discovers DiagramPilot source files and reports title, direction,
Diagram Object counts, Stable IDs by object type, topology roots/depth, and
artifact expectations. `inspect --json` emits the same read-only inventory for
agents, including invalid-source diagnostics and stale or missing artifact
summaries when practical.

Optional `diagrampilot.config.yaml` is discovered upward from the command
scope, validated before source processing, reported in `--json` output, and can
use `sources.ignore` for source discovery plus `artifacts` mappings for
configured SVG, PNG, Mermaid, D2, DOT, and Markdown expectations. Configured
Mermaid, D2, and DOT use content freshness; configured PNG is presence-only in
v0.3.0.

Configured outputs can opt into fixed output profiles with `profile: clean`,
`profile: compact`, or `profile: presentation`. Profiles live only in
`diagrampilot.config.yaml`; DiagramSpec source files should not carry styling
fields, CSS, custom themes, or per-object presentation choices.

Configured Markdown outputs are standalone generated embed files. They link to
configured artifacts in the same mapping with paths relative to the embed file,
and `check` marks an embed stale when the embed or a referenced artifact is
missing, unreadable, unchecked, or not fresh. `diagrampilot generate [path]`
rewrites configured Derived Artifacts and generated Markdown embed files for an
explicit scope.

`diagrampilot watch [path]` runs a local authoring loop for an explicit scope.
It watches `*.dp.yaml` and `diagrampilot.config.yaml`, debounces changes, runs
repo workflow checks first, and generates only when the source/config state is
valid.

`mcp` launches the alpha Model Context Protocol stdio server for local MCP
clients. It exposes read-only DiagramPilot resources, validation, repo check,
export, render, and prompt helpers. See the
[MCP guide](https://diagrampilot.com/docs/agents/mcp.md).

## Public References

- [Public documentation](https://diagrampilot.com/docs/index.md)
- [Installation and removal guide](https://diagrampilot.com/docs/agents/installation.md)
- [Checkout demo quickstart](https://diagrampilot.com/docs/agents/quickstart.md)
- [MCP guide](https://diagrampilot.com/docs/agents/mcp.md)
- [DiagramSpec v1 JSON Schema](https://diagrampilot.com/schema/diagramspec-v1.schema.json)

npm packages:

- [diagrampilot](https://www.npmjs.com/package/diagrampilot)
- [@diagrampilot/core](https://www.npmjs.com/package/@diagrampilot/core)
- [@diagrampilot/icons](https://www.npmjs.com/package/@diagrampilot/icons)
- [@diagrampilot/export-mermaid](https://www.npmjs.com/package/@diagrampilot/export-mermaid)
- [@diagrampilot/export-d2](https://www.npmjs.com/package/@diagrampilot/export-d2)
- [@diagrampilot/export-dot](https://www.npmjs.com/package/@diagrampilot/export-dot)
- [@diagrampilot/mcp](https://www.npmjs.com/package/@diagrampilot/mcp)
- [@diagrampilot/render-svg](https://www.npmjs.com/package/@diagrampilot/render-svg)
