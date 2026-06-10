# Public Website Deployment

Use this maintainer guide when publishing the DiagramPilot public website.

The public website is static-only and deploys from the existing `website/`
Astro workspace. Keep `output: "static"` in `website/astro.config.mjs`.
Vercel Functions, server rendering, databases, object storage, forms backend,
and Cloudflare Pages are not part of the public docs site. Do not install
`@astrojs/vercel`; Astro's Vercel adapter is for on-demand rendering or
additional Vercel services that DiagramPilot does not use.

Vercel Pro is the only planned host for `https://diagrampilot.com`. Do not add
a parallel backup host or Cloudflare Pages deployment path for the current
public docs workflow.

Required Vercel project settings:

- Root Directory: `website/`
- Framework Preset: `Astro`
- Build Command: `npm run build`
- Output Directory: `dist`
- Include source files outside of the Root Directory: enabled

Root product tests are not part of the Vercel site build; run them locally and
in repository CI before deployment review.

The website prebuild syncs canonical content from `docs-public/`, `llms.txt`,
`schema/`, and the checkout demo SVG before Astro builds. Public documentation
remains authored in `docs-public/`; synced Starlight files under
`website/src/content/docs/docs/` are generated website inputs, not canonical
sources.

## Spend Guardrails

Use Vercel Pro spend controls for the production project:

- Enable Spend Management for the Vercel team.
- Set a per-cycle spend amount appropriate for the maintainers.
- Keep email threshold notifications enabled for owners and maintainers.
- Enable the pause production deployment action if automatic spend protection
  is required.
- Review project usage after the first production deploy and after public-docs
  updates.

Spend Management notifications alone do not stop usage.

## Public URLs

After production DNS points at the Vercel project, these routes are public:

| Surface | URL |
| --- | --- |
| Landing page | `https://diagrampilot.com/` |
| Public docs index | `https://diagrampilot.com/docs/` |
| Public docs index Markdown | `https://diagrampilot.com/docs/index.md` |
| Checkout quickstart HTML | `https://diagrampilot.com/docs/agents/quickstart/` |
| Checkout quickstart Markdown | `https://diagrampilot.com/docs/agents/quickstart.md` |
| Installation and removal HTML | `https://diagrampilot.com/docs/agents/installation/` |
| Installation and removal Markdown | `https://diagrampilot.com/docs/agents/installation.md` |
| MCP guide HTML | `https://diagrampilot.com/docs/agents/mcp/` |
| MCP guide Markdown | `https://diagrampilot.com/docs/agents/mcp.md` |
| DiagramSpec HTML | `https://diagrampilot.com/docs/agents/spec/` |
| DiagramSpec Markdown | `https://diagrampilot.com/docs/agents/spec.md` |
| Error repair HTML | `https://diagrampilot.com/docs/agents/error-repair/` |
| Error repair Markdown | `https://diagrampilot.com/docs/agents/error-repair.md` |
| Examples HTML | `https://diagrampilot.com/docs/agents/examples/` |
| Examples Markdown | `https://diagrampilot.com/docs/agents/examples.md` |
| Prompting HTML | `https://diagrampilot.com/docs/agents/prompting/` |
| Prompting Markdown | `https://diagrampilot.com/docs/agents/prompting.md` |
| Agent entrypoint | `https://diagrampilot.com/llms.txt` |
| DiagramSpec v1 JSON Schema | `https://diagrampilot.com/schema/diagramspec-v1.schema.json` |
| Checkout demo SVG | `https://diagrampilot.com/demo-projects/checkout/docs/architecture.svg` |

HTML routes under `/docs/...` and matching `.md` routes are both public. Public
URLs use `https://diagrampilot.com`.

## Local Validation

```bash
npm --workspace website run build
npm test
```

`npm --workspace website run build` runs the website prebuild sync and Astro's
static build. `npm test` keeps root product tests separate from the Vercel site
build while still validating the full repository before a deployment review.

Do not require `vercel deploy`, `vercel build`, `vercel pull`, or Vercel
environment credentials for local acceptance testing. Local validation requires
no Vercel credentials.
