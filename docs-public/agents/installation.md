# Install And Remove DiagramPilot

Use the package install path for repositories that consume DiagramPilot. Source
checkout setup is a contributor workflow, not the public installation path.

Package installation does not create `llms.txt`, `docs/diagrampilot.md`, or
`diagrampilot.config.yaml`. Those files are not required to use DiagramPilot.
Agents can read `https://diagrampilot.com/llms.txt`, the public docs,
repository instructions, or configured context providers instead.

Normal `diagrampilot init` does not create or update local agent docs or Repo
Workflow Configuration. `diagrampilot init --docs` creates or updates the managed local agent docs in `llms.txt` and `docs/diagrampilot.md`.
`diagrampilot init --config` creates a minimal `diagrampilot.config.yaml`.

Use `diagrampilot init --docs` only when the repository intentionally wants
managed local agent docs. Use `diagrampilot init --config` only when the repository intentionally wants Repo Workflow Configuration checked into the
project. Do not copy DiagramPilot public docs into a consuming repository as part of installation. Keep repository docs for project-owned guidance.

## Release Status

DiagramPilot v0.3.0 Alpha Capability Release is the current release-aligned public shape.
The install commands below use the current npm `latest` release
unless a consuming repository pins a specific package version.

## 0.2 -> 0.3 Upgrade Guide

Existing v0.2 repositories should review these changes before updating:

- DiagramPilot Source Files are YAML-only. Use `*.dp.yaml`; `*.dp.json` is not
  a DiagramPilot Source File path, repo discovery ignores JSON source files, and
  DiagramPilot does not provide a migration command. JSON remains valid for
  `--json` CLI output, the DiagramSpec JSON Schema, SVG provenance metadata,
  package manifests, and other non-source tooling surfaces.
- DOT export is available with `diagrampilot export --format dot`.
- PNG rendering is available with `diagrampilot render --format png --out
  <artifact.png>` and rasterizes the SVG render path.
- Repo Workflow Configuration is optional. Use `diagrampilot init --config`
  only when the repository wants checked-in `diagrampilot.config.yaml` artifact
  mappings and source ignore rules.
- `diagrampilot generate [path]` rewrites configured Derived Artifacts and
  generated Markdown embed files for explicit scopes.
- Generated Markdown embed files are standalone generated files. DiagramPilot
  does not edit arbitrary prose documents in place.
- MCP is a shipped alpha integration. Use `diagrampilot mcp` or
  `diagrampilot-mcp` for local MCP clients.

## One-Off Use

Run DiagramPilot without adding it to the repository:

```bash
npx diagrampilot check
npx diagrampilot validate docs/architecture.dp.yaml
npx diagrampilot render docs/architecture.dp.yaml --out docs/architecture.svg
npx diagrampilot render docs/architecture.dp.yaml --format png --out docs/architecture.png
```

Verified package-manager equivalents:

```bash
pnpm dlx diagrampilot check
yarn dlx diagrampilot check
bunx diagrampilot check
```

Use one-off commands for quick local checks, demos, or repair loops where the
repository should not gain a package dependency.

## Repository And CI Use

Add DiagramPilot as a dev dependency when the repository should run the same
version in scripts and CI:

```bash
npm install --save-dev diagrampilot
```

Add a script to the consuming repository:

```json
{
  "scripts": {
    "diagrams:check": "diagrampilot check"
  }
}
```

Run it in local review and CI after dependencies are installed:

```bash
npm run diagrams:check
```

Verified package-manager equivalents:

```bash
pnpm add -D diagrampilot
yarn add -D diagrampilot
bun add -D diagrampilot
```

Keep the package manager lockfile committed for repeatable repository
workflows.

## Global Local Use

Install globally only when you want `diagrampilot` available as a local shell
tool across repositories:

```bash
npm install --global diagrampilot
diagrampilot check
```

Prefer a repository dev dependency for CI and other repeatable workflows.

## MCP Client Configuration

MCP support is alpha. DiagramPilot includes a local Model Context Protocol
server for MCP clients that can launch stdio commands.

Use the main CLI command when the client can run project binaries:

```bash
diagrampilot mcp
```

Use the dedicated package executable when an MCP client expects a direct server
command:

```bash
diagrampilot-mcp
```

Example client configuration:

```json
{
  "mcpServers": {
    "diagrampilot": {
      "command": "diagrampilot",
      "args": ["mcp"]
    }
  }
}
```

The MCP server exposes read-only resources, Stable ID suggestions, validation,
repo workflow check, export, render, and prompt helpers. Source Creation writes
one `*.dp.yaml` file from structured input, Source Mutation applies Structured
Diagram Operations using Stable IDs, and repo output generation refreshes
configured Derived Artifacts for explicit scopes.

## Package Removal

Remove a repository dev dependency with npm:

```bash
npm uninstall diagrampilot
```

Verified package-manager equivalents:

```bash
pnpm remove diagrampilot
yarn remove diagrampilot
bun remove diagrampilot
```

Remove a global npm install:

```bash
npm uninstall --global diagrampilot
```

One-off `npx`, `pnpm dlx`, `yarn dlx`, and `bunx` usage does not add a project
dependency to uninstall.

## Repository Cleanup

Package uninstall removes the package dependency. It does not remove repository
content that DiagramPilot created or that the project adopted.

If an earlier `diagrampilot init` run added support sections, remove only the
managed section between these markers from `llms.txt` and
`docs/diagrampilot.md`:

```html
<!-- diagrampilot:init:start -->
<!-- diagrampilot:init:end -->
```

Delete `llms.txt` or `docs/diagrampilot.md` only if DiagramPilot created the
file and it contains no other project content.

Do not delete adopted `*.dp.yaml`, SVG, Mermaid, D2, DOT, PNG, or Markdown
embed artifacts by default. Once a repository uses those files for its
architecture docs, they are project-owned source and derived artifacts.
`*.dp.json` files are not current DiagramPilot Source Files; convert
project-owned diagram content to `*.dp.yaml` instead of deleting it during
package cleanup.
