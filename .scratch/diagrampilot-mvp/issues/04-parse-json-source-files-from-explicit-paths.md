Status: completed

# Parse JSON DiagramPilot Source Files from explicit paths

## Parent

- [PRD](../PRD.md)

## What to build

Teach the CLI to load JSON DiagramPilot Source Files from explicit file paths
for validation workflows. This should mirror the YAML path-based behavior while
keeping JSON parse failures isolated from semantic validation.

## Acceptance criteria

- [x] `diagrampilot validate <path>` reads a JSON DiagramPilot Source File from
      an explicit path.
- [x] Broken JSON produces a parse failure without continuing into misleading
      semantic validation.
- [x] CLI tests cover successful JSON parsing and parse-failure behavior.

## Blocked by

- [01 Bootstrap the TypeScript workspace and `diagrampilot` executable](./01-bootstrap-typescript-workspace-and-cli.md)

## Comments

Implemented 2026-06-02:

- Added JSON as a DiagramPilot Source File authoring format in the core loader.
- Dispatches explicit `.json` paths to `JSON.parse`; non-JSON paths keep the
  existing YAML parse behavior.
- Carries parse format through source load failures so the CLI reports
  `JSON parse error` for broken JSON instead of a misleading YAML diagnostic.
- Added CLI smoke coverage for successful explicit JSON validation and broken
  JSON parse failures.

Validation plan:

- Run `npm test`.
- Run `npm run build`.
- Run this self-contained explicit-path success check:

  ```bash
  tmpdir="$(mktemp -d)"
  mkdir -p "$tmpdir/docs"
  printf '{\n  "version": 1,\n  "title": "Checkout Architecture",\n  "nodes": [{"id": "web_app", "label": "Web App"}]\n}\n' > "$tmpdir/docs/architecture.dp.json"
  (cd "$tmpdir" && node /home/t3code/projects/DiagramPilot/packages/cli/dist/index.js validate docs/architecture.dp.json)
  ```

- Run this self-contained parse-failure check:

  ```bash
  tmpdir="$(mktemp -d)"
  mkdir -p "$tmpdir/docs"
  printf '{\n  "version": 1,\n  "title": "Broken Source",\n  "nodes": [\n    { "id": "web_app", "label": "Web App" },\n  ]\n}\n' > "$tmpdir/docs/broken.dp.json"
  (cd "$tmpdir" && node /home/t3code/projects/DiagramPilot/packages/cli/dist/index.js validate docs/broken.dp.json)
  ```

  Confirm it exits nonzero, prints a `JSON parse error` message to stderr, and
  prints nothing to stdout.

Maintainer approval 2026-06-02:

The implementation was approved after validation. Status remains `completed`.
