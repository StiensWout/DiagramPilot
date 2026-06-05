Status: ready-for-agent

# Productization And Maintainability

## Problem Statement

DiagramPilot has a working local-first compiler workflow, public documentation,
a static Public Website, a public DiagramSpec v1 JSON Schema helper, and a
Checkout Demo Project. The next release should make that shipped surface easier
to understand, trust, maintain, and extend before adding another product
capability.

The public surface still risks reading like implementation planning instead of
current product documentation. Public docs, `README.md`, `llms.txt`, and the
Public Website should describe shipped behaviour only. Deferred work such as
MCP belongs in internal planning docs, not public user guidance.

The current Public Landing Page also needs stronger product storytelling. It
should make the promise clear quickly: diagrams are repository files an AI
coding agent can safely change, validate, and commit. The page can use a
custom or generated visual if that markets the product better, but the actual
workflow and real output must remain visible enough to preserve credibility.

The codebase also needs a stronger maintainability bar before expansion.
`packages/core/src/index.ts` is already larger than the desired file-size
limit, and `packages/cli/src/index.ts` is close to it. This phase should add a
hard file-size gate for authored implementation and test files, then split the
large core and CLI modules along existing product seams.

Finally, documentation sync should become a maintained Documentation Contract
rather than a recurring manual audit. Canonical sources, generated outputs,
published routes, and drift checks should be explicit and testable.

## Solution

Run a Productization And Maintainability release after Public Website
Publication closes.

This phase will:

1. Rework the Current-State Public Surface so public docs, `README.md`,
   `llms.txt`, and website copy only describe shipped DiagramPilot behaviour.
2. Rework the canonical quickstart into a clearer beginner guide while keeping
   one source of truth.
3. Add a hard file-size gate for authored implementation and test files.
4. Split large core and CLI modules under that gate using existing seams.
5. Formalize the Documentation Contract with source ownership, route inventory,
   generated output rules, and drift tests.
6. Redesign the Public Landing Page around product storytelling, using
   `ui-ux-pro-max` guidance for accessibility, layout, motion, typography, and
   responsive quality.
7. Add visual quality checks for the website so desktop and mobile regressions
   are caught before release.

## User Stories

1. As a developer discovering DiagramPilot, I want public docs and website copy
   to describe what I can use today, so that I do not mistake a future plan for
   a shipped feature.
2. As an AI coding agent using DiagramPilot, I want `llms.txt` to link only
   current public instructions and artifacts, so that I follow executable
   workflows.
3. As a new user, I want a quickstart that gets me from repository checkout to
   validate/render/export commands quickly, so that I can understand the core
   workflow without reading planning notes.
4. As a maintainer, I want public future-plan content removed or moved to
   internal docs, so that public routes stay trustworthy.
5. As a visitor, I want the landing page to immediately explain why repo-native
   diagrams matter for AI coding agents, so that the product feels concrete
   and valuable.
6. As a visitor, I want to see the workflow and output, so that the page is not
   just a roadmap or abstract positioning page.
7. As a maintainer, I want limited, intentional card usage allowed, so that the
   website can improve visually without becoming a generic SaaS card grid.
8. As a maintainer, I want authored implementation and test files below 1000
   LOC, so that modules remain reviewable and easy for agents to navigate.
9. As a maintainer, I want large core and CLI modules split along existing
   seams, so that future product capabilities can extend the project without
   deepening monolith files.
10. As a maintainer, I want documentation source ownership and public route
    expectations tested together, so that docs do not drift across `README.md`,
    `llms.txt`, Public Documentation, website routes, schema routes, and demo
    docs.

## Implementation Decisions

- Productization And Maintainability is the next release-readiness phase after
  Public Website Publication.
- This phase does not implement MCP.
- MCP planning may remain in internal roadmap or architecture docs, but not in
  Public Documentation, `README.md`, `llms.txt`, or Public Website copy.
