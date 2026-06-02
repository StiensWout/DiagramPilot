Status: completed

# Export valid DiagramSpec to D2 on stdout

## Parent

- [PRD](../PRD.md)

## What to build

Implement D2 export for a valid DiagramSpec and print it to stdout by default.
This slice establishes the export adapter that the SVG render path will build
on later.

## Acceptance criteria

- [x] `diagrampilot export <path> --format d2` prints D2 text to stdout for a
      valid source file.
- [x] Export requires valid input and fails cleanly when validation fails.
- [x] Tests cover representative diagrams and confirm the source file is not
      rewritten.

## Blocked by

- [08 Validate basic edge semantics between Nodes](./08-validate-basic-edge-semantics-between-nodes.md)
- [09 Validate Group containment and nesting rules](./09-validate-group-containment-and-nesting-rules.md)
- [10 Preserve open `kind` and unknown `metadata` keys through validation](./10-preserve-open-kind-and-unknown-metadata-keys.md)
- [11 Validate Source Reference and External Reference metadata semantics](./11-validate-source-reference-and-external-reference-metadata.md)

## Comments

Implemented 2026-06-02:

- Added `exportDiagramSpecToD2` in `@diagrampilot/export-d2`.
- Wired `diagrampilot export <path> --format d2` through the existing CLI
  parse, load, and validation path.
- D2 output includes global `direction`, quoted labels, nested groups, directed
  `->` edges, explicit undirected `--` edges, and fully qualified node paths for
  edges that cross group boundaries.
- Kept D2 file output via `--out` out of this slice; that remains issue 17.
- Added CLI smoke tests for D2 stdout export, nested groups, validation failure,
  and source-file preservation.

Validation plan:

- Run `npm test`.
- Run `git diff --check`.
- Run this manual stdout check:

  ```bash
  tmpdir="$(mktemp -d)"
  mkdir -p "$tmpdir/docs"
  printf 'version: 1\ntitle: Checkout Architecture\nnodes:\n  - id: web_app\n    label: Web App\n  - id: api_gateway\n    label: API Gateway\nedges:\n  - id: web_app_to_api_gateway\n    from: web_app\n    to: api_gateway\n    label: HTTPS\n' > "$tmpdir/docs/architecture.dp.yaml"
  (cd "$tmpdir" && node /home/t3code/projects/DiagramPilot/packages/cli/dist/index.js export docs/architecture.dp.yaml --format d2)
  ```

  Confirm the export command exits zero, prints D2 text beginning with
  `direction: right`, and does not create a generated file next to the source.

Maintainer approval 2026-06-02:

The implementation change was approved after review. Status remains
`completed`.
