Status: completed

# Emit Repairable Validation Errors in text mode

## Parent

- [PRD](../PRD.md)

## What to build

Turn semantic validation failures into Repairable Validation Errors that are
useful in terminal workflows. The default text output should make the invalid
spec path, problem, expected shape or value, and suggested repair obvious.

## Acceptance criteria

- [x] Text-mode validation errors include spec path, concise message, expected
      value or shape, and a concrete repair suggestion.
- [x] Validation collects all safely discoverable semantic errors in one run.
- [x] CLI tests prove diagnostics stay on stderr and invalid validation exits
      nonzero.

## Blocked by

- [06 Enforce Stable ID format and global uniqueness](./06-enforce-stable-id-format-and-global-uniqueness.md)
- [07 Validate node and group label requirements](./07-validate-node-and-group-label-requirements.md)
- [08 Validate basic edge semantics between Nodes](./08-validate-basic-edge-semantics-between-nodes.md)
- [09 Validate Group containment and nesting rules](./09-validate-group-containment-and-nesting-rules.md)
- [10 Preserve open `kind` and unknown `metadata` keys through validation](./10-preserve-open-kind-and-unknown-metadata-keys.md)
- [11 Validate Source Reference and External Reference metadata semantics](./11-validate-source-reference-and-external-reference-metadata.md)

## Comments

Implemented 2026-06-02:

- Changed text-mode validation diagnostics to render each structured validation
  error as a repairable block with `Path`, `Problem`, optional `Bad value`,
  `Expected`, and `Suggestion` fields.
- Preserved the existing first-line prefix,
  `DiagramSpec validation error in <path>:`, so older text assertions and
  terminal scanning still work.
- Added CLI smoke coverage for a single invalid DiagramPilot Source File that
  emits multiple safely discoverable semantic errors in one run.
- The new CLI coverage asserts invalid validation exits nonzero, writes
  diagnostics to stderr, and keeps stdout empty.

Validation plan:

- Run the targeted repairable-text CLI test:

  ```bash
npm run build
node --test --test-name-pattern "repairable validation errors" test/cli-smoke.test.mjs
  ```

- Run the full workspace suite:

  ```bash
npm test
  ```

- Run this manual text-mode diagnostic check:

  ```bash
tmpdir="$(mktemp -d)"
mkdir -p "$tmpdir/docs"
cat > "$tmpdir/docs/repairable-errors.dp.yaml" <<'YAML'
version: 1
title: Repairable Error Architecture
direction: sideways
nodes:
  - id: api_gateway
    label: API Gateway
edges:
  - id: ghost_client_to_api_gateway
    from: ghost_client
    to: api_gateway
    directed: sometimes
YAML
(cd "$tmpdir" && node /home/t3code/projects/DiagramPilot/packages/cli/dist/index.js validate docs/repairable-errors.dp.yaml >stdout.txt 2>stderr.txt; printf 'exit=%s\n' "$?")
cat "$tmpdir/stderr.txt"
cat "$tmpdir/stdout.txt"
  ```

  Confirm the command exits nonzero, `stderr.txt` includes `Path: direction`,
  `Path: edges[0].from`, `Path: edges[0].directed`, `Expected:`, and
  `Suggestion:` lines, and `stdout.txt` is empty.

Maintainer approval 2026-06-02:

The implementation change was approved after review. Status remains
`completed`.
