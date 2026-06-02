Status: completed

# Validate required top-level DiagramSpec fields

## Parent

- [PRD](../PRD.md)

## What to build

Implement the first semantic validation layer for DiagramSpec so explicit-path
validation catches missing required top-level fields, invalid top-level
direction, and empty diagrams before render or export can run.

## Acceptance criteria

- [x] Validation requires top-level `version`, `title`, and `nodes`.
- [x] Validation rejects an empty `nodes` collection and invalid top-level
      `direction` values.
- [x] CLI behavior is covered with readable stderr output and nonzero exit
      codes for invalid input.

## Blocked by

- [03 Parse YAML DiagramPilot Source Files from explicit paths](./03-parse-yaml-source-files-from-explicit-paths.md)
- [04 Parse JSON DiagramPilot Source Files from explicit paths](./04-parse-json-source-files-from-explicit-paths.md)

## Comments

Implemented 2026-06-02:

- Added core DiagramSpec validation for required top-level `version`, `title`,
  and `nodes`.
- Rejects `nodes: []` so empty diagrams do not pass validation.
- Rejects top-level `direction` values outside `right`, `left`, `down`, and
  `up`; omitted `direction` remains valid.
- Wired CLI `validate` to run semantic validation after parse/read succeeds.
- Added CLI smoke coverage for missing required fields, empty `nodes`, and
  invalid `direction`, including nonzero exit code, stderr diagnostics, and
  empty stdout.

Validation plan:

- Run `npm test`.
- Run `npm run build`.
- Run this missing-field check:

  ```bash
  tmpdir="$(mktemp -d)"
  mkdir -p "$tmpdir/docs"
  printf 'version: 1\nnodes:\n  - id: web_app\n    label: Web App\n' > "$tmpdir/docs/missing-title.dp.yaml"
  (cd "$tmpdir" && node /home/t3code/projects/DiagramPilot/packages/cli/dist/index.js validate docs/missing-title.dp.yaml)
  ```

  Confirm it exits nonzero, prints `Missing required top-level field: title.`
  to stderr, and prints nothing to stdout.

- Run this empty-diagram check:

  ```bash
  tmpdir="$(mktemp -d)"
  mkdir -p "$tmpdir/docs"
  printf 'version: 1\ntitle: Empty Architecture\nnodes: []\n' > "$tmpdir/docs/empty.dp.yaml"
  (cd "$tmpdir" && node /home/t3code/projects/DiagramPilot/packages/cli/dist/index.js validate docs/empty.dp.yaml)
  ```

  Confirm it exits nonzero, prints `nodes must contain at least one node.` to
  stderr, and prints nothing to stdout.

- Run this invalid-direction check:

  ```bash
  tmpdir="$(mktemp -d)"
  mkdir -p "$tmpdir/docs"
  printf 'version: 1\ntitle: Bad Direction Architecture\ndirection: sideways\nnodes:\n  - id: web_app\n    label: Web App\n' > "$tmpdir/docs/bad-direction.dp.yaml"
  (cd "$tmpdir" && node /home/t3code/projects/DiagramPilot/packages/cli/dist/index.js validate docs/bad-direction.dp.yaml)
  ```

  Confirm it exits nonzero, prints
  `direction must be one of: right, left, down, up.` to stderr, and prints
  nothing to stdout.

Maintainer approval 2026-06-02:

The implementation change was approved after review. Status remains
`completed`.
