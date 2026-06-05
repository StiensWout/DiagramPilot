# Vercel Deployment

Use this guide to publish the DiagramPilot Public Website for the current
release phase. The site is static-only and deploys from the existing
`website/` Astro workspace.

## Hosting Decision

Vercel Pro is the only planned host for this phase. Do not add a parallel
backup host, and do not add a Cloudflare Pages deployment path in this phase.

This deployment uses Vercel's static Astro path. Astro builds static output by
default, and the DiagramPilot website keeps `output: "static"` in
`website/astro.config.mjs`.

## Vercel Project Settings

Create one Vercel project for the Public Website and connect it to the
DiagramPilot repository.

Use these project settings:

| Setting | Value |
| --- | --- |
| Plan and host | `Vercel Pro` |
| Root Directory | `website/` |
| Framework Preset | `Astro` |
| Build Command | `npm run build` |
| Output Directory | `dist` |

Settings checklist:

- Root Directory: `website/`
- Framework Preset: `Astro`
- Build Command: `npm run build`
- Output Directory: `dist`
- Include source files outside of the Root Directory: enabled

Keep the install command on Vercel's detected npm workspace default unless a
future package-manager change requires an explicit override.

In the Root Directory settings, verify that Vercel can include source files
outside of the Root Directory. The website build syncs canonical content from
`docs-public/`, `llms.txt`, `schema/`, and the checkout demo SVG before Astro
builds the static site.

Root product tests are not part of the Vercel site build. Vercel should build
only the static website workspace. Run root product validation separately in CI
or before deployment review.

## Static-Only Boundary

The Public Website is static-only. It publishes the landing page, documentation
HTML routes, `.md` documentation routes, `llms.txt`, the DiagramSpec JSON
Schema, and static assets from the Astro build output.

These capabilities are not part of this deployment phase:

- Vercel Functions are not used.
- Server rendering is not used.
- Databases are not used.
- Object storage is not used.
- Forms backend is not used.
- Cloudflare Pages is not used.

Do not install `@astrojs/vercel` for this phase. Astro's Vercel adapter is for
on-demand rendering or additional Vercel services; the current site does not
need those capabilities.

## Spend Guardrails

Use Vercel Pro spend controls before assigning production traffic:

- Enable Spend Management for the Vercel team.
- Set a per-cycle spend amount that is appropriate for this static site.
- Keep web and email threshold notifications enabled for owners or billing
  maintainers.
- Enable the pause production deployment action if the team wants spend
  protection to take effect automatically at the spend amount.
- Review project usage after the first production deploy and after the first
  public-docs update.

Spend Management notifications alone do not stop usage. The pause production
deployment action must be enabled when automatic protection is required.

## Public URLs

After production DNS points at the Vercel project, the public surface should be:

| Surface | URL |
| --- | --- |
| Landing page | `https://diagrampilot.com/` |
| Public docs index | `https://diagrampilot.com/docs/` |
| Checkout quickstart HTML | `https://diagrampilot.com/docs/agents/quickstart/` |
| Checkout quickstart Markdown | `https://diagrampilot.com/docs/agents/quickstart.md` |
| DiagramSpec HTML | `https://diagrampilot.com/docs/agents/spec/` |
| DiagramSpec Markdown | `https://diagrampilot.com/docs/agents/spec.md` |
| Deployment guide HTML | `https://diagrampilot.com/docs/agents/deployment/` |
| Deployment guide Markdown | `https://diagrampilot.com/docs/agents/deployment.md` |
| Agent entrypoint | `https://diagrampilot.com/llms.txt` |
| DiagramSpec v1 JSON Schema | `https://diagrampilot.com/schema/diagramspec-v1.schema.json` |

Public documentation remains authored in `docs-public/`. The website publishes
human HTML routes under `/docs/...` and agent Markdown routes under matching
`.md` URLs.

## Local Validation

These checks prove that the website can build locally without deployment
secrets and with no Vercel credentials:

```bash
npm --workspace website run build
npm test
```

`npm --workspace website run build` runs the website prebuild sync and Astro's
static build. `npm test` keeps root product tests separate from the Vercel site
build while still validating the full repository before a deployment review.

Do not require `vercel deploy`, `vercel build`, `vercel pull`, or Vercel
environment credentials for local acceptance testing of this issue.
