Status: ready-for-agent

# Add Vercel deployment guidance and validation

## Parent

- [PRD](../PRD.md)

## What to build

Document and validate the static Vercel Pro deployment path for the Public
Website. The deployment plan should use `website/` as the Vercel project root
and should not add a parallel backup host in this phase.

## Acceptance criteria

- [ ] Deployment guidance identifies Vercel Pro as the only planned host for this phase.
- [ ] Deployment guidance sets `website/` as the Vercel project root.
- [ ] Deployment guidance uses the Astro framework preset.
- [ ] Deployment guidance uses the website build command and static output directory.
- [ ] Deployment guidance keeps root product tests separate from Vercel site builds.
- [ ] Deployment guidance states that the site is static-only.
- [ ] Deployment guidance excludes Vercel Functions, server rendering, databases, object storage, and forms backend.
- [ ] Deployment guidance recommends spend-management guardrails appropriate for Vercel Pro.
- [ ] Public URLs for landing page, docs, `.md` docs, `llms.txt`, and schema are listed.
- [ ] Local validation commands prove the website can build without deployment credentials.

## Blocked by

- [45 Publish docs-public through website routes](./45-publish-docs-public-through-website-routes.md)
- [46 Build no-card public landing page](./46-build-no-card-public-landing-page.md)

## Validation plan

```bash
npm --workspace website run build
npm test
```
