# Install And Remove DiagramPilot

Use the package install path for repositories that consume DiagramPilot. Source
checkout setup is contributor workflow, not the public installation path.

## One-Off Use

Run DiagramPilot without adding it to the repository:

```bash
npx diagrampilot check
npx diagrampilot validate docs/architecture.dp.yaml
npx diagrampilot render docs/architecture.dp.yaml --out docs/architecture.svg
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

If `diagrampilot init` added support sections, remove only the managed section
between these markers from `llms.txt` and `docs/diagrampilot.md`:

```html
<!-- diagrampilot:init:start -->
<!-- diagrampilot:init:end -->
```

Delete `llms.txt` or `docs/diagrampilot.md` only if DiagramPilot created the
file and it contains no other project content.

Do not delete adopted `*.dp.yaml`, `*.dp.json`, SVG, Mermaid, D2, DOT, or PNG
artifacts by default. Once a repository uses those files for its architecture
docs, they are project-owned source and derived artifacts.
