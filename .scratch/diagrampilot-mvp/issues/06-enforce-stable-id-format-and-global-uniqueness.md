Status: completed

# Enforce Stable ID format and global uniqueness

## Parent

- [PRD](../PRD.md)

## What to build

Add validation for Stable IDs across nodes, edges, and groups using the
lowercase snake case pattern and one global namespace per DiagramSpec. This
slice should make ID-related repairs predictable for agents and maintainers.

## Acceptance criteria

- [x] Validation rejects IDs that do not match the accepted lowercase snake
      case pattern.
- [x] Validation rejects duplicate IDs across nodes, edges, and groups in one
      DiagramSpec.
- [x] Focused tests cover valid IDs, invalid shapes, and cross-object
      duplicate collisions.

## Blocked by

- [05 Validate required top-level DiagramSpec fields](./05-validate-required-top-level-diagramspec-fields.md)

## Comments

Implemented 2026-06-02:

- Added DiagramSpec validation for stable ID shape using
  `^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$` across `nodes`, `edges`, and `groups`.
- Missing object IDs are rejected through the same stable ID repair path.
- Added one global stable ID namespace across `nodes`, `edges`, and `groups`;
  duplicate diagnostics point to the first occurrence path.
- Added CLI smoke coverage for missing IDs, invalid ID shape, accepted valid IDs
  across object types, and cross-object duplicate collisions.

Validation plan:

- Run `npm test`.
- Run this invalid-shape check:

  ```bash
  tmpdir="$(mktemp -d)"
  mkdir -p "$tmpdir/docs"
  printf 'version: 1\ntitle: Bad ID Architecture\nnodes:\n  - id: API Gateway\n    label: API Gateway\n' > "$tmpdir/docs/bad-id.dp.yaml"
  (cd "$tmpdir" && node /home/t3code/projects/DiagramPilot/packages/cli/dist/index.js validate docs/bad-id.dp.yaml)
  ```

  Confirm it exits nonzero, prints
  `nodes[0].id must match the stable ID pattern.` to stderr, and prints
  nothing to stdout.

- Run this duplicate-ID check:

  ```bash
  tmpdir="$(mktemp -d)"
  mkdir -p "$tmpdir/docs"
  printf 'version: 1\ntitle: Duplicate ID Architecture\nnodes:\n  - id: web_app\n    label: Web App\n  - id: api_gateway\n    label: API Gateway\nedges:\n  - id: api_gateway\n    from: web_app\n    to: api_gateway\ngroups:\n  - id: web_app\n    label: Frontend Group\n    contains:\n      - web_app\n' > "$tmpdir/docs/duplicate-ids.dp.yaml"
  (cd "$tmpdir" && node /home/t3code/projects/DiagramPilot/packages/cli/dist/index.js validate docs/duplicate-ids.dp.yaml)
  ```

  Confirm it exits nonzero, prints duplicate diagnostics for `api_gateway` and
  `web_app` to stderr, and prints nothing to stdout.

Maintainer approval 2026-06-02:

The implementation change was approved after review. Status remains
`completed`.
