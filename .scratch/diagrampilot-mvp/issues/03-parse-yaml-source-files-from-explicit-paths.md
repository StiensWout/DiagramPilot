Status: completed

# Parse YAML DiagramPilot Source Files from explicit paths

## Parent

- [PRD](../PRD.md)

## What to build

Teach the CLI to load YAML DiagramPilot Source Files from explicit file paths
for validation workflows. This slice should establish the explicit-path
contract and return clean parse failures when YAML syntax is broken.

## Acceptance criteria

- [x] `diagrampilot validate <path>` reads a YAML DiagramPilot Source File from
      an explicit path.
- [x] Broken YAML produces a parse failure without continuing into misleading
      semantic validation.
- [x] CLI tests cover successful YAML parsing and parse-failure behavior.

## Blocked by

- [01 Bootstrap the TypeScript workspace and `diagrampilot` executable](./01-bootstrap-typescript-workspace-and-cli.md)

## Comments

Implemented 2026-06-02:

- Added `diagrampilot validate <path>` for explicit YAML source paths.
- Added core YAML source loading with clean read and parse failure results.
- Parse failures stop before semantic validation and report YAML parse
  diagnostics on stderr.
- Added CLI smoke coverage for successful YAML parsing and broken YAML.

Validation plan:

- Run `npm test`.
- Run `npm run build`.
- Run this self-contained explicit-path success check:

  ```bash
  tmpdir="$(mktemp -d)"
  mkdir -p "$tmpdir/docs"
  printf 'version: 1\ntitle: Checkout Architecture\nnodes:\n  - id: web_app\n    label: Web App\n' > "$tmpdir/docs/architecture.dp.yaml"
  (cd "$tmpdir" && node /home/t3code/projects/DiagramPilot/packages/cli/dist/index.js validate docs/architecture.dp.yaml)
  ```

- Run this self-contained parse-failure check:

  ```bash
  tmpdir="$(mktemp -d)"
  mkdir -p "$tmpdir/docs"
  printf 'version: 1\ntitle: Broken Source\nnodes: [\n' > "$tmpdir/docs/broken.dp.yaml"
  (cd "$tmpdir" && node /home/t3code/projects/DiagramPilot/packages/cli/dist/index.js validate docs/broken.dp.yaml)
  ```

  Confirm it exits nonzero, prints a `YAML parse error` message to stderr, and
  prints nothing to stdout.

Maintainer approval 2026-06-02:

The implementation was approved after validation. Status remains `completed`.
