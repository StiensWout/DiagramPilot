# DiagramPilot Agent Guide

DiagramPilot is a repo-native diagram compiler. Favor local files, review-stable rendering, readable specs, and repairable errors.

## Work Rules

- Plan from Linear. GitHub Issues are public intake only and sync into Linear.
- Before edits, create the Linear branch from `origin/main`, for example `git
  switch --create feature/dp-20-title --no-track origin/main`; never implement
  or push on `main`/`origin/main`.
- After committing, run `git push -u origin HEAD`; open PRs from the current
  branch to `main`, never with `--head main`.
- Keep core workflows local. Public docs and URLs use `https://diagrampilot.com`.
- Do not hand-edit generated artifacts unless explicitly asked.
- Before closeout, run `npm run audit:fallow`; for PR-specific review also run
  `npm run audit:fallow:changed`.
- Update Linear with status, implementation notes, acceptance criteria, and validation plan.

## Context

- Public: `LICENSE`, `BRAND_USE_POLICY.md`, `llms.txt`, `docs-public/index.md`,
  `docs-public/agents/quickstart.md`,
  `docs-public/agents/installation.md`, `docs-public/agents/spec.md`,
  `docs-public/agents/error-repair.md`, `docs-public/agents/examples.md`,
  `docs-public/agents/prompting.md`.
- Private maintainer workflow lives in Linear. Use the active issue and the
  `DP-19 Internal Maintainer Workflow Migration Map` for tracker rules, triage
  states, domain context, release workflow, closeout notes, and migration state.
  Keep skill configuration intact until its replacement is live.
