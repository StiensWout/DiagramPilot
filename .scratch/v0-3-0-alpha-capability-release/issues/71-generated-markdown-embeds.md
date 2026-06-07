Status: ready-for-agent
Issue Version: 0.2.8

# Generated Markdown embeds

## Parent

- [PRD](../PRD.md)

## What to build

Add generated Markdown embeds as standalone generated files. DiagramPilot
should not edit arbitrary prose documents in place. Configured Markdown embeds
should depend on the freshness of referenced artifacts, so a clean embed cannot
hide a stale diagram image or export.

## User stories covered

- 37-39

## Acceptance criteria

- [ ] Repo Workflow Configuration can declare generated Markdown embed
      outputs.
- [ ] Markdown embeds are written as standalone generated files.
- [ ] DiagramPilot does not edit arbitrary existing prose documents in place.
- [ ] Markdown embeds reference configured generated artifacts using stable
      relative paths.
- [ ] Markdown embed freshness depends on referenced artifact freshness.
- [ ] `check` reports stale or missing Markdown embeds without writing.
- [ ] `generate` writes Markdown embeds after required referenced artifacts are
      generated or verified.
- [ ] `generate --json` includes Markdown embed write results.
- [ ] Tests cover standalone embed generation, no in-place prose edits,
      relative references, stale referenced artifacts, stale embeds, check
      output, generate output, and JSON output.

## Blocked by

- [69 Configured artifact mappings and freshness](./69-configured-artifact-mappings-and-freshness.md)
- [70 Generate command for configured outputs](./70-generate-command-for-configured-outputs.md)

## Validation plan

```bash
npm test
node packages/cli/dist/index.js check demo-projects/checkout --json
git diff --check
```
