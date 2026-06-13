# DiagramPilot Agent Guide

DiagramPilot is a repo-native diagram compiler. Favor local files, stable renders, readable specs, and repairable errors.

## Work Rules

- Plan from active Linear issue. GitHub Issues are public intake only.
- Before edits, create the Linear branch from `origin/nightly`, for example `git switch --create feature/dp-20-title --no-track origin/nightly`; never implement or push on `nightly`/`origin/nightly`.
- After committing, run `git push -u origin HEAD`; open implementation PRs from the current branch to `nightly`, never with `--head nightly`.
- Production promotion is a PR from `nightly` to `main`; `main` remains Production and there is no `production` branch.
- Keep workflows local. Public docs/URLs use `https://diagrampilot.com`.
- Do not hand-edit generated artifacts unless asked.
- Before closeout, run `npm run audit:fallow`; for PR-specific review also run `npm run audit:fallow:changed`.
- Fix Fallow findings in code instead of hiding them behind new baselines.
- Update Linear with status, notes, acceptance criteria, and validation plan.

## Public Surface

- Public: `LICENSE`, `BRAND_USE_POLICY.md`, `llms.txt`, `docs-public/index.md`,
  `docs-public/agents/agent-workflow.md`,
  `docs-public/agents/quickstart.md`,
  `docs-public/agents/installation.md`, `docs-public/agents/spec.md`,
  `docs-public/agents/error-repair.md`, `docs-public/agents/examples.md`,
  `docs-public/agents/prompting.md`, `docs-public/agents/comparisons.md`, `docs-public/agents/integrations.md`.
- Private maintainer workflow lives in Linear; start with `Agent Resource Index`.
