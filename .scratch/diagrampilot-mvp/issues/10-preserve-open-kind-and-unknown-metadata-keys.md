Status: completed

# Preserve open `kind` and unknown `metadata` keys through validation

## Parent

- [PRD](../PRD.md)

## What to build

Keep DiagramSpec flexible by validating `kind` as an open semantic tag and by
preserving unknown metadata keys rather than forcing a closed model. This slice
should protect future extensibility without weakening the core validation
contract.

## Acceptance criteria

- [x] Validation accepts unknown but well-formed `kind` values.
- [x] Validation preserves unknown metadata keys instead of stripping or
      rejecting them by default.
- [x] Tests cover pass-through behavior for open semantic tags and metadata
      extensions.

## Blocked by

- [05 Validate required top-level DiagramSpec fields](./05-validate-required-top-level-diagramspec-fields.md)

## Comments

Implemented 2026-06-02:

- Added validation for optional `kind` fields on nodes, edges, and groups.
- Kept `kind` open by validating only the Stable ID shape instead of introducing
  a closed enum of known kinds.
- Added CLI coverage proving unknown well-formed `kind` values pass validation
  and malformed `kind` values produce repairable validation errors.
- Added core validation coverage proving unknown top-level and per-object
  `metadata` keys remain present after loading and validation.

Validation plan:

- Run `npm test`.
- Run `npm run build`.
- Run this open-kind check:

  ```bash
tmpdir="$(mktemp -d)"
mkdir -p "$tmpdir/docs"
cat > "$tmpdir/docs/open-kind.dp.yaml" <<'YAML'
version: 1
title: Open Kind Architecture
nodes:
  - id: api_gateway
    label: API Gateway
    kind: repo_gateway
  - id: orders_service
    label: Orders Service
    kind: domain_service
edges:
  - id: api_gateway_to_orders_service
    from: api_gateway
    to: orders_service
    kind: async_request
YAML
(cd "$tmpdir" && node /home/t3code/projects/DiagramPilot/packages/cli/dist/index.js validate docs/open-kind.dp.yaml)
  ```

  Confirm it exits zero and prints `Valid docs/open-kind.dp.yaml`.

- Run this malformed-kind check:

  ```bash
tmpdir="$(mktemp -d)"
mkdir -p "$tmpdir/docs"
cat > "$tmpdir/docs/bad-kind.dp.yaml" <<'YAML'
version: 1
title: Bad Kind Architecture
nodes:
  - id: api_gateway
    label: API Gateway
    kind: API Gateway
YAML
(cd "$tmpdir" && node /home/t3code/projects/DiagramPilot/packages/cli/dist/index.js validate docs/bad-kind.dp.yaml)
  ```

  Confirm it exits nonzero, prints `nodes[0].kind must match the stable ID
  pattern.` to stderr, and prints nothing to stdout.

Maintainer approval 2026-06-02:

The implementation change was approved after review. Status remains
`completed`.
