Status: completed
Issue Version: 0.2.4

# YAML-only source support

## Parent

- [PRD](../PRD.md)

## What to build

Remove `*.dp.json` as a DiagramPilot Source File format for v0.3.0. YAML stays
the only Authoring Format. JSON remains valid for structured CLI output,
DiagramSpec JSON Schema, SVG provenance metadata, package manifests, and other
tooling surfaces.

When users explicitly pass old JSON source files, commands should fail with a
repairable diagnostic that points them to YAML source files. Do not add a
JSON-to-YAML migration command in this issue.

## User stories covered

- 20-24

## Acceptance criteria

- [x] Source discovery no longer treats `*.dp.json` as DiagramPilot Source
      Files.
- [x] Explicit commands against `*.dp.json` fail with a repairable diagnostic
      instead of treating the file as a valid source.
- [x] The diagnostic clearly says YAML is the supported source format and
      points to `*.dp.yaml`.
- [x] `--json` output remains supported for commands that already expose
      structured JSON.
- [x] DiagramSpec JSON Schema, SVG provenance JSON, package manifests, and
      other non-source JSON surfaces remain supported.
- [x] No JSON-to-YAML migration command is added.
- [x] Public docs and release notes call out JSON source removal.
- [x] Tests cover discovery, explicit JSON source diagnostics, YAML source
      behavior, and preserved non-source JSON surfaces.

## Blocked by

None - can start immediately.

## Validation plan

```bash
npm test
node packages/cli/dist/index.js validate demo-projects/checkout/docs/architecture.dp.yaml
node scripts/check-release-version.mjs
git diff --check
```

## Implementation notes

- Removed `*.dp.json` from recursive DiagramPilot Source File discovery. Directory
  scans now discover `*.dp.yaml` only, while explicit `.dp.json` check scopes
  fail with a YAML-oriented repair hint instead of silently passing.
- Added an `unsupported-source-format` source-loading failure for explicit
  legacy JSON source paths. `validate`, `export`, and `render` now reject
  `*.dp.json` before JSON parsing and point users to `*.dp.yaml`.
- Preserved structured `--json` command output. Added focused command-planning
  coverage for successful YAML validation JSON output and legacy JSON-source
  repair hints in JSON output.
- Preserved non-source JSON surfaces: DiagramSpec JSON Schema tests, SVG
  provenance JSON tests, and package manifest readiness tests continue to pass.
- Did not add a JSON-to-YAML migration command.
- Updated public docs, `README.md`, `llms.txt`, init-generated local guidance,
  maintainer docs, and the v0.3.0 PRD to present YAML-only source support and
  distinguish source removal from JSON tooling compatibility.
- Release-note callout: DiagramPilot `0.2.4` removes `*.dp.json` as a
  DiagramPilot Source File format. Convert legacy JSON sources to `*.dp.yaml`;
  JSON remains supported for CLI `--json` output, DiagramSpec JSON Schema, SVG
  provenance metadata, package manifests, and other tooling surfaces.
- Bumped shared DiagramPilot release metadata to Issue Version `0.2.4` and
  refreshed checkout demo SVG provenance at `0.2.4`.

## Validation results

- `node scripts/bump-release-version.mjs 0.2.4` passed.
- `npm run build` passed.
- `cd demo-projects/checkout && node ../../packages/cli/dist/index.js render docs/architecture.dp.yaml --out docs/architecture.svg`
  passed.
- `cd demo-projects/checkout && node ../../packages/cli/dist/index.js check`
  passed: 1 DiagramPilot Source File fresh.
- `node --test --test-concurrency=1 test/repo-workflow-source-discovery.test.mjs`
  passed: 6 tests.
- `node --test --test-concurrency=1 test/validated-diagramspec-loading.test.mjs`
  passed: 6 tests.
- `node --test --test-concurrency=1 test/cli-smoke.test.mjs`
  passed: 15 tests.
- `node --test --test-concurrency=1 test/cli-command-planning.test.mjs`
  passed: 28 tests.
- `node --test --test-concurrency=1 test/cli-validate-json-output.test.mjs`
  passed: 2 tests.
- `node --test --test-concurrency=1 test/diagramspec-json-schema.test.mjs test/render-svg-provenance.test.mjs test/package-readiness.test.mjs`
  passed: 11 tests.
- `node --test --test-concurrency=1 test/docs-public-boundary.test.mjs`
  passed: 18 tests.
- `node --test --test-concurrency=1 test/cli-command-planning.test.mjs test/cli-validate-json-output.test.mjs test/documentation-contract.test.mjs test/maintainability-file-size-gate.test.mjs`
  passed: 41 tests.
- `npm test` passed: 183 tests.
- `node packages/cli/dist/index.js validate demo-projects/checkout/docs/architecture.dp.yaml`
  passed.
- `node scripts/check-release-version.mjs` passed at `0.2.4`.
- `node scripts/generate-release-notes.mjs --version 0.2.4 --tag v0.2.4`
  passed and generated release notes that call out JSON source removal.
- `git diff --check` passed.

## User-facing docs links

- https://diagrampilot.com/docs/agents/spec.md
- https://diagrampilot.com/docs/agents/quickstart.md
- https://diagrampilot.com/docs/agents/installation.md
- https://diagrampilot.com/llms.txt

## Known limitations

- No JSON-to-YAML migration command was added. Convert legacy source files to
  `*.dp.yaml` manually or with project-owned tooling.

## Follow-up

- None.
