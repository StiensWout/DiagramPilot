Status: completed

# Write Mermaid export only when `--out` is provided

## Parent

- [PRD](../PRD.md)

## What to build

Extend Mermaid export with explicit output-file behavior so users can choose
between stdout and file writes. The command must write a Derived Artifact only
when `--out` is supplied.

## Acceptance criteria

- [x] Mermaid export writes a file only when `--out` is provided.
- [x] Without `--out`, Mermaid export remains stdout-only.
- [x] CLI tests cover both stdout and explicit file-output behavior.

## Blocked by

- [14 Export valid DiagramSpec to Mermaid on stdout](./14-export-valid-diagramspec-to-mermaid-on-stdout.md)

## Comments

Implemented 2026-06-02:

- Added `--out <path>` parsing for `diagrampilot export <path> --format mermaid`.
- Kept Mermaid export stdout-only when `--out` is omitted.
- Wrote the Mermaid Derived Artifact to the explicit output path when `--out`
  is provided, with no stdout output for that file-write path.
- Updated CLI help and usage text to show `export <path> --format mermaid
  [--out <path>]`.
- Added CLI smoke coverage for both stdout-only export and explicit file-output
  behavior.

Validation plan:

- Run `npm test`.
- Run `git diff --check`.
- Run this manual explicit-output check:

  ```bash
  tmpdir="$(mktemp -d)"
  mkdir -p "$tmpdir/docs"
  printf 'version: 1\ntitle: Checkout Architecture\nnodes:\n  - id: web_app\n    label: Web App\n  - id: api_gateway\n    label: API Gateway\nedges:\n  - id: web_app_to_api_gateway\n    from: web_app\n    to: api_gateway\n    label: HTTPS\n' > "$tmpdir/docs/architecture.dp.yaml"
  (cd "$tmpdir" && node /home/t3code/projects/DiagramPilot/packages/cli/dist/index.js export docs/architecture.dp.yaml --format mermaid --out docs/architecture.mmd)
  test -s "$tmpdir/docs/architecture.mmd"
  ```

  Confirm the export command exits zero, prints nothing to stdout or stderr,
  and writes Mermaid text beginning with `flowchart LR` to
  `docs/architecture.mmd`.

Maintainer approval 2026-06-02:

The implementation change was approved after review. Status remains
`completed`.
