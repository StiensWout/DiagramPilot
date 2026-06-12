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

## Private Maintainer Workflow Relocation

The Public Repository Surface should expose usage, package, website, and
contribution paths, not the full Private Maintainer Workflow. Linear is the
canonical home for maintainer planning, issue workflow, release workflow,
domain context, and implementation closeout notes. The Linear project document
`DP-19 Internal Maintainer Workflow Migration Map` records the active map from
repo-visible internal files to Linear documents or deletion.

These current repo paths are transitional maintainer sources while dependent
tooling and docs are moved:

- `.scratch/**`
- `CONTEXT.md`
- `docs/adr/**`
- `docs/agents/**`
- `docs/development/**`

No final deletion should happen until dependent tooling and docs no longer
require the local paths. At minimum, `AGENTS.md`, documentation drift tests,
package readiness checks, website route checks, release-version tooling, and
closeout-history checks must either stop depending on the transitional paths or
encode the relevant behavior directly. Before removing any transitional source,
run `npm test` and `npm run audit:fallow`.

`README.md` and `llms.txt` are public entrypoints. They should summarize and
link the canonical Public Documentation instead of becoming alternate long-form
sources. Package-local README files are also public package documentation for
npm consumers. They must stay aligned with root and website documentation for
the Public Package Set, including CLI, renderer, exporter, and MCP packages.

For the v0.4.0 Alpha Capability Release, public and package docs must describe
the release-aligned behavior: complete JSON Source Removal for DiagramPilot
Source File workflows, `diagrampilot create`, `diagrampilot inspect`,
`diagrampilot format`, `diagrampilot watch`, fixed Output Profiles for
configured outputs, the current Manual Milestone Release workflow, MCP as a
shipped alpha integration, and concise 0.3 -> 0.4 upgrade guidance.

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

## Link Context Rules

Public documentation links are context-dependent. GitHub-rendered docs should
prefer repo-relative links for same-repository content so readers stay in the
reviewable source tree. Root `README.md` links to canonical Public
Documentation with paths such as `docs-public/agents/quickstart.md` and links
the schema helper as `schema/diagramspec-v1.schema.json`.

Website-rendered docs should use hosted public URLs for public documentation
routes. The website sync and Markdown route rendering rewrite same-docs
Markdown links from canonical `docs-public/` paths into URLs such as
`https://diagrampilot.com/docs/agents/quickstart.md`. This lets canonical
Public Documentation stay GitHub-friendly while the published website remains
site-oriented.

Package README files are npm-facing package documentation and should keep
`https://diagrampilot.com/...` links so they work from npm and installed
package views. `llms.txt` is a site-oriented public agent entrypoint and should
also keep hosted `https://diagrampilot.com/...` links.

## Public Route Inventory

The current public website route inventory is:

| Surface | Route |
| --- | --- |
| Landing page | `https://diagrampilot.com/` |
| Public docs index | `https://diagrampilot.com/docs/` |
| Public docs index Markdown | `https://diagrampilot.com/docs/index.md` |
| Checkout quickstart HTML | `https://diagrampilot.com/docs/agents/quickstart/` |
| Checkout quickstart Markdown | `https://diagrampilot.com/docs/agents/quickstart.md` |
| Installation and removal HTML | `https://diagrampilot.com/docs/agents/installation/` |
| Installation and removal Markdown | `https://diagrampilot.com/docs/agents/installation.md` |
| MCP guide HTML | `https://diagrampilot.com/docs/agents/mcp/` |
| MCP guide Markdown | `https://diagrampilot.com/docs/agents/mcp.md` |
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

The Checkout Demo Project may use `demo-projects/checkout` as the sample
`check --json` and `inspect --json` path, but it should describe the same
command behavior.

## Drift Checks

The drift checks should verify these public contract points:

- Claimed public routes are served by `npm --workspace website run build`.
- Public docs do not publish `CONTEXT.md`, `docs/development/*`,
  `docs/adr/*`, or `docs/agents/*`.
- `README.md`, `llms.txt`, Package README files, Public Documentation,
  Internal Documentation, demo docs, and website routes agree on current
  commands and their link-context rules.
- `diagrampilot init` does not create Local Agent Documentation or Repo
  Workflow Configuration by default; `diagrampilot init --docs` is the
  explicit managed-docs path and `diagrampilot init --config` is the explicit
  config creation path.
- `diagrampilot check` remains the read-only repo review/CI command.
- `diagrampilot inspect` remains the read-only source inventory and topology
  command.
- `diagrampilot create` remains the maintained Template-Based Source Creation
  command for starter `*.dp.yaml` sources.
- `diagrampilot format` remains the Source Formatting command and does not
  promise YAML comment preservation in v0.4.0.
- `diagrampilot watch` remains the local Watch Authoring Loop for explicit
  scopes.
- `diagrampilot mcp` launches the alpha MCP stdio server for local MCP
  clients.
- `*.dp.json` is not documented as a current DiagramPilot Source File path;
  public upgrade notes explain complete JSON Source Removal while preserving
  JSON tooling surfaces.
- Configured outputs document fixed Output Profiles as repo workflow output
  settings, not DiagramSpec styling fields.
- `diagrampilot check --json` includes the config path when optional
  `diagrampilot.config.yaml` is discovered.
- `diagrampilot render <path> --out <artifact.svg>` requires `--out` and
  defaults to SVG.
- `diagrampilot render <path> --format svg|png --out <path>` renders SVG
  explicitly or renders PNG by rasterizing the SVG output.
- `diagrampilot export <path> --format mermaid|d2|dot` prints to stdout by
  default and writes only when `--out` is provided.
- Public URLs use `https://diagrampilot.com`.

## Local Validation

```bash
npm --workspace website run build
npm test
```
