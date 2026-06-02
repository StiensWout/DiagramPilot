Status: completed

# Validate basic edge semantics between Nodes

## Parent

- [PRD](../PRD.md)

## What to build

Validate Edge behavior so connections are unambiguous and usable for later
export and render steps. This includes Node-only endpoints, optional labels,
directed-by-default behavior, and an explicit way to represent undirected
edges.

## Acceptance criteria

- [x] Validation rejects edges whose `from` or `to` references are not valid
      Nodes.
- [x] Edge labels are optional, and default directed behavior is enforced
      consistently.
- [x] Tests cover valid directed edges, explicit undirected edges, and broken
      endpoint references.

## Blocked by

- [05 Validate required top-level DiagramSpec fields](./05-validate-required-top-level-diagramspec-fields.md)
- [06 Enforce Stable ID format and global uniqueness](./06-enforce-stable-id-format-and-global-uniqueness.md)

## Comments

Implemented 2026-06-02:

- Added DiagramSpec validation for Edge endpoints so `from` and `to` must
  reference existing Node IDs.
- Group endpoint references are rejected with a specific repairable diagnostic
  because Groups are not valid Edge endpoints.
- Unknown endpoint references are rejected with a repair suggestion to add the
  missing Node or change the endpoint to an existing Node ID.
- Edge labels remain optional, but supplied Edge labels must be plain-text
  strings.
- Edge `directed` remains optional for directed-by-default behavior, and
  supplied values must be boolean so `directed: false` is the explicit
  undirected form.
- Added CLI smoke coverage for broken endpoint references, non-boolean
  `directed`, non-string Edge labels, valid directed edges, and explicit
  undirected edges.

Validation plan:

- Run `npm test`.
- Run `git diff --check`.
- Run this broken-endpoint check:

  ```bash
  tmpdir="$(mktemp -d)"
  mkdir -p "$tmpdir/docs"
  printf 'version: 1\ntitle: Broken Edge Endpoint Architecture\nnodes:\n  - id: web_app\n    label: Web App\n  - id: api_gateway\n    label: API Gateway\nedges:\n  - id: web_app_to_backend_services\n    from: web_app\n    to: backend_services\n  - id: ghost_client_to_api_gateway\n    from: ghost_client\n    to: api_gateway\ngroups:\n  - id: backend_services\n    label: Backend Services\n    contains:\n      - api_gateway\n' > "$tmpdir/docs/broken-edge-endpoints.dp.yaml"
  (cd "$tmpdir" && node /home/t3code/projects/DiagramPilot/packages/cli/dist/index.js validate docs/broken-edge-endpoints.dp.yaml)
  ```

  Confirm it exits nonzero, prints diagnostics for
  `edges[0].to references group "backend_services"` and
  `edges[1].from references unknown node "ghost_client"` to stderr, and prints
  nothing to stdout.

- Run this invalid-directed check:

  ```bash
  tmpdir="$(mktemp -d)"
  mkdir -p "$tmpdir/docs"
  printf 'version: 1\ntitle: Bad Edge Directed Architecture\nnodes:\n  - id: web_app\n    label: Web App\n  - id: api_gateway\n    label: API Gateway\nedges:\n  - id: web_app_to_api_gateway\n    from: web_app\n    to: api_gateway\n    directed: sometimes\n' > "$tmpdir/docs/bad-edge-directed.dp.yaml"
  (cd "$tmpdir" && node /home/t3code/projects/DiagramPilot/packages/cli/dist/index.js validate docs/bad-edge-directed.dp.yaml)
  ```

  Confirm it exits nonzero, prints
  `edges[0].directed must be a boolean when present.` to stderr, and prints
  nothing to stdout.

- Run this valid-edge-semantics check:

  ```bash
  tmpdir="$(mktemp -d)"
  mkdir -p "$tmpdir/docs"
  printf 'version: 1\ntitle: Valid Edge Semantics Architecture\nnodes:\n  - id: web_app\n    label: Web App\n  - id: api_gateway\n    label: API Gateway\n  - id: orders_db\n    label: Orders DB\nedges:\n  - id: web_app_to_api_gateway\n    from: web_app\n    to: api_gateway\n  - id: api_gateway_to_orders_db\n    from: api_gateway\n    to: orders_db\n    directed: true\n  - id: api_gateway_related_to_orders_db\n    from: api_gateway\n    to: orders_db\n    directed: false\n' > "$tmpdir/docs/valid-edge-semantics.dp.yaml"
  (cd "$tmpdir" && node /home/t3code/projects/DiagramPilot/packages/cli/dist/index.js validate docs/valid-edge-semantics.dp.yaml)
  ```

  Confirm it exits zero, prints `Valid docs/valid-edge-semantics.dp.yaml` to
  stdout, and prints nothing to stderr.

Maintainer approval 2026-06-02:

The implementation change was approved after review. Status remains
`completed`.
