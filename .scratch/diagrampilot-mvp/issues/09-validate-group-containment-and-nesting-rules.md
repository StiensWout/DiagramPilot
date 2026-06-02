Status: completed

# Validate Group containment and nesting rules

## Parent

- [PRD](../PRD.md)

## What to build

Implement Group validation so DiagramSpec supports nested organization without
becoming impossible to render. This slice should allow valid containment while
rejecting group cycles and duplicate containment.

## Acceptance criteria

- [x] Groups can contain Nodes and other Groups according to the DiagramSpec
      contract.
- [x] Validation rejects group cycles and duplicate containment of the same
      object.
- [x] Tests cover valid nesting, containment cycles, and duplicate parentage.

## Blocked by

- [05 Validate required top-level DiagramSpec fields](./05-validate-required-top-level-diagramspec-fields.md)
- [06 Enforce Stable ID format and global uniqueness](./06-enforce-stable-id-format-and-global-uniqueness.md)
- [07 Validate node and group label requirements](./07-validate-node-and-group-label-requirements.md)

## Comments

Implemented 2026-06-02:

- Added DiagramSpec validation for Group `contains` shape: it is required and
  must be an array of Node or Group IDs.
- Added containment reference validation so Groups may contain existing Nodes
  and Groups, while Edge IDs and unknown IDs are rejected with repairable
  diagnostics.
- Added duplicate parentage validation so each contained Node or Group has at
  most one parent Group.
- Added Group containment cycle validation with a diagnostic that identifies the
  `contains[]` entry that closes the cycle.
- Added CLI smoke coverage for invalid containment references, missing and
  non-array `contains`, valid nested Groups, containment cycles, and duplicate
  parentage.

Validation plan:

- Run `npm test`.
- Run `git diff --check`.
- Run this valid nested Group check:

  ```bash
  tmpdir="$(mktemp -d)"
  mkdir -p "$tmpdir/docs"
  printf 'version: 1\ntitle: Nested Group Architecture\nnodes:\n  - id: web_app\n    label: Web App\n  - id: api_gateway\n    label: API Gateway\n  - id: worker\n    label: Worker\n  - id: jobs_queue\n    label: Jobs Queue\ngroups:\n  - id: services\n    label: Services\n    contains:\n      - api_gateway\n      - worker\n  - id: backend\n    label: Backend\n    contains:\n      - services\n      - jobs_queue\n' > "$tmpdir/docs/nested-groups.dp.yaml"
  (cd "$tmpdir" && node /home/t3code/projects/DiagramPilot/packages/cli/dist/index.js validate docs/nested-groups.dp.yaml)
  ```

  Confirm it exits zero, prints `Valid docs/nested-groups.dp.yaml` to stdout,
  and prints nothing to stderr.

- Run this Group cycle check:

  ```bash
  tmpdir="$(mktemp -d)"
  mkdir -p "$tmpdir/docs"
  printf 'version: 1\ntitle: Group Cycle Architecture\nnodes:\n  - id: api_gateway\n    label: API Gateway\ngroups:\n  - id: backend\n    label: Backend\n    contains:\n      - services\n  - id: services\n    label: Services\n    contains:\n      - backend\n      - api_gateway\n' > "$tmpdir/docs/group-cycle.dp.yaml"
  (cd "$tmpdir" && node /home/t3code/projects/DiagramPilot/packages/cli/dist/index.js validate docs/group-cycle.dp.yaml)
  ```

  Confirm it exits nonzero, prints
  `groups[1].contains[0] creates a group containment cycle` to stderr, and
  prints nothing to stdout.

- Run this duplicate parentage check:

  ```bash
  tmpdir="$(mktemp -d)"
  mkdir -p "$tmpdir/docs"
  printf 'version: 1\ntitle: Duplicate Group Parentage Architecture\nnodes:\n  - id: api_gateway\n    label: API Gateway\n  - id: orders_db\n    label: Orders DB\ngroups:\n  - id: services\n    label: Services\n    contains:\n      - api_gateway\n  - id: data\n    label: Data\n    contains:\n      - orders_db\n  - id: backend\n    label: Backend\n    contains:\n      - services\n      - orders_db\n  - id: platform\n    label: Platform\n    contains:\n      - services\n' > "$tmpdir/docs/duplicate-group-parentage.dp.yaml"
  (cd "$tmpdir" && node /home/t3code/projects/DiagramPilot/packages/cli/dist/index.js validate docs/duplicate-group-parentage.dp.yaml)
  ```

  Confirm it exits nonzero, prints duplicate parent diagnostics for `orders_db`
  and `services` to stderr, and prints nothing to stdout.

Maintainer approval 2026-06-02:

The implementation change was approved after review. Status remains
`completed`.
