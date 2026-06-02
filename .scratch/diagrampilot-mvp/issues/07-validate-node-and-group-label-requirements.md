Status: completed

# Validate node and group label requirements

## Parent

- [PRD](../PRD.md)

## What to build

Enforce required human-readable labels for Nodes and Groups while preserving
the plain-text label contract. This slice should prove labels remain readable
in source and can include line breaks without relying on renderer-specific
markup.

## Acceptance criteria

- [x] Validation requires `label` on every Node and Group.
- [x] Plain-text labels with line breaks remain valid.
- [x] Tests cover missing labels and valid multiline labels.

## Blocked by

- [05 Validate required top-level DiagramSpec fields](./05-validate-required-top-level-diagramspec-fields.md)

## Comments

Implemented 2026-06-02:

- Added DiagramSpec validation for required plain-text `label` strings on
  Nodes and Groups.
- Missing Node and Group labels are collected in one validation result with
  repairable paths and suggestions.
- Edge labels remain optional.
- Multiline YAML labels remain valid plain-text labels.
- Added CLI smoke coverage for missing Node/Group labels and valid multiline
  Node/Group labels.

Validation plan:

- Run `npm test`.
- Run `git diff --check`.
- Run this missing-label check:

  ```bash
  tmpdir="$(mktemp -d)"
  mkdir -p "$tmpdir/docs"
  printf 'version: 1\ntitle: Missing Labels Architecture\nnodes:\n  - id: web_app\n  - id: api_gateway\n    label: API Gateway\ngroups:\n  - id: backend_services\n    contains:\n      - api_gateway\n' > "$tmpdir/docs/missing-labels.dp.yaml"
  (cd "$tmpdir" && node /home/t3code/projects/DiagramPilot/packages/cli/dist/index.js validate docs/missing-labels.dp.yaml)
  ```

  Confirm it exits nonzero, prints `nodes[0].label is required.` and
  `groups[0].label is required.` to stderr, and prints nothing to stdout.

- Run this multiline-label check:

  ```bash
  tmpdir="$(mktemp -d)"
  mkdir -p "$tmpdir/docs"
  printf 'version: 1\ntitle: Multiline Label Architecture\nnodes:\n  - id: web_app\n    label: |-\n      Public Web\n      App\n  - id: api_gateway\n    label: API Gateway\ngroups:\n  - id: customer_entrypoints\n    label: |-\n      Customer\n      Entrypoints\n    contains:\n      - web_app\n      - api_gateway\n' > "$tmpdir/docs/multiline-labels.dp.yaml"
  (cd "$tmpdir" && node /home/t3code/projects/DiagramPilot/packages/cli/dist/index.js validate docs/multiline-labels.dp.yaml)
  ```

  Confirm it exits zero, prints `Valid docs/multiline-labels.dp.yaml` to
  stdout, and prints nothing to stderr.

Maintainer approval 2026-06-02:

The implementation change was approved after review. Status remains
`completed`.
