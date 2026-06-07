Status: ready-for-agent
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

- [ ] Source discovery no longer treats `*.dp.json` as DiagramPilot Source
      Files.
- [ ] Explicit commands against `*.dp.json` fail with a repairable diagnostic
      instead of treating the file as a valid source.
- [ ] The diagnostic clearly says YAML is the supported source format and
      points to `*.dp.yaml`.
- [ ] `--json` output remains supported for commands that already expose
      structured JSON.
- [ ] DiagramSpec JSON Schema, SVG provenance JSON, package manifests, and
      other non-source JSON surfaces remain supported.
- [ ] No JSON-to-YAML migration command is added.
- [ ] Public docs and release notes call out JSON source removal.
- [ ] Tests cover discovery, explicit JSON source diagnostics, YAML source
      behavior, and preserved non-source JSON surfaces.

## Blocked by

None - can start immediately.

## Validation plan

```bash
npm test
node packages/cli/dist/index.js validate demo-projects/checkout/docs/architecture.dp.yaml
git diff --check
```
