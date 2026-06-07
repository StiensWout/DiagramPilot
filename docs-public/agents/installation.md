# Install And Remove DiagramPilot

Use the package install path for repositories that consume DiagramPilot. Source
checkout setup is contributor workflow, not the public installation path.

Package installation does not create `llms.txt`, `docs/diagrampilot.md`, or
`diagrampilot.config.yaml`. Those files are not required to use DiagramPilot.
Agents can read `https://diagrampilot.com/llms.txt`, the public docs,
repository instructions, or other configured context providers instead.

Normal `diagrampilot init` does not create or update local agent docs or Repo
Workflow Configuration.
`diagrampilot init --docs` creates or updates the managed local agent docs in
`llms.txt` and `docs/diagrampilot.md`.
`diagrampilot init --config` creates a minimal `diagrampilot.config.yaml` and
fails with repair guidance when the config already exists.

Use `diagrampilot init --docs` only when the repository intentionally wants
managed local agent docs checked into the project.
Use `diagrampilot init --config` only when the repository intentionally wants
Repo Workflow Configuration checked into the project.

Do not copy DiagramPilot public docs into a consuming repository as part of
installation. Keep repository docs for project-owned guidance.

## Release Status

DiagramPilot `0.2.0` is the first Public Alpha Release. The install commands
below use the current npm `latest` release unless a consuming repository pins a
specific package version.

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

Do not delete adopted `*.dp.yaml`, SVG, Mermaid, D2, DOT, or PNG artifacts by
default. Once a repository uses those files for its architecture docs, they are
project-owned source and derived artifacts. Legacy `*.dp.json` source files are
not supported by current DiagramPilot commands; convert them to `*.dp.yaml`
instead of deleting project-owned content during package cleanup.
