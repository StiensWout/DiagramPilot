Status: ready-for-agent
Issue Version: 0.1.4

# Add installation and removal public documentation

## Parent

- [PRD](../PRD.md)

## What to build

Add compact Release-Ready Public Documentation for installing and removing
DiagramPilot. Public docs should distinguish real user installation paths from
contributor source-checkout setup.

## Acceptance criteria

- [ ] Public docs include a compact installation guide for one-off use with
      `npx diagrampilot ...`.
- [ ] Public docs include a compact installation guide for repository CI and
      repeatable workflows with `npm install --save-dev diagrampilot`.
- [ ] Public docs include a compact installation guide for global local use
      with `npm install --global diagrampilot`.
- [ ] Public docs mention package-manager equivalents such as `pnpm dlx`,
      `pnpm add -D`, `yarn dlx`, and `bunx` only if the commands are verified.
- [ ] Build-from-source instructions are kept out of the primary public
      installation path and remain contributor/internal guidance.
- [ ] Public docs include package uninstall commands for local dev dependency
      and global installs.
- [ ] Public docs include repository cleanup guidance for removing
      `diagrampilot:init` managed sections from `llms.txt` and
      `docs/diagrampilot.md`.
- [ ] Public docs say deleting `llms.txt` or `docs/diagrampilot.md` is optional
      only when DiagramPilot created the file and it contains no other project
      content.
- [ ] Public docs do not tell users to delete adopted `*.dp.yaml`, SVG,
      Mermaid, D2, DOT, or PNG artifacts by default.
- [ ] README, `llms.txt`, website CTAs, and public docs route inventory point
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

- Fill in after implementation.
