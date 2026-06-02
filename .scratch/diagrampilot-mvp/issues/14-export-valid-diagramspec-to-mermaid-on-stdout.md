Status: completed

# Export valid DiagramSpec to Mermaid on stdout

## Parent

- [PRD](../PRD.md)

## What to build

Implement Mermaid export for a valid DiagramSpec and print it to stdout by
default. This slice should establish a stable export adapter without rewriting
the DiagramPilot Source File.

## Acceptance criteria

- [x] `diagrampilot export <path> --format mermaid` prints Mermaid text to
      stdout for a valid source file.
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

- Added a Mermaid export adapter in `@diagrampilot/export-mermaid` that emits
  stable `flowchart` text from valid DiagramSpec input.
- Wired `diagrampilot export <path> --format mermaid` through the CLI so it
  loads, validates, and prints Mermaid to stdout by default.
- Kept export read-only for the DiagramPilot Source File.
- Added export smoke coverage for architecture diagrams, nested Groups,
  vertical flow direction, directed and explicit undirected Edges, labeled
  Edges, validation failure, and source preservation.
- Tightened validation for top-level `nodes`, `edges`, and `groups` collection
  shapes so malformed inputs fail with repairable diagnostics instead of a
  runtime stack trace before export.

Validation plan:

- Run `npm test`.
- Run `npm run build`.
- Run `git diff --check`.
- Run this manual Mermaid export check:

  ```bash
  tmpdir="$(mktemp -d)"
  mkdir -p "$tmpdir/docs"
  printf 'version: 1\ntitle: Checkout Architecture\nnodes:\n  - id: web_app\n    label: Web App\n  - id: api_gateway\n    label: API Gateway\nedges:\n  - id: web_app_to_api_gateway\n    from: web_app\n    to: api_gateway\n    label: HTTPS\n' > "$tmpdir/docs/architecture.dp.yaml"
  (cd "$tmpdir" && node /home/t3code/projects/DiagramPilot/packages/cli/dist/index.js export docs/architecture.dp.yaml --format mermaid)
  ```

  Confirm it exits zero, prints Mermaid text beginning with `flowchart LR` to
  stdout, and prints nothing to stderr.

Maintainer approval 2026-06-02:

The implementation change was approved after review. Status remains
`completed`.
