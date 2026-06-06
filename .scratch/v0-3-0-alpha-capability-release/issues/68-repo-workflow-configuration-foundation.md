Status: ready-for-agent
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

- [ ] `diagrampilot.config.yaml` supports top-level `version: 1`.
- [ ] Commands discover the first config upward from command scope to the Git
      root or filesystem root.
- [ ] Config validation happens before source processing in `check` and
      related repo workflow commands.
- [ ] Invalid config fails with repairable diagnostics.
- [ ] Zero-config behavior remains `docs/foo.dp.yaml -> docs/foo.svg`.
- [ ] Source ignore patterns apply only to source discovery.
- [ ] Ignore patterns use gitignore-style paths relative to the config
      directory.
- [ ] Absolute ignore patterns are rejected as invalid config.
- [ ] Configured paths must stay within the config directory tree.
- [ ] `check` remains read-only.
- [ ] `--json` output includes the config path when config is used.
- [ ] `diagrampilot init` does not create config by default.
- [ ] `diagrampilot init --config` creates minimal config and fails
      repairably if config already exists.
- [ ] Tests cover discovery, validation, zero-config compatibility, ignore
      handling, path safety, read-only checks, JSON output, and init behavior.

## Blocked by

- [67 YAML-only source support](./67-yaml-only-source-support.md)

## Validation plan

```bash
npm test
node packages/cli/dist/index.js check demo-projects/checkout --json
git diff --check
```
