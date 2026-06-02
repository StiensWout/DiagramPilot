Status: completed

# Write D2 export only when `--out` is provided

## Parent

- [PRD](../PRD.md)

## What to build

Extend D2 export with explicit output-file behavior so users can choose between
stdout and file writes. The command must write a Derived Artifact only when
`--out` is supplied.

## Acceptance criteria

- [x] D2 export writes a file only when `--out` is provided.
- [x] Without `--out`, D2 export remains stdout-only.
- [x] CLI tests cover both stdout and explicit file-output behavior.

## Blocked by

- [16 Export valid DiagramSpec to D2 on stdout](./16-export-valid-diagramspec-to-d2-on-stdout.md)

## Comments

Implemented 2026-06-02:

- Added `--out <path>` support for `diagrampilot export <path> --format d2`.
- Kept D2 export stdout-only when `--out` is omitted.
- Wrote the D2 Derived Artifact to the explicit output path when `--out` is
  provided, with no stdout output for that file-write path.
- Updated CLI help and usage text to show `export <path> --format d2
  [--out <path>]`.
- Added CLI smoke coverage for explicit D2 file-output behavior; the existing
  D2 stdout test continues to cover the no-`--out` path.

Validation plan:

- Run `npm test`.
- Run `git diff --check`.
- Run this manual explicit-output check:

  ```bash
  tmpdir="$(mktemp -d)"
  mkdir -p "$tmpdir/docs"
  printf 'version: 1\ntitle: Checkout Architecture\nnodes:\n  - id: web_app\n    label: Web App\n  - id: api_gateway\n    label: API Gateway\nedges:\n  - id: web_app_to_api_gateway\n    from: web_app\n    to: api_gateway\n    label: HTTPS\n' > "$tmpdir/docs/architecture.dp.yaml"
  (cd "$tmpdir" && node /home/t3code/projects/DiagramPilot/packages/cli/dist/index.js export docs/architecture.dp.yaml --format d2 --out docs/architecture.d2)
  test -s "$tmpdir/docs/architecture.d2"
  ```

  Confirm the export command exits zero, prints nothing to stdout or stderr,
  and writes D2 text beginning with `direction: right` to
  `docs/architecture.d2`.

Maintainer approval 2026-06-02:

The implementation change was approved after review. Status remains
`completed`.
