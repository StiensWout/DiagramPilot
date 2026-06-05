Status: completed

# Add Vercel deployment guidance and validation

## Parent

- [PRD](../PRD.md)

## What to build

Document and validate the static Vercel Pro deployment path for the Public
Website. The deployment plan should use `website/` as the Vercel project root
and should not add a parallel backup host in this phase.

## Acceptance criteria

- [x] Deployment guidance identifies Vercel Pro as the only planned host for this phase.
- [x] Deployment guidance sets `website/` as the Vercel project root.
- [x] Deployment guidance uses the Astro framework preset.
- [x] Deployment guidance uses the website build command and static output directory.
- [x] Deployment guidance keeps root product tests separate from Vercel site builds.
- [x] Deployment guidance states that the site is static-only.
- [x] Deployment guidance excludes Vercel Functions, server rendering, databases, object storage, and forms backend.
- [x] Deployment guidance recommends spend-management guardrails appropriate for Vercel Pro.
- [x] Public URLs for landing page, docs, `.md` docs, `llms.txt`, and schema are listed.
- [x] Local validation commands prove the website can build without deployment credentials.

## Blocked by

- [45 Publish docs-public through website routes](./45-publish-docs-public-through-website-routes.md)
- [46 Build no-card public landing page](./46-build-no-card-public-landing-page.md)

## Validation plan

```bash
npm --workspace website run build
npm test
```

## Implementation notes

- Added `docs-public/agents/deployment.md` as the public Vercel deployment
  guide for the static Public Website phase.
- Documented Vercel Pro as the only planned host, with no Cloudflare Pages
  backup path for this phase.
- Recorded Vercel project settings for `website/` as the Root Directory,
  `Astro` as the framework preset, `npm run build` as the website build
  command, and `dist` as the static output directory.
- Added the Root Directory note to keep "Include source files outside of the
  Root Directory" enabled because the website prebuild sync reads canonical
  public docs, `llms.txt`, schema, and demo SVG files from the repository.
- Documented the static-only boundary and explicit exclusions for Vercel
  Functions, server rendering, databases, object storage, forms backend, and
  Cloudflare Pages.
- Added Vercel Pro spend-management guardrails, including spend thresholds,
  notifications, and the pause production deployment action when automatic
  spend protection is required.
- Listed stable public URLs for the landing page, docs index, representative
  HTML and `.md` docs routes, `llms.txt`, and the DiagramSpec v1 JSON Schema.
- Linked the new guide from `llms.txt`, `README.md`, and `AGENTS.md`.
- Added website deployment guidance tests covering the public guide content,
  credential-free validation commands, and generated HTML plus `.md` routes.

## Validation performed

- `node --test test/website-vercel-deployment-guidance.test.mjs` passed.
- `node --test test/docs-public-boundary.test.mjs` passed.
- `npm --workspace website run build` passed.
- `npm --workspace website run test` passed.
- `npm test` passed 118 tests.
