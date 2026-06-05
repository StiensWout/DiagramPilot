Status: ready-for-agent

# Formalize the Documentation Contract

## Parent

- [PRD](../PRD.md)

## What to build

Document and test the Documentation Contract: canonical documentation sources,
generated public outputs, website route expectations, schema/demo artifact
routes, and drift checks.

## Acceptance criteria

- [ ] The Documentation Contract is documented in internal maintainer docs.
- [ ] `docs-public/` is named as the canonical Public Documentation source.
- [ ] `CONTEXT.md`, `docs/development/*`, `docs/adr/*`, and `docs/agents/*`
      are named as internal maintainer sources.
- [ ] `website/` is documented as a static consumer of canonical docs, not a
      second source of truth.
- [ ] Generated synced Starlight content is confirmed ignored and not
      canonical.
- [ ] Public route inventory covers landing page, quickstart, docs routes,
      `.md` routes, `llms.txt`, schema route, and demo SVG route.
- [ ] Tests verify claimed public routes are served by the website build.
- [ ] Tests verify public docs do not publish internal docs.
- [ ] Tests verify README, `llms.txt`, Public Documentation, Internal
      Documentation, demo docs, and website routes agree on current commands
      and canonical public links.

## Blocked by

- [48 Current-state public surface and quickstart](./48-current-state-public-surface-and-quickstart.md)

## Validation plan

```bash
npm --workspace website run build
npm test
```
