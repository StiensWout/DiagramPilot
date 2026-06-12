# Public Documentation

<span class="brand-wordmark-set" role="img" aria-label="DiagramPilot wordmark">
  <img class="brand-wordmark brand-wordmark-light-surface" src="/brand/diagrampilot-logo.svg" alt="" />
  <img class="brand-wordmark brand-wordmark-dark-surface" src="/brand/diagrampilot-logo-light.svg" alt="" />
</span>

DiagramPilot Public Documentation is for developers and AI coding agents using
DiagramPilot in their own repositories.

DiagramPilot Source Files are YAML-only. The CLI supports local agent authoring
loops with `create`, `inspect`, `format`, `watch`, configured outputs, fixed
Output Profiles, SVG/PNG rendering, Mermaid/D2/DOT export, and an MCP server
for local agent clients.

Start with the Checkout Demo Project quickstart:

- [Checkout demo quickstart](agents/quickstart.md)

Core public references:

- [Agent workflow guide](agents/agent-workflow.md)
- [Installation and removal guide](agents/installation.md)
- [MCP guide](agents/mcp.md)
- [DiagramSpec guide](agents/spec.md)
- [Error repair guide](agents/error-repair.md)
- [Agent examples](agents/examples.md)
- [Agent prompting guide](agents/prompting.md)
- [DiagramSpec v1 JSON Schema](https://diagrampilot.com/schema/diagramspec-v1.schema.json)
- [MIT Code License](https://github.com/StiensWout/DiagramPilot/blob/main/LICENSE)
- [Brand Use Policy](https://github.com/StiensWout/DiagramPilot/blob/main/BRAND_USE_POLICY.md)

Current CLI commands:

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

Use `init --docs` only when a repository intentionally wants managed local
agent docs. Use `init --config` only when a repository intentionally wants
`diagrampilot.config.yaml`. Use `create` to write a starter `*.dp.yaml` source
from the maintained `architecture`, `flow`, or `package-map` templates. Use
`check` as the read-only repo review/CI command. Use `inspect` for read-only
source inventory, topology, Stable IDs, and artifact expectations before
editing. `render` requires `--out`, defaults to SVG, and supports `--format
svg|png`. `export` prints to stdout by default and writes a file only when
`--out` is provided. `format <path>` validates one `*.dp.yaml` source and
rewrites it in canonical YAML key order; YAML comments may be removed
or moved. `watch [path]` watches `*.dp.yaml` and `diagrampilot.config.yaml`,
debounces changes, checks first, and generates only when source/config state is
valid. `mcp` launches the MCP stdio server for local MCP clients.
