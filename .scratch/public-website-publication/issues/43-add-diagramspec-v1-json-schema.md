Status: completed

# Add DiagramSpec v1 JSON Schema

## Parent

- [PRD](../PRD.md)

## What to build

Add a generated-but-committed public JSON Schema for DiagramSpec v1. The schema
should be derived from the core DiagramSpec contract where practical and
published as a reviewable artifact, while core validation remains authoritative
for semantic rules.

## Acceptance criteria

- [x] A DiagramSpec v1 JSON Schema is generated and committed under `schema/`.
- [x] The schema filename and public route are stable for DiagramSpec v1.
- [x] The schema captures required top-level `version`, `title`, and `nodes`.
- [x] The schema requires at least one node.
- [x] The schema captures node, edge, group, direction, icon, and metadata source shapes where practical.
- [x] The schema preserves open extension points for `kind` and `metadata`.
- [x] The schema does not claim to replace core semantic validation.
- [x] `llms.txt` links to the published schema route.
- [x] Public docs mention the schema as a helper for tooling, not the source of truth.
- [x] Tests cover important schema shape expectations.
- [x] Tests validate representative fixtures against the schema where practical.

## Blocked by

- [42 Audit and update public and internal docs](./42-audit-and-update-public-internal-docs.md)

## Validation plan

```bash
npm run build && node --test test/*.test.mjs
npm test
```

## Implementation notes

- Added `schema/diagramspec-v1.schema.json` with stable `$id`
  `https://diagrampilot.com/schema/diagramspec-v1.schema.json`.
- Added `createDiagramSpecV1JsonSchema()` in `@diagrampilot/core` and
  `npm run generate:schema` to regenerate the committed schema from core.
- The schema captures top-level required fields, `nodes` `minItems: 1`,
  direction values, node/edge/group shapes, stable ID shape, icon reference
  shape, and well-known metadata references.
- `kind` remains open by using the stable ID shape rather than an enum, and
  `metadata` allows unknown keys while documenting `source` and `external_url`.
- Public docs, README, MCP plan, and `llms.txt` now describe the schema as a
  tooling helper. They keep `diagrampilot validate` and core validation as the
  authoritative semantic validator.
- Added schema tests for stable route shape, generated/committed sync, schema
  object expectations, and representative valid/invalid fixtures.

## Validation results

Passed:

```bash
npm run build && node --test test/*.test.mjs
npm test
```
