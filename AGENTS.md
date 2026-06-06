# DiagramPilot Agent Guide

DiagramPilot is a repo-native diagram compiler for software repositories. Favor
local files, review-stable rendering, readable specs, and repairable errors.

## Developer Rules

- `.scratch/` issue numbers must be globally unique. Before creating or
  renaming issue files, scan `.scratch/**/issues/<NN>-*.md`.
- Create a task branch before implementation edits, e.g.
  `git switch --create issue-17-slug --no-track origin/main`. Do not implement
  on `main` or push implementation commits to `main`/`origin/main`.
- After committing, run `git push -u origin HEAD`. Before a PR, verify current
  branch and upstream are the matching `origin/<task-branch>`. Use PR base
  `main` and current branch as head; never pass `--head main`.
- Prefer small edits. Public docs and URLs use `https://diagrampilot.com`. Do
  not add a hosted-workspace dependency for core workflows.
- Do not hand-edit generated artifacts unless explicitly asked.
- Finish implementation by adding a validation plan and updating the local
  issue status, acceptance criteria, implementation notes, and validation plan.

## Docs

- Public: `LICENSE`, `BRAND_USE_POLICY.md`, `llms.txt`, `docs-public/index.md`,
  `docs-public/agents/quickstart.md`,
  `docs-public/agents/installation.md`, `docs-public/agents/spec.md`,
  `docs-public/agents/error-repair.md`, `docs-public/agents/examples.md`,
  `docs-public/agents/prompting.md`.
- Internal: `CONTEXT.md`, `docs/development/documentation-contract.md`,
  `docs/development/public-website-deployment.md`,
  `docs/development/architecture.md`, `docs/development/roadmap.md`,
  `docs/development/release-version-workflow.md`,
  `docs/agents/issue-tracker.md`, `docs/agents/triage-labels.md`,
  `docs/agents/domain.md`,
  `docs/adr/0006-public-docs-live-under-docs-public.md`,
  `docs/adr/0008-public-alpha-release-and-package-publishing.md`.

## Agent skills

### Issue tracker

Issues and PRDs are tracked as local markdown files under `.scratch/`. See
`docs/agents/issue-tracker.md`.
Issue numbers must not overlap between PRD directories.

### Triage labels

Triage uses the default local status vocabulary. See
`docs/agents/triage-labels.md`.

### Domain docs

This repo uses a single-context domain docs layout. See
`docs/agents/domain.md`.
