Status: completed
Issue Version: 0.1.9

# Finalize alpha behavior and public surface gate

## Parent

- [PRD](../PRD.md)

## What to build

Finalize the last pre-alpha product behavior and public surface before v0.2.0
closeout. This issue should make local agent docs opt-in, sharpen the landing
page install/repository path, and run a full public docs simplification pass.

## Acceptance criteria

- [x] `diagrampilot init` no longer creates or updates `llms.txt` or
      `docs/diagrampilot.md` by default.
- [x] `diagrampilot init --docs` explicitly creates or updates the managed
      `diagrampilot:init` sections in `llms.txt` and `docs/diagrampilot.md`.
- [x] Existing `diagrampilot init` support-file idempotency behavior is
      preserved for the `--docs` path.
- [x] Public docs explain that package install and normal `init` do not install
      local DiagramPilot agent docs into a consuming repository.
- [x] Public docs explain when to use `diagrampilot init --docs`.
- [x] Removal docs still explain how to clean up existing
      `diagrampilot:init` managed sections.
- [x] The Public Website landing page has a GitHub repository button in the CTA
      position that currently points at the Checkout Demo Project.
- [x] The Checkout Demo Project remains discoverable from Public Documentation.
- [x] The Public Website landing page includes a copyable quick command bar for
      `npx diagrampilot check`.
- [x] The install guide keeps the repeatable repository install path
      `npm install --save-dev diagrampilot` easy to find.
- [x] README, `llms.txt`, Public Documentation, and website copy get a full
      refinement and simplification pass before release closeout.
- [x] Public docs avoid duplicated long-form install guidance outside the
      canonical installation and removal guide.
- [x] Documentation and website tests cover the `init --docs` behavior, GitHub
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

- Changed `diagrampilot init` to be a successful no-write command by default.
  It now prints that Local Agent Documentation was not installed and points to
  `diagrampilot init --docs`.
- Added explicit `diagrampilot init --docs` argument handling for the managed
  `llms.txt` and `docs/diagrampilot.md` support-file writer, preserving the
  existing managed-section replacement and idempotency behavior.
- Added guarded init option handling so unknown init options fail without
  writing support files.
- Updated CLI help to show `init [--docs]`.
- Updated README, `llms.txt`, Public Documentation, and the internal
  Documentation Contract so package install and normal `init` do not imply
  copied local agent docs, while `init --docs` remains the explicit opt-in path.
- Kept long-form install, removal, package-manager equivalent, and managed
  cleanup guidance centralized in `docs-public/agents/installation.md`.
- Updated the Public Website landing page with a GitHub repository CTA in the
  hero, a copyable `npx diagrampilot check` command bar, and a lower Checkout
  Demo Project link so the demo remains discoverable through Public
  Documentation.
- Added documentation and website tests for `init --docs`, default init
  no-write behavior, centralized install guidance, the GitHub CTA, and the
  quick command bar.
- Bumped DiagramPilot Issue Version metadata to `0.1.9` and refreshed checkout
  demo SVG provenance at `0.1.9`.

## Validation results

- `npm run build` passed.
- `cd demo-projects/checkout && node ../../packages/cli/dist/index.js render docs/architecture.dp.yaml --out docs/architecture.svg`
  passed.
- `cd demo-projects/checkout && node ../../packages/cli/dist/index.js check`
  passed: 1 DiagramPilot Source File fresh.
- `npm run check:release-version` passed at `0.1.9`.
- `npm test` passed: 161 tests.
- `npm --workspace website run build` passed. Astro emitted the existing
  markdown plugin deprecation warning.
- `npm --workspace website run check:visual` passed.
- `npm run check:package-readiness` passed for all 6 public packages.
- `rg -n "init --docs|npx diagrampilot check|npm install --save-dev diagrampilot|GitHub repository" README.md llms.txt docs-public website/src`
  found the expected public surface references.
- `git diff --check` passed.
