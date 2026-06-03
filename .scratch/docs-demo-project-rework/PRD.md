Status: ready-for-agent

# Public docs and checkout demo project rework

## Problem Statement

DiagramPilot has a working MVP workflow, but the documentation shape no longer
matches the product direction clearly enough. Public docs, internal maintainer
workflow docs, roadmap notes, and agent process docs all live under one `docs`
tree, which makes it harder for AI coding agents and developers using
DiagramPilot to find the public workflow. The public docs also explain the CLI
contract mostly as reference material, but they do not yet offer one excellent
Demo Project that proves the repo-native workflow end to end.

This creates two related problems. First, `llms.txt` risks exposing internal
maintainer docs when it should be a public agent entrypoint. Second, new users
and agents do not have a canonical sample repository fixture that shows how a
DiagramPilot Source File, local source references, validation, rendering, and a
Derived Artifact fit together in a real repo-shaped workflow.

## Solution

Split Public Documentation from Internal Documentation and add a Checkout Demo
Project as the canonical first workflow.

Public Documentation should live in a dedicated public docs root and remain
hosted at clean `https://diagrampilot.com/docs/...` URLs. Internal
Documentation should remain in the maintainer docs tree with ADRs, development
plans, issue-tracker workflow, triage vocabulary, and domain-doc guidance.
`llms.txt` should link only Public Documentation.

The Demo Project should be a checked-in sample repository fixture for a small
checkout system. It should contain repo-shaped source files, one excellent
DiagramPilot Source File, and a rendered SVG Derived Artifact. The public
quickstart should become a "Try DiagramPilot" path around this demo, while the
spec, error repair, examples, prompting, and MCP docs become supporting public
reference material.

## User Stories

1. As an AI coding agent using DiagramPilot, I want `llms.txt` to point only to public usage docs, so that I do not accidentally follow maintainer workflow notes.
2. As an AI coding agent using DiagramPilot, I want a canonical Demo Project, so that I can see the intended workflow in a repo-shaped example.
3. As an AI coding agent using DiagramPilot, I want the Demo Project to contain a valid DiagramPilot Source File, so that I can copy the source style for new diagrams.
4. As an AI coding agent using DiagramPilot, I want the Demo Project to include a rendered SVG Derived Artifact, so that I can see the expected output location and review shape.
5. As an AI coding agent using DiagramPilot, I want demo diagram objects to use Stable IDs, so that the example reinforces update-safe source authoring.
6. As an AI coding agent using DiagramPilot, I want the demo to use `metadata.source` links to local files, so that I understand how diagrams connect to repository content.
7. As an AI coding agent using DiagramPilot, I want the demo diagram to validate with the real CLI, so that the public example is not only illustrative.
8. As an AI coding agent using DiagramPilot, I want the demo SVG to render with the real CLI, so that the rendered artifact is proven by the current implementation.
9. As an AI coding agent using DiagramPilot, I want the public quickstart to start from the Demo Project, so that the first workflow is concrete.
10. As a developer using DiagramPilot, I want Public Documentation separated from Internal Documentation, so that product usage docs are easy to find.
11. As a developer using DiagramPilot, I want public docs URLs to remain under `https://diagrampilot.com/docs/...`, so that the hosted information architecture stays simple.
12. As a developer using DiagramPilot, I want the public docs to distinguish DiagramPilot Source Files from Derived Artifacts, so that I edit the correct file.
13. As a developer using DiagramPilot, I want the public docs to show validation before rendering, so that I follow the safe workflow.
14. As a developer using DiagramPilot, I want the public docs to show `export` stdout behavior separately from file output, so that I avoid unexpected artifacts.
15. As a developer using DiagramPilot, I want the public docs to show how generated SVG provenance works, so that committed artifacts are traceable.
16. As a DiagramPilot maintainer, I want Internal Documentation to remain in the maintainer docs tree, so that ADRs and workflow notes are not mixed with public onboarding.
17. As a DiagramPilot maintainer, I want the docs split recorded in an ADR, so that future maintainers know why repo paths and hosted URLs differ.
18. As a DiagramPilot maintainer, I want the public docs rewrite to remove stale examples, so that docs do not reference non-existent packages or deferred capabilities as current behavior.
19. As a DiagramPilot maintainer, I want tests or validation commands for the Demo Project, so that public docs and demo artifacts do not drift silently.
20. As a DiagramPilot maintainer, I want the existing MVP PRD status reviewed after this rework, so that planning artifacts reflect the current project phase.
21. As a DiagramPilot maintainer, I want README navigation to separate public product docs from internal project docs, so that contributors and users land in the right place.
22. As a DiagramPilot maintainer, I want docs-public content to be written as Agent-First Documentation, so that AI coding agents can execute workflows from explicit files and commands.
23. As a DiagramPilot maintainer, I want internal workflow docs to keep local issue-tracker guidance, so that future implementation agents still follow the `.scratch` process.
24. As a DiagramPilot maintainer, I want the Demo Project to avoid becoming a second runnable product, so that the repo does not inherit unnecessary maintenance burden.
25. As a DiagramPilot maintainer, I want exactly one excellent initial demo diagram, so that the first demo proves the core workflow without becoming a gallery.

