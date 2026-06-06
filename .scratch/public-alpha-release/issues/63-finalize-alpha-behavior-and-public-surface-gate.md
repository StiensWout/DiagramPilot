Status: ready-for-agent
Issue Version: 0.1.8

# Finalize alpha behavior and public surface gate

## Parent

- [PRD](../PRD.md)

## What to build

Finalize the last pre-alpha product behavior and public surface before v0.2.0
closeout. This issue should make local agent docs opt-in, sharpen the landing
page install/repository path, and run a full public docs simplification pass.

## Acceptance criteria

- [ ] `diagrampilot init` no longer creates or updates `llms.txt` or
      `docs/diagrampilot.md` by default.
- [ ] `diagrampilot init --docs` explicitly creates or updates the managed
      `diagrampilot:init` sections in `llms.txt` and `docs/diagrampilot.md`.
- [ ] Existing `diagrampilot init` support-file idempotency behavior is
      preserved for the `--docs` path.
- [ ] Public docs explain that package install and normal `init` do not install
      local DiagramPilot agent docs into a consuming repository.
- [ ] Public docs explain when to use `diagrampilot init --docs`.
- [ ] Removal docs still explain how to clean up existing
      `diagrampilot:init` managed sections.
- [ ] The Public Website landing page has a GitHub repository button in the CTA
      position that currently points at the Checkout Demo Project.
- [ ] The Checkout Demo Project remains discoverable from Public Documentation.
- [ ] The Public Website landing page includes a copyable quick command bar for
      `npx diagrampilot check`.
- [ ] The install guide keeps the repeatable repository install path
      `npm install --save-dev diagrampilot` easy to find.
- [ ] README, `llms.txt`, Public Documentation, and website copy get a full
      refinement and simplification pass before release closeout.
- [ ] Public docs avoid duplicated long-form install guidance outside the
      canonical installation and removal guide.
- [ ] Documentation and website tests cover the `init --docs` behavior, GitHub
      repository CTA, quick command bar, and final docs simplification gate.

## Blocked by

- [61 Add GitHub Actions release workflow](./61-add-github-actions-release-workflow.md)

## Validation plan

```bash
npm run build
npm test
npm --workspace website run build
npm --workspace website run check:visual
rg -n "init --docs|npx diagrampilot check|npm install --save-dev diagrampilot|GitHub repository" README.md llms.txt docs-public website/src
git diff --check
```

## Implementation notes

- Fill in after implementation.
