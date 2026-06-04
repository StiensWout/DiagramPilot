Status: ready-for-agent

# Thin CLI check planning into an adapter

## Parent

- [PRD](../PRD.md)

## What to build

Refactor CLI check planning so it delegates Repo Workflow Check behaviour to the
deep Repo Workflow Check module. Command planning should remain responsible for
argument handling, text versus JSON output, exit code selection, stdout/stderr
routing, and empty write intent. It should no longer construct the aggregate
check result itself.

The user-facing `diagrampilot check [path] [--json]` contract must remain
unchanged.

## Acceptance criteria

- [ ] `diagrampilot check` still checks the current working directory.
- [ ] `diagrampilot check <directory>` still checks one explicit directory scope.
- [ ] `diagrampilot check <source-file>` still checks one explicit source file.
- [ ] `diagrampilot check --json` still emits aggregate JSON to stdout.
- [ ] Text success output remains concise and does not list every fresh source.
- [ ] Text failure output still points invalid sources to `validate`.
- [ ] Text failure output still points missing, stale, malformed, unreadable, and missing-provenance artifacts to `render`.
- [ ] Exit code remains `0` for success and no-source directory scopes.
- [ ] Exit code remains `1` for command errors and workflow issues.
- [ ] `check` command planning still returns no write intents.
- [ ] CLI command planning tests use a fake Repo Workflow Check adapter where appropriate.
- [ ] Real CLI smoke coverage for `check` continues to pass.

## Blocked by

- [38 Add deep Repo Workflow Check module](./38-add-deep-repo-workflow-check-module.md)
