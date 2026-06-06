Status: completed
Issue Version: 0.1.4

# Add installation and removal public documentation

## Parent

- [PRD](../PRD.md)

## What to build

Add compact Release-Ready Public Documentation for installing and removing
DiagramPilot. Public docs should distinguish real user installation paths from
contributor source-checkout setup.

## Acceptance criteria

- [x] Public docs include a compact installation guide for one-off use with
      `npx diagrampilot ...`.
- [x] Public docs include a compact installation guide for repository CI and
      repeatable workflows with `npm install --save-dev diagrampilot`.
- [x] Public docs include a compact installation guide for global local use
      with `npm install --global diagrampilot`.
- [x] Public docs mention package-manager equivalents such as `pnpm dlx`,
      `pnpm add -D`, `yarn dlx`, and `bunx` only if the commands are verified.
- [x] Build-from-source instructions are kept out of the primary public
      installation path and remain contributor/internal guidance.
- [x] Public docs include package uninstall commands for local dev dependency
      and global installs.
- [x] Public docs include repository cleanup guidance for removing
      `diagrampilot:init` managed sections from `llms.txt` and
      `docs/diagrampilot.md`.
- [x] Public docs say deleting `llms.txt` or `docs/diagrampilot.md` is optional
      only when DiagramPilot created the file and it contains no other project
      content.
- [x] Public docs do not tell users to delete adopted `*.dp.yaml`, SVG,
      Mermaid, D2, DOT, or PNG artifacts by default.
- [x] README, `llms.txt`, website CTAs, and public docs route inventory point
      to the canonical installation and removal guidance without duplicating a
      second long-form source.

## Blocked by

- [57 Commit and apply DiagramPilot Brand Assets](./57-commit-and-apply-diagrampilot-brand-assets.md)

## Validation plan

```bash
npm run build
npm --workspace website run build
npm test
rg -n "npx diagrampilot|npm install --save-dev diagrampilot|npm install --global diagrampilot|npm uninstall" README.md llms.txt docs-public website/src
git diff --check
```

## Implementation notes

- Added canonical public installation and removal guidance at
  `docs-public/agents/installation.md`.
- Documented one-off `npx diagrampilot ...` usage, repository dev dependency
  setup with `npm install --save-dev diagrampilot`, and global local setup with
  `npm install --global diagrampilot`.
- Included verified pnpm, Yarn, and Bun equivalents for one-off execution,
  local dev dependency install, and local dependency removal.
- Kept source-checkout build steps out of the installation guide; README labels
  them as contributor source-checkout guidance.
- Added uninstall and repository cleanup guidance for package removal,
  `diagrampilot:init` managed sections, optional deletion of generated support
  files, and retained adopted diagram sources/artifacts by default.
- Linked the guide from README, `llms.txt`, Public Documentation index, landing
  CTAs, AGENTS public docs inventory, and internal public route inventories.
- Added tests for the canonical guide content, links, route publication, and
  docs boundary coverage.
- Validation results on 2026-06-06 UTC:
  - `node --test test/documentation-contract.test.mjs` passed: 5 tests.
  - `node --test test/docs-public-boundary.test.mjs` passed: 16 tests.
  - `node --test test/website-public-docs-routes.test.mjs` passed: 6 tests.
  - `node --test test/website-vercel-deployment-guidance.test.mjs` passed: 4
    tests.
  - `node --test test/website-public-landing-page.test.mjs` passed: 4 tests.
  - `node --test test/website-visual-quality.test.mjs` passed: 1 test.
  - `npm run build` passed.
  - `npm --workspace website run build` passed.
  - `npm test` passed: 145 tests.
  - `rg -n "npx diagrampilot|npm install --save-dev diagrampilot|npm install --global diagrampilot|npm uninstall" README.md llms.txt docs-public website/src`
    passed with matches in `docs-public/agents/installation.md`.
  - `git diff --check` passed.
