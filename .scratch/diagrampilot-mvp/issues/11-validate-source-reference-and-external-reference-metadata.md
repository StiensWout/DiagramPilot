Status: completed

# Validate Source Reference and External Reference metadata semantics

## Parent

- [PRD](../PRD.md)

## What to build

Add validation rules for the documented Metadata meanings of Source Reference
and External Reference fields. This slice should make repo-native paths and
external URLs distinct and repairable when used incorrectly.

## Acceptance criteria

- [x] `metadata.source` validates as a local repository path or path-like glob.
- [x] `metadata.external_url` validates as an external URL.
- [x] Tests cover valid Source References, valid External References, and
      clearly invalid values for each field.

## Blocked by

- [10 Preserve open `kind` and unknown `metadata` keys through validation](./10-preserve-open-kind-and-unknown-metadata-keys.md)

## Comments

Implemented 2026-06-02:

- Added validation for well-known `metadata.source` and `metadata.external_url`
  keys on top-level, node, edge, and group metadata.
- `metadata.source` now accepts non-empty repo-relative paths and path-like
  globs while rejecting URL-like and absolute values.
- `metadata.external_url` now accepts external HTTP(S) URLs and rejects local
  Source Reference values.
- Validation keeps unknown metadata keys open and preserved.
- Added CLI coverage for valid Source References, valid External References,
  invalid URL values in `metadata.source`, and invalid local path values in
  `metadata.external_url`.

Validation plan:

- Run `npm test`.
- Run `npm run build`.
- Run this valid metadata reference check:

  ```bash
tmpdir="$(mktemp -d)"
mkdir -p "$tmpdir/docs"
cat > "$tmpdir/docs/metadata-references.dp.yaml" <<'YAML'
version: 1
title: Metadata References Architecture
metadata:
  source: docs/**/*.dp.yaml
  external_url: https://example.com/architecture-notes
nodes:
  - id: api_gateway
    label: API Gateway
    metadata:
      source: packages/core/src/index.ts
      external_url: https://example.com/api-gateway
YAML
(cd "$tmpdir" && node /home/t3code/projects/DiagramPilot/packages/cli/dist/index.js validate docs/metadata-references.dp.yaml)
  ```

  Confirm it exits zero and prints `Valid docs/metadata-references.dp.yaml`.

- Run this invalid Source Reference check:

  ```bash
tmpdir="$(mktemp -d)"
mkdir -p "$tmpdir/docs"
cat > "$tmpdir/docs/bad-source-reference.dp.yaml" <<'YAML'
version: 1
title: Bad Source Reference Architecture
nodes:
  - id: api_gateway
    label: API Gateway
    metadata:
      source: https://example.com/api-gateway
YAML
(cd "$tmpdir" && node /home/t3code/projects/DiagramPilot/packages/cli/dist/index.js validate docs/bad-source-reference.dp.yaml)
  ```

  Confirm it exits nonzero, prints
  `nodes[0].metadata.source must be a local repository path or path-like glob.`
  to stderr, and prints nothing to stdout.

- Run this invalid External Reference check:

  ```bash
tmpdir="$(mktemp -d)"
mkdir -p "$tmpdir/docs"
cat > "$tmpdir/docs/bad-external-reference.dp.yaml" <<'YAML'
version: 1
title: Bad External Reference Architecture
nodes:
  - id: api_gateway
    label: API Gateway
    metadata:
      external_url: src/gateway
YAML
(cd "$tmpdir" && node /home/t3code/projects/DiagramPilot/packages/cli/dist/index.js validate docs/bad-external-reference.dp.yaml)
  ```

  Confirm it exits nonzero, prints
  `nodes[0].metadata.external_url must be an external URL.` to stderr, and
  prints nothing to stdout.

Maintainer approval 2026-06-02:

The implementation change was approved after review. Status remains
`completed`.
