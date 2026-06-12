# DiagramPilot Agent Guide

DiagramPilot is a repo-native diagram compiler. Favor local files, review-stable rendering, readable specs, and repairable errors.

## Work Rules

- Plan from the active Linear issue. GitHub Issues are public intake only and sync into Linear.
- Before edits, create the Linear branch from `origin/main`, for example `git
  switch --create feature/dp-20-title --no-track origin/main`; never implement
  or push on `main`/`origin/main`.
- After committing, run `git push -u origin HEAD`; open PRs from the current
  branch to `main`, never with `--head main`.
- Keep core workflows local. Public docs and URLs use `https://diagrampilot.com`.
- Do not hand-edit generated artifacts unless explicitly asked.
- Before closeout, run `npm run audit:fallow`; for PR-specific review also run
  `npm run audit:fallow:changed`.
- Fix Fallow findings in code instead of hiding them behind new baselines.
- Update Linear with status, implementation notes, acceptance criteria, and validation plan.

## Public Surface

- Public: `LICENSE`, `BRAND_USE_POLICY.md`, `llms.txt`, `docs-public/index.md`,
  `docs-public/agents/agent-workflow.md`,
  `docs-public/agents/quickstart.md`,
  `docs-public/agents/installation.md`, `docs-public/agents/spec.md`,
  `docs-public/agents/error-repair.md`, `docs-public/agents/examples.md`,
  `docs-public/agents/prompting.md`, `docs-public/agents/comparisons.md`, `docs-public/agents/integrations.md`.
- Private maintainer workflow lives in Linear. Start with the project resource
  `Agent Resource Index` when private context is needed.
