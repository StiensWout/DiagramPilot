Status: ready-for-agent

# Public Website Publication

## Problem Statement

DiagramPilot has a local-first compiler workflow, a read-only Repo Workflow
Check, a Checkout Demo Project, and Public Documentation, but the public
surface is not yet a deployable website. Public URLs already point to
`https://diagrampilot.com`, `llms.txt` describes hosted documentation and a
planned schema, and the Public Documentation assumes users can reach stable
public docs. That creates a gap between the product contract and the shipped
web presence.

There is also documentation drift risk. Repo Workflow Check and its deepening
work are implemented, but some internal planning docs still describe that area
as active backlog. The Public Documentation needs an audit before it becomes
the source for a real Public Website.

## Solution

Publish a static Public Website for DiagramPilot under `diagrampilot.com`.

The Public Website should keep Public Documentation authored in Markdown under
`docs-public/` and keep Internal Documentation, ADRs, and agent-skill setup
under `docs/`. A new top-level `website/` project should publish the public
docs under clean hosted `/docs/...` routes without moving or duplicating the
source of truth.

The first Public Landing Page should be a concise product entry page built
around the Checkout Demo Project and the current CLI workflow. It should use
the real checkout SVG artifact as the primary visual and must avoid any
card-based visual language. The website should be static-only and deployed to
Vercel Pro using the `website/` project root.

The phase should also add a reviewable DiagramSpec v1 JSON Schema as a
generated-but-committed public artifact.

## User Stories

1. As a developer discovering DiagramPilot, I want a public landing page, so that I can understand what the product is before reading reference docs.
2. As an AI coding agent using DiagramPilot, I want `https://diagrampilot.com/llms.txt` to remain a stable public entrypoint, so that I can find the right docs quickly.
3. As an AI coding agent using DiagramPilot, I want public docs to stay Markdown-first, so that I can read and edit source docs directly in the repository.
4. As an AI coding agent using DiagramPilot, I want `.md` public doc URLs to keep working, so that agent-facing links remain useful.
5. As a human reader, I want extensionless HTML docs routes to be canonical, so that the website feels like normal documentation.
6. As a developer using DiagramPilot, I want the public site to show the Checkout Demo Project, so that the first workflow is concrete.
7. As a developer using DiagramPilot, I want the landing page to show real rendered output, so that I can see the product's current artifact shape.
8. As a developer using DiagramPilot, I want the landing page to show `check`, `validate`, `render`, and `export`, so that I understand the CLI workflow.
9. As a maintainer, I want Public Documentation to remain under `docs-public/`, so that existing ADR and skill setup boundaries do not break.
10. As a maintainer, I want Internal Documentation to remain under `docs/`, so that ADRs, issue-tracker guidance, triage vocabulary, and domain-doc guidance stay discoverable by engineering skills.
11. As a maintainer, I want the Public Website to map `docs-public/` to hosted `/docs/...` URLs, so that public URLs stay clean without changing repository boundaries.
12. As a maintainer, I want stale roadmap and architecture claims corrected before publication, so that the website does not publish outdated product state.
13. As a maintainer, I want `README.md`, `AGENTS.md`, `llms.txt`, Public Documentation, Internal Documentation, and demo docs audited together, so that navigation stays coherent.
14. As a maintainer, I want docs tests updated around the active public/internal boundary, so that future agents do not accidentally expose internal docs.
15. As a maintainer, I want a static-only website, so that hosting stays simple and predictable on Vercel Pro.
16. As a maintainer, I want Vercel Pro to be the only planned host for this phase, so that implementation does not spend time on backup deployment paths.
17. As a maintainer, I want no Pages Functions, Vercel Functions, server rendering, database, object storage, forms backend, or hosted workspace dependency, so that the public site remains static.
18. As a maintainer, I want `website/` outside `packages/`, so that the website does not look like a compiler package.
19. As a maintainer, I want `website/` in npm workspaces but outside root TypeScript project references, so that installs and scripts work without changing the compiler build.
20. As a maintainer, I want Astro and Starlight for the website, so that landing and docs pages are static and documentation-oriented.
21. As a maintainer, I want a simple build-time docs sync, so that `docs-public/` remains canonical while Starlight receives files in its expected content shape.
22. As a maintainer, I want generated Starlight content ignored by Git, so that copied docs do not drift from source docs.
23. As a maintainer, I want the landing page to avoid cards entirely, so that the site has a restrained product identity from the first release.
24. As a maintainer, I want code blocks, tables, navigation, search, and sidebars still allowed, so that the no-card rule does not fight normal documentation UI.
25. As a maintainer, I want a no-card verification check, so that future website changes do not reintroduce card-based layouts.
26. As a maintainer, I want desktop and mobile website checks, so that text, visuals, and controls do not overlap.
27. As a developer using DiagramPilot, I want a public DiagramSpec v1 JSON Schema, so that tools can understand the basic source shape.
28. As an AI coding agent using DiagramPilot, I want the schema linked from `llms.txt`, so that I can discover it from the public entrypoint.
29. As a maintainer, I want the schema generated from the core DiagramSpec contract, so that it does not become hand-written website content.
30. As a maintainer, I want the generated schema committed, so that public contract changes are reviewable.
31. As a maintainer, I want tests around the schema, so that required fields, open metadata, and fixture compatibility do not drift silently.
## Implementation Decisions