## Implementation Decisions

- Public Documentation and Internal Documentation are separate documentation categories.
- Public Documentation is for AI coding agents and developers using DiagramPilot in their own repositories.
- Internal Documentation is for DiagramPilot maintainers and includes workflow notes, ADRs, roadmap material, issue-tracker guidance, triage labels, and domain-doc guidance.
- Public Documentation lives in a dedicated public docs root in the repository.
- Internal Documentation remains in the maintainer docs tree.
- Public URLs continue to use `https://diagrampilot.com/docs/...`.
- The repository path for public docs intentionally does not mirror the hosted public URL path.
- `llms.txt` links only Public Documentation.
- Repository guidance such as `AGENTS.md` remains the entrypoint for Internal Documentation.
- Existing public-facing agent docs should move to the public docs root.
- Existing local issue-tracker, triage-label, and domain-doc guidance should remain internal.
- The Demo Project is a checked-in sample repository fixture, not a hosted demo or docs-only snippet.
- The first Demo Project domain is a small checkout system.
- The Checkout Demo Project contains repo-shaped source files but is not required to be a runnable application.
- The Checkout Demo Project contains one excellent end-to-end architecture DiagramPilot Source File.
- The demo architecture includes a rendered SVG Derived Artifact generated from the source.
- Demo diagram objects should use lowercase snake case Stable IDs.
- Demo diagram objects should include useful `kind`, `icon`, edge labels, groups, and local Source References where they clarify the workflow.
- Generated artifacts remain Derived Artifacts and should not be hand-edited.
- The public quickstart becomes the primary "Try DiagramPilot" workflow around the Checkout Demo Project.
- Public examples remain supporting reference material, not the primary onboarding path.
- Stale example content should be removed or corrected during the docs rewrite.
- The existing docs split decision is recorded in ADR 0006.
- The existing MVP PRD should not be modified by the implementation issues unless a specific issue is assigned to close out planning status.

## Testing Decisions

- Tests and validation should assert external behavior through the CLI whenever possible.
- The Checkout Demo Project should be validated with `diagrampilot validate`.
- The demo SVG should be renderable with `diagrampilot render --out`.
- The rendered demo SVG should remain traceable through deterministic provenance metadata.
- Tests should avoid snapshotting entire generated SVGs unless a focused assertion is enough.
- Tests should verify source files are not rewritten by validate, render, or export.
- Link and navigation checks should focus on public/internal boundary correctness and public URL shape rather than implementation details of hosting.
- Public docs validation can use shell commands when automated link tooling does not exist yet.
- Existing CLI smoke tests are the highest-priority prior art for demo workflow coverage.
- Existing validation tests are prior art for Stable ID, metadata, icon, edge, and group behavior.
- A good acceptance check for this rework validates the demo DiagramPilot Source File, renders its SVG, checks the generated artifact for provenance, and confirms `llms.txt` does not link internal docs.

## Out of Scope

- Building a hosted demo.
- Building a fully runnable checkout application.
- Creating a gallery of multiple demo projects.
- Adding project analyzers.
- Adding MCP implementation.
- Adding DOT export.
- Adding PNG rendering.
- Changing the DiagramSpec v1 contract.
- Changing public URL domain away from `https://diagrampilot.com`.
- Replacing the local markdown issue tracker.
- Publishing or deploying the public website.
- Adding a visual editor or hosted workspace dependency.

## Further Notes

Settled language is captured in `CONTEXT.md`: Demo Project, Agent-First
Documentation, Checkout Demo Project, Public Documentation, and Internal
Documentation. The public/internal documentation path decision is captured in
ADR 0006.

The intended end state is that an AI coding agent can read `llms.txt`, follow
only Public Documentation, inspect the Checkout Demo Project, validate its
DiagramPilot Source File, render its SVG Derived Artifact, and then reproduce
that workflow in another repository.
