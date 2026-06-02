Status: completed

# Validate and package Lucide Icon References

## Parent

- [PRD](../PRD.md)

## What to build

Support packaged Lucide Icon References end to end for the MVP. Validation
should distinguish supported `lucide:*` references from unsupported namespaces
and unknown icon names, using locally packaged icon metadata rather than a
hosted dependency.

## Acceptance criteria

- [x] Supported `lucide:*` Icon References validate successfully.
- [x] Unsupported namespaces and unknown icon names fail with repairable
      validation errors.
- [x] Packaged icon metadata is available locally for later export and render
      steps.

## Blocked by

- [10 Preserve open `kind` and unknown `metadata` keys through validation](./10-preserve-open-kind-and-unknown-metadata-keys.md)

## Comments

Implemented 2026-06-02:

- Added `lucide-static` as the local packaged Lucide source for
  `@diagrampilot/icons`.
- Exposed local Lucide catalog helpers for listing icon names, checking a name,
  and retrieving packaged icon node metadata for later export/render use.
- Added core validation for node and group `icon` fields.
- Validation now accepts packaged `lucide:*` references and rejects unsupported
  namespaces plus unknown Lucide icon names with repairable errors.
- Updated agent docs/examples to use packaged Lucide kebab-case icon names such
  as `database-backup`.

Validation plan:

- Run `npm test`.
- Run `npm run build`.
- Run this supported-icon check:

  ```bash
tmpdir="$(mktemp -d)"
mkdir -p "$tmpdir/docs"
cat > "$tmpdir/docs/lucide-icons.dp.yaml" <<'YAML'
version: 1
title: Lucide Icon Architecture
nodes:
  - id: api_gateway
    label: API Gateway
    icon: lucide:server
  - id: orders_db
    label: Orders DB
    icon: lucide:database-backup
groups:
  - id: backend_services
    label: Backend Services
    icon: lucide:blocks
    contains:
      - api_gateway
      - orders_db
YAML
(cd "$tmpdir" && node /home/t3code/projects/DiagramPilot/packages/cli/dist/index.js validate docs/lucide-icons.dp.yaml)
  ```

  Confirm it exits zero and prints `Valid docs/lucide-icons.dp.yaml`.

- Run this unsupported-namespace check:

  ```bash
tmpdir="$(mktemp -d)"
mkdir -p "$tmpdir/docs"
cat > "$tmpdir/docs/unsupported-icon-namespace.dp.yaml" <<'YAML'
version: 1
title: Unsupported Icon Namespace Architecture
nodes:
  - id: queue_worker
    label: Queue Worker
    icon: aws:lambda
YAML
(cd "$tmpdir" && node /home/t3code/projects/DiagramPilot/packages/cli/dist/index.js validate docs/unsupported-icon-namespace.dp.yaml --json)
  ```

  Confirm it exits nonzero and includes
  `nodes[0].icon uses unsupported icon namespace "aws".`.

- Run this unknown-Lucide-icon check:

  ```bash
tmpdir="$(mktemp -d)"
mkdir -p "$tmpdir/docs"
cat > "$tmpdir/docs/unknown-lucide-icon.dp.yaml" <<'YAML'
version: 1
title: Unknown Lucide Icon Architecture
nodes:
  - id: api_gateway
    label: API Gateway
    icon: lucide:not-a-real-icon
YAML
(cd "$tmpdir" && node /home/t3code/projects/DiagramPilot/packages/cli/dist/index.js validate docs/unknown-lucide-icon.dp.yaml --json)
  ```

  Confirm it exits nonzero and includes
  `nodes[0].icon references unknown Lucide icon "not-a-real-icon".`.

Maintainer approval 2026-06-02:

The implementation change was approved after review. Status remains
`completed`.
