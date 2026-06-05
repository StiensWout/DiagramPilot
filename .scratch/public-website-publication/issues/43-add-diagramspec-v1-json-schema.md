Status: ready-for-agent

# Add DiagramSpec v1 JSON Schema

## Parent

- [PRD](../PRD.md)

## What to build

Add a generated-but-committed public JSON Schema for DiagramSpec v1. The schema
should be derived from the core DiagramSpec contract where practical and
published as a reviewable artifact, while core validation remains authoritative
for semantic rules.

## Acceptance criteria

- [ ] A DiagramSpec v1 JSON Schema is generated and committed under `schema/`.
- [ ] The schema filename and public route are stable for DiagramSpec v1.
- [ ] The schema captures required top-level `version`, `title`, and `nodes`.
- [ ] The schema requires at least one node.
- [ ] The schema captures node, edge, group, direction, icon, and metadata source shapes where practical.
- [ ] The schema preserves open extension points for `kind` and `metadata`.
- [ ] The schema does not claim to replace core semantic validation.
- [ ] `llms.txt` links to the published schema route.
- [ ] Public docs mention the schema as a helper for tooling, not the source of truth.
- [ ] Tests cover important schema shape expectations.
- [ ] Tests validate representative fixtures against the schema where practical.

## Blocked by

- [42 Audit and update public and internal docs](./42-audit-and-update-public-internal-docs.md)

## Validation plan

```bash
npm run build && node --test test/*.test.mjs
npm test
```
