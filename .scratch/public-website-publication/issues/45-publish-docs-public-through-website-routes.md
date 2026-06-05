Status: completed

# Publish docs-public through website routes

## Parent

- [PRD](../PRD.md)

## What to build

Publish Markdown-First Public Documentation from `docs-public/` through the
static website. The repository source path should remain `docs-public/`, while
hosted URLs use `/docs/...` routes for humans and `.md` routes for agents.

## Acceptance criteria

- [x] Public Documentation source remains canonical under `docs-public/`.
- [x] The website build syncs public Markdown into Starlight content without committing copied files.
- [x] Extensionless HTML documentation pages are available for human readers.
- [x] `.md` documentation routes remain available for agents and existing public links.
- [x] `llms.txt` is published at the website root.
- [x] Public docs are available under `/docs/...` hosted routes.
- [x] Internal Documentation, ADRs, and agent-skill setup docs are not published as public docs.
- [x] The schema artifact is served under the public schema route if the schema issue has landed.
- [x] Tests verify public docs routing and internal docs exclusion.
- [x] Existing docs-boundary tests continue to pass.

## Blocked by

- [42 Audit and update public and internal docs](./42-audit-and-update-public-internal-docs.md)
- [44 Scaffold static Astro Starlight website](./44-scaffold-static-astro-starlight-website.md)

## Validation plan

```bash
npm --workspace website run build
npm run build && node --test test/docs-public-boundary.test.mjs
npm test
```

## Implementation notes

- Added a website prebuild sync that copies canonical `docs-public/**/*.md`
  into ignored Starlight content under `website/src/content/docs/docs/`, adding
  Starlight frontmatter from each page's H1 when needed.
- Added a website predev sync so local `astro dev` startup also begins from the
  current canonical public docs, `llms.txt`, and schema artifact.
- Added a static `/docs/**/*.md` endpoint that serves the original Markdown
  from `docs-public/` for agent-facing routes.
- Copied canonical `llms.txt` and `schema/diagramspec-v1.schema.json` into
  ignored Astro `public/` paths during website sync so the built site publishes
  `/llms.txt` and `/schema/diagramspec-v1.schema.json`.
- Added integration coverage that builds the website, verifies `/docs/...`
  human HTML routes, `.md` agent routes, root/static schema assets, internal doc
  exclusion, and untracked generated copies.

## Validation performed

- `node --test test/website-public-docs-routes.test.mjs test/website-scaffold.test.mjs` passed.
- `npm --workspace website run build` passed.
- `npm run build && node --test test/docs-public-boundary.test.mjs` passed.
- `npm test` passed 112 tests.
