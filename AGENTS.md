# DiagramPilot Agent Guide

DiagramPilot is a repo-native diagram compiler for software repositories. Favor
local files, review-stable rendering, readable specs, and repairable errors.

## Developer Rules

- Linear is the live planning tracker. GitHub Issues are public intake only and
  sync into Linear; do not plan implementation work from GitHub alone.
- Create the Linear-copied branch before implementation edits, e.g.
  `git switch --create feature/dp-17-title --no-track origin/main`. Do not
  implement on `main` or push implementation commits to `main`/`origin/main`.
- After committing, run `git push -u origin HEAD`. Before a PR, verify current
  branch and upstream are the matching `origin/<task-branch>`. Use PR base
  `main` and current branch as head; never pass `--head main`.
- Prefer small edits. Public docs and URLs use `https://diagrampilot.com`. Do
  not add a hosted-workspace dependency for core workflows.
- Do not hand-edit generated artifacts unless explicitly asked.
- Fallow is a required quality gate. Before closeout, run
  `npm run audit:fallow`; for PR-specific review also run
  `npm run audit:fallow:changed`. Fix new findings or add only narrow,
  documented config/baseline entries when a finding is intentional.
- Finish implementation by updating the Linear issue status, implementation
  notes, acceptance criteria, and validation plan.

## Docs

- Public: `LICENSE`, `BRAND_USE_POLICY.md`, `llms.txt`, `docs-public/index.md`,
  `docs-public/agents/quickstart.md`,
  `docs-public/agents/installation.md`, `docs-public/agents/spec.md`,
  `docs-public/agents/error-repair.md`, `docs-public/agents/examples.md`,
  `docs-public/agents/prompting.md`.
- Private maintainer workflow lives in Linear. Use the active Linear issue and
  the `DP-19 Internal Maintainer Workflow Migration Map` project document for
  tracker rules, triage states, domain context, release workflow, closeout
  notes, and migration state.
