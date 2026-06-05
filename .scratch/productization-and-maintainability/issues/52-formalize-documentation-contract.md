Status: completed

# Formalize the Documentation Contract

## Parent

- [PRD](../PRD.md)

## What to build

Document and test the Documentation Contract: canonical documentation sources,
generated public outputs, website route expectations, schema/demo artifact
routes, and drift checks.

## Acceptance criteria

- [x] The Documentation Contract is documented in internal maintainer docs.
- [x] `docs-public/` is named as the canonical Public Documentation source.
- [x] `CONTEXT.md`, `docs/development/*`, `docs/adr/*`, and `docs/agents/*`
      are named as internal maintainer sources.
- [x] `website/` is documented as a static consumer of canonical docs, not a
      second source of truth.
- [x] Generated synced Starlight content is confirmed ignored and not
      canonical.
- [x] Public route inventory covers landing page, quickstart, docs routes,
      `.md` routes, `llms.txt`, schema route, and demo SVG route.
- [x] Tests verify claimed public routes are served by the website build.
- [x] Tests verify public docs do not publish internal docs.
- [x] Tests verify README, `llms.txt`, Public Documentation, Internal
      Documentation, demo docs, and website routes agree on current commands
      and canonical public links.

## Blocked by

- [48 Current-state public surface and quickstart](./48-current-state-public-surface-and-quickstart.md)

## Implementation notes

- Added `docs/development/documentation-contract.md` as the internal
  maintainer source for canonical documentation sources, generated public
  outputs, route inventory, and drift checks.
- Added `docs-public/index.md` so the claimed `/docs/` route is generated from
  canonical Public Documentation instead of website-owned duplicate content.
- Added `test/documentation-contract.test.mjs` to build the website, parse the
  Documentation Contract route table, verify internal docs stay unpublished,
  verify synced Starlight/public copies stay ignored and untracked, and check
  command/link drift across README, `llms.txt`, Public Documentation,
  Internal Documentation, demo docs, and website route content.
- Updated the checkout demo README to include the current export commands.
- Compactly updated `AGENTS.md` while preserving the `## Agent skills` block.
- Made the website public-docs sync update generated Markdown in place instead
  of removing the whole generated docs tree, and added a concurrent sync
  regression test for the previous `ENOTEMPTY` failure mode.

## Validation plan

```bash
node --test test/docs-public-boundary.test.mjs
npm --workspace website run build
npm test
```

## Validation results

- `node --test test/docs-public-boundary.test.mjs` passed.
- `npm --workspace website run build` passed.
- `npm test` passed with 131 tests.
