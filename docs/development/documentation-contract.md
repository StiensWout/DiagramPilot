# Documentation Contract

The Documentation Contract is the maintained agreement between canonical
documentation sources, generated public outputs, published routes, and drift
checks for DiagramPilot.

## Canonical Sources

`docs-public/` is the canonical Public Documentation source. Public
Documentation is written for developers and AI coding agents using
DiagramPilot in their own repositories.

These files and directories are internal maintainer sources:

- `CONTEXT.md`
- `docs/development/*`
- `docs/adr/*`
- `docs/agents/*`

Internal maintainer sources explain project workflow, implementation plans,
architecture decisions, and development process. They are not Public
Documentation and must not be published through website docs routes.

`README.md` and `llms.txt` are public entrypoints. They should summarize and
link the canonical Public Documentation instead of becoming alternate
long-form sources.

## Website Consumer

`website/` is a static consumer of canonical docs, not a second source of
truth. The website may own route shell content, landing-page copy, navigation,
styles, and static build configuration. It must not replace `docs-public/` as
the canonical Public Documentation source.

The website build syncs canonical public content before Astro renders:

- `docs-public/**/*.md` to `website/src/content/docs/docs/**/*.md`
- `llms.txt` to `website/public/llms.txt`
- `schema/diagramspec-v1.schema.json` to
  `website/public/schema/diagramspec-v1.schema.json`
- `demo-projects/checkout/docs/architecture.svg` to
  `website/public/demo-projects/checkout/docs/architecture.svg`

`website/src/content/docs/docs/` is generated synced Starlight content. It is
ignored by Git and not canonical. Generated website public copies of
`llms.txt`, schema files, and demo artifacts are also ignored and not
canonical.

## Public Route Inventory

The current public website route inventory is:

| Surface | Route |
| --- | --- |
| Landing page | `https://diagrampilot.com/` |
| Public docs index | `https://diagrampilot.com/docs/` |
| Public docs index Markdown | `https://diagrampilot.com/docs/index.md` |
| Checkout quickstart HTML | `https://diagrampilot.com/docs/agents/quickstart/` |
| Checkout quickstart Markdown | `https://diagrampilot.com/docs/agents/quickstart.md` |
| DiagramSpec HTML | `https://diagrampilot.com/docs/agents/spec/` |
| DiagramSpec Markdown | `https://diagrampilot.com/docs/agents/spec.md` |
| Error repair HTML | `https://diagrampilot.com/docs/agents/error-repair/` |
| Error repair Markdown | `https://diagrampilot.com/docs/agents/error-repair.md` |
| Examples HTML | `https://diagrampilot.com/docs/agents/examples/` |
| Examples Markdown | `https://diagrampilot.com/docs/agents/examples.md` |
| Prompting HTML | `https://diagrampilot.com/docs/agents/prompting/` |
| Prompting Markdown | `https://diagrampilot.com/docs/agents/prompting.md` |
| Agent entrypoint | `https://diagrampilot.com/llms.txt` |
| DiagramSpec v1 JSON Schema | `https://diagrampilot.com/schema/diagramspec-v1.schema.json` |
| Checkout demo SVG | `https://diagrampilot.com/demo-projects/checkout/docs/architecture.svg` |

Add or remove route rows when the shipped Public Website changes. Route
changes should be verified by the website build, not only by link text.

## Current CLI Commands

The current implemented CLI shape used by public and internal docs is:

```bash
diagrampilot init
diagrampilot check
diagrampilot check docs --json
diagrampilot validate docs/architecture.dp.yaml
diagrampilot validate docs/architecture.dp.yaml --json
diagrampilot render docs/architecture.dp.yaml --out docs/architecture.svg
diagrampilot export docs/architecture.dp.yaml --format mermaid
diagrampilot export docs/architecture.dp.yaml --format d2 --out docs/architecture.d2
```

The Checkout Demo Project may use `demo-projects/checkout` as the sample
`check --json` path, but it should describe the same command behavior.

## Drift Checks

The drift checks should verify these public contract points:

- Claimed public routes are served by `npm --workspace website run build`.
- Public docs do not publish `CONTEXT.md`, `docs/development/*`,
  `docs/adr/*`, or `docs/agents/*`.
- `README.md`, `llms.txt`, Public Documentation, Internal Documentation, demo
  docs, and website routes agree on current commands and canonical public
  links.
- `diagrampilot check` remains the read-only repo review/CI command.
- `diagrampilot render <path> --out <artifact.svg>` requires `--out`.
- `diagrampilot export <path> --format mermaid|d2` prints to stdout by
  default and writes only when `--out` is provided.
- Public URLs use `https://diagrampilot.com`.

## Local Validation

```bash
npm --workspace website run build
npm test
```