- `docs-public/agents/quickstart.md` remains the canonical quickstart source.
- The website should surface the quickstart as a first-class action without
  creating a second quickstart source of truth.
- The Public Landing Page Promise is: diagrams are repository files an AI
  coding agent can safely change, validate, and commit.
- The landing page can replace the previous absolute no-card rule, but card
  usage must be scarce, intentional, and tested against generic SaaS card-grid
  drift.
- The landing page may use a custom or generated hero visual if it improves
  product marketing, but shipped workflow commands and real output should
  remain visible.
- Use `ui-ux-pro-max` recommendations for the landing page slice:
  product-demo-led storytelling, strong accessibility checks, responsive
  layout checks at mobile/tablet/desktop widths, restrained motion, visible
  focus states, and reduced-motion support.
- The file-size gate is hard by the end of the phase.
- The file-size gate applies to authored implementation and test files:
  `packages/**/*.ts`, `test/**/*.mjs`, `website/src/**/*`, and
  `website/scripts/**/*`.
- The file-size gate excludes generated output, build artifacts, synced
  Starlight content, committed schema artifacts, SVGs, other generated
  artifacts, Markdown docs, PRDs, issue files, lockfiles, and vendored assets.
- New packages should not be introduced just to move code around. Splits should
  follow real seams, reduce duplication, or make behaviour more testable.
- Documentation Contract work should name canonical sources, generated outputs,
  route expectations, and drift tests.

## Testing Decisions

- Public-surface tests should reject public references to unbuilt MCP plans,
  future integrations, and internal design decisions.
- Quickstart tests should verify current commands, expected outputs, source of
  truth language, and links from `README.md`, `llms.txt`, and website CTAs.
- File-size tests should fail when included authored implementation or test
  files exceed 1000 LOC after exclusions are applied.
- Core and CLI refactors should preserve existing behaviour with current unit,
  smoke, docs, website, schema, render, provenance, and repo workflow tests.
- Documentation Contract tests should verify route inventory and ensure website
  generated docs are not treated as canonical source.
- Landing page tests should include content assertions, forbidden public claims,
  desktop/mobile screenshots, accessibility-sensitive checks, and reduced
  motion expectations where practical.
- Visual quality checks should verify no horizontal scroll, no text overlap,
  useful focus states, responsive hero framing, and nonblank rendered visuals.

## Out Of Scope

- MCP implementation.
- Public MCP planning docs.
- Project analyzers.
- Hosted diagram workspace.
- Prompt-only diagram generation.
- Visual editor or drag-and-drop canvas.
- User accounts, login, billing, hosted project storage, or collaboration.
- Replacing core validation with JSON Schema validation.
- DOT export.
- PNG rendering.
- Large package reshuffles that only move files without improving seams.
- Duplicating public docs into website-owned source.

## Issue Slices

- [48 Current-state public surface and quickstart](./issues/48-current-state-public-surface-and-quickstart.md)
- [49 Add maintainability file-size gate definition](./issues/49-add-maintainability-file-size-gate-definition.md)
- [50 Split core under file-size gate and enforce it](./issues/50-split-core-under-file-size-gate-and-enforce-it.md)
- [51 Split CLI under file-size gate](./issues/51-split-cli-under-file-size-gate.md)
- [52 Formalize the Documentation Contract](./issues/52-formalize-documentation-contract.md)
- [53 Redesign public landing page with product storytelling](./issues/53-redesign-public-landing-page-with-product-storytelling.md)
- [54 Add website visual quality checks](./issues/54-add-website-visual-quality-checks.md)

## Validation Plan

```bash
find .scratch -maxdepth 3 -type f | sort
rg -n "Productization And Maintainability|Current-State Public Surface|Documentation Contract|Public Landing Page Promise" CONTEXT.md .scratch/productization-and-maintainability
rg -n "48-current-state-public-surface|54-add-website-visual-quality-checks" .scratch/productization-and-maintainability/PRD.md
```
