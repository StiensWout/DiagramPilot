Status: completed
Issue Version: 0.2.5

# Repo Workflow Configuration foundation

## Parent

- [PRD](../PRD.md)

## What to build

Add optional Repo Workflow Configuration with `diagrampilot.config.yaml`.
Zero-config behavior must remain intact, but configured repos should be able to
validate configuration before source processing, discover config upward from the
command scope, apply source ignore patterns, and constrain configured paths to
the config directory tree.

`diagrampilot init` should not create config by default. `diagrampilot init
--config` should create a minimal config and fail with a repairable message if
one already exists, unless a future `--force` is added.

## User stories covered

- 25-27, 30, 33-34

## Acceptance criteria

- [x] `diagrampilot.config.yaml` supports top-level `version: 1`.
- [x] Commands discover the first config upward from command scope to the Git
      root or filesystem root.
- [x] Config validation happens before source processing in `check` and
      related repo workflow commands.
- [x] Invalid config fails with repairable diagnostics.
- [x] Zero-config behavior remains `docs/foo.dp.yaml -> docs/foo.svg`.
- [x] Source ignore patterns apply only to source discovery.
- [x] Ignore patterns use gitignore-style paths relative to the config
      directory.
- [x] Absolute ignore patterns are rejected as invalid config.
- [x] Configured paths must stay within the config directory tree.
- [x] `check` remains read-only.
- [x] `--json` output includes the config path when config is used.
- [x] `diagrampilot init` does not create config by default.
- [x] `diagrampilot init --config` creates minimal config and fails
      repairably if config already exists.
- [x] Tests cover discovery, validation, zero-config compatibility, ignore
      handling, path safety, read-only checks, JSON output, and init behavior.

## Blocked by

- [67 YAML-only source support](./67-yaml-only-source-support.md)

## Validation plan

```bash
npm test
node packages/cli/dist/index.js check demo-projects/checkout --json
git diff --check
```

## Implementation notes

- Added optional Repo Workflow Configuration loading for
  `diagrampilot.config.yaml` with top-level `version: 1` and a closed
  foundation schema for `sources.ignore`.
- Added upward config discovery from the command scope, stopping at the first
  config found or at the Git root/filesystem root boundary.
- Validated config before source discovery and source loading in
  `checkDiagramPilotRepoWorkflow`; invalid config returns repairable
  diagnostics naming the config path and invalid field.
- Threaded config-root-relative `sources.ignore` patterns into source
  discovery only. Absolute patterns and `..` traversal are invalid config, and
  zero-config next-to-source SVG behavior is unchanged.
- Kept `check` read-only and added `config.path` to structured `--json` output
  when config is used, displayed relative to the current working directory when
  possible.
- Added `diagrampilot init --config` to create minimal `version: 1` config;
  normal `diagrampilot init` still writes no config, and existing config fails
  with repair guidance.
- Updated public/current-state docs, bumped Issue Version metadata to `0.2.5`,
  and refreshed checkout demo SVG provenance.

## Validation results

- `node scripts/bump-release-version.mjs 0.2.5` passed.
- `npm run build && cd demo-projects/checkout && node ../../packages/cli/dist/index.js render docs/architecture.dp.yaml --out docs/architecture.svg`
  passed.
- `cd demo-projects/checkout && node ../../packages/cli/dist/index.js check`
  passed: 1 DiagramPilot Source File fresh.
- `cd demo-projects/checkout && node ../../packages/cli/dist/index.js check --json`
  passed with `diagramPilotVersion` `0.2.5`.
- `npm test` passed: 191 tests.
- `node scripts/check-release-version.mjs` passed at `0.2.5`.
- `node packages/cli/dist/index.js check demo-projects/checkout --json`
  passed with 1 fresh source.
- `git diff --check` passed.
- `npm run check:package-readiness` passed for 7 public packages.
- `node scripts/generate-release-notes.mjs --version 0.2.5 --tag v0.2.5`
  passed.

## User-facing docs links

- https://diagrampilot.com/docs/agents/quickstart.md
- https://diagrampilot.com/docs/agents/installation.md
- https://diagrampilot.com/llms.txt

## Known limitations

- Configured artifact mappings, source globs, output templates, and configured
  artifact freshness remain scoped to issue 69.