- Public Website, Public Landing Page, and Markdown-First Public Documentation are settled domain terms in `CONTEXT.md`.
- Public Documentation remains under `docs-public/`.
- Internal Documentation remains under `docs/`.
- ADR 0006 remains active: repository public-doc paths intentionally do not mirror hosted `/docs/...` URLs.
- Public docs remain Markdown-first.
- Extensionless HTML documentation routes are canonical for humans.
- `.md` documentation routes remain available for agents and existing `llms.txt` consumers.
- The Public Website will use a top-level `website/` directory.
- `website/` will be an npm workspace.
- `website/` will not be added to root TypeScript project references.
- The website will use Astro and Starlight.
- The website will be static-only.
- The first deployment target is Vercel Pro.
- There is no Cloudflare Pages backup path in this phase.
- Vercel should use `website/` as the project root.
- The Vercel build should build the website only, not run the whole workspace test suite.
- Repository validation should separately cover root product tests and website build.
- Public Documentation should be synced into Starlight at build time rather than moved into the website project.
- Generated synced docs should not be committed.
- `llms.txt` should be published at the site root.
- Public docs should be published under `/docs/...`.
- Public `.md` routes should remain available.
- The first Public Landing Page should be built around DiagramPilot, the Checkout Demo Project, and current CLI workflow.
- The landing page should show the real checkout SVG artifact as a primary visual.
- The website must avoid any card-based visual language.
- Normal documentation primitives such as code blocks, tables, sidebars, navigation, and search remain allowed.
- The DiagramSpec v1 JSON Schema is a public generated artifact derived from the core DiagramSpec contract.
- The generated schema should be committed under `schema/diagramspec-v1.schema.json`.
- The website should serve the schema at `/schema/diagramspec-v1.schema.json`.
- The schema should not replace core validation or promise that every semantic rule is expressible in JSON Schema.

## Testing Decisions

- Tests should preserve the public/internal documentation boundary and update prior docs-boundary coverage to match the active ADR 0006 decision.
- Documentation audit tests should check README, `llms.txt`, AGENTS guidance, Public Documentation, Internal Documentation, and demo docs for current command and route claims.
- Website build tests should run at the website seam, not through root TypeScript project references.
- Root product tests should remain separate from website deployment builds.
- The highest website confidence seam should be a real static site build.
- Landing page visual checks should include desktop and mobile screenshots.
- No-card verification should reject obvious custom card class names and layout patterns in website-owned code.
- Starlight's built-in navigation, search, sidebar, code blocks, and tables do not violate the no-card rule.
- Schema tests should verify required DiagramSpec fields, supported source shape, open metadata extension points, and compatibility with the Checkout Demo Project source.
- Existing CLI smoke, docs boundary, checkout demo, validation, render provenance, and repo workflow tests remain prior art for product behavior.
- Vercel deployment guidance should be validated through documented settings and local static build commands, not by requiring deployment credentials in tests.

## Out of Scope

- Hosted diagram workspace.
- Prompt-only diagram generation surface.
- Visual canvas or drag-and-drop editor.
- User accounts, login, billing, or hosted project storage.
- Vercel Functions, server rendering, databases, object storage, or forms backend.
- Cloudflare Pages backup deployment.
- Next.js application shell.
- Moving Public Documentation out of `docs-public/`.
- Moving Internal Documentation, ADRs, or agent-skill config out of `docs/`.
- Replacing ADR 0006.
- Replacing core validation with JSON Schema validation.
- Adding DOT export.
- Adding PNG rendering.
- Adding project analyzers.

## Issue Slices

- [42 Audit and update public and internal docs](./issues/42-audit-and-update-public-internal-docs.md)
- [43 Add DiagramSpec v1 JSON Schema](./issues/43-add-diagramspec-v1-json-schema.md)
- [44 Scaffold static Astro Starlight website](./issues/44-scaffold-static-astro-starlight-website.md)
- [45 Publish docs-public through website routes](./issues/45-publish-docs-public-through-website-routes.md)
- [46 Build no-card public landing page](./issues/46-build-no-card-public-landing-page.md)
- [47 Add Vercel deployment guidance and validation](./issues/47-add-vercel-deployment-guidance-and-validation.md)

## Further Notes

This phase came out of a scope grilling session. Key corrections from that
session:

- Public Website and Public Landing Page were added to the glossary.
- Markdown-First Public Documentation was added to the glossary.
- The team initially considered moving Public Documentation to `docs/`, then
  rejected that because it would collide with existing engineering-skill and
  ADR assumptions around `docs/agents/` and `docs/adr/`.
- ADR 0006 remains the active public/internal docs split decision.
- Vercel Pro is the primary host because the user already has a Pro account.
- The site must avoid cards entirely in custom website design.

Full phase validation should end with:

```bash
npm test
npm --workspace website run build
```
