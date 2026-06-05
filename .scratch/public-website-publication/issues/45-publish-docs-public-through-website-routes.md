Status: ready-for-agent

# Publish docs-public through website routes

## Parent

- [PRD](../PRD.md)

## What to build

Publish Markdown-First Public Documentation from `docs-public/` through the
static website. The repository source path should remain `docs-public/`, while
hosted URLs use `/docs/...` routes for humans and `.md` routes for agents.

## Acceptance criteria

- [ ] Public Documentation source remains canonical under `docs-public/`.
- [ ] The website build syncs public Markdown into Starlight content without committing copied files.
- [ ] Extensionless HTML documentation pages are available for human readers.
- [ ] `.md` documentation routes remain available for agents and existing public links.
- [ ] `llms.txt` is published at the website root.
- [ ] Public docs are available under `/docs/...` hosted routes.
- [ ] Internal Documentation, ADRs, and agent-skill setup docs are not published as public docs.
- [ ] The schema artifact is served under the public schema route if the schema issue has landed.
- [ ] Tests verify public docs routing and internal docs exclusion.
- [ ] Existing docs-boundary tests continue to pass.

## Blocked by

- [42 Audit and update public and internal docs](./42-audit-and-update-public-internal-docs.md)
- [44 Scaffold static Astro Starlight website](./44-scaffold-static-astro-starlight-website.md)

## Validation plan

```bash
npm --workspace website run build
npm run build && node --test test/docs-public-boundary.test.mjs
npm test
```
