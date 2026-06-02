Status: completed

# Emit structured validation results with `validate --json`

## Parent

- [PRD](../PRD.md)

## What to build

Expose the validation result in a machine-consumable JSON format for agents and
scripts. This should preserve the same repairable error content as text mode
while keeping stdout clean for structured consumers.

## Acceptance criteria

- [x] `diagrampilot validate <path> --json` emits structured validation output
      on stdout.
- [x] JSON output preserves the repairable error fields needed for automated
      repair loops.
- [x] Tests prove JSON mode does not mix human diagnostics into stdout.

## Blocked by

- [12 Emit Repairable Validation Errors in text mode](./12-emit-repairable-validation-errors-in-text-mode.md)

## Comments

Implemented 2026-06-02:

- Added `--json` support to `diagrampilot validate <path>`.
- JSON mode emits a structured validation result to stdout:
  `{ "file": "...", "ok": true|false, "errors": [...] }`.
- Valid sources emit `ok: true` with an empty `errors` array.
- Semantic validation failures emit `ok: false` with the same repairable error
  fields used by text mode: `path`, `message`, optional `badValue`,
  `expected`, and `suggestion`.
- JSON validation mode keeps human-readable validation diagnostics off stdout
  and stderr for semantic validation failures.
- Source load failures in JSON mode are also represented as a structured
  validation result with one repair-oriented error.
- Updated CLI help to document `validate <path> [--json]`.

Validation plan:

- Run the targeted JSON-mode CLI tests:

  ```bash
npm run build
node --test --test-name-pattern "validate --json" test/cli-smoke.test.mjs
  ```

- Run the full workspace suite:

  ```bash
npm test
  ```

- Run this manual JSON-mode diagnostic check:

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
(cd "$tmpdir" && node /home/t3code/projects/DiagramPilot/packages/cli/dist/index.js validate docs/repairable-errors.dp.yaml --json >stdout.json 2>stderr.txt; printf 'exit=%s\n' "$?")
node -e 'const fs=require("fs"); const result=JSON.parse(fs.readFileSync(process.argv[1], "utf8")); console.log(result.ok, result.errors.map((error) => error.path).join(","));' "$tmpdir/stdout.json"
cat "$tmpdir/stderr.txt"
  ```

  Confirm the command exits nonzero, `stdout.json` parses as JSON with
  `ok: false` and error paths `direction`, `edges[0].from`, and
  `edges[0].directed`, and `stderr.txt` is empty.

Maintainer approval 2026-06-02:

The implementation change was approved after manual validation. Status remains
`completed`.
