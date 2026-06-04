Status: pending

# Add repo workflow source discovery

## Parent

- [PRD](../PRD.md)

## What to build

Add the source discovery foundation for the Repo Workflow Check phase. Discovery
should find DiagramPilot Source Files within a Check Scope without validating
artifacts yet.

The first Check Scope rules are:

- `diagrampilot check` uses the current working directory.
- `diagrampilot check <directory>` recursively discovers source files under that directory.
- `diagrampilot check <source-file>` checks one explicit DiagramPilot Source File.
- v1 supports zero or one path argument.
- Discovery accepts only `*.dp.yaml` and `*.dp.json`.
- Directory discovery ignores common dependency, build, and VCS directories.
- Directory discovery that finds no DiagramPilot Source Files succeeds.

This slice may expose reusable discovery/path helpers, but it should not add the
full `check` command output yet unless needed as a thin vertical tracer.

## Acceptance criteria

- [ ] Discovery finds `*.dp.yaml` and `*.dp.json` files recursively from the current working directory.
- [ ] Discovery supports one explicit directory path.
- [ ] Discovery supports one explicit DiagramPilot Source File path.
- [ ] Discovery rejects unsupported explicit source extensions such as `.dp.yml`.
- [ ] Discovery ignores `.git`, `node_modules`, `dist`, `build`, `coverage`, `.next`, `.vite`, and `.turbo`.
- [ ] Directory discovery with no DiagramPilot Source Files is represented as a successful no-op.
- [ ] Discovery returns sources in stable normalized relative path order.
- [ ] Discovery does not validate, render, write files, or rewrite source files.
- [ ] Tests cover supported extensions, unsupported explicit paths, ignored directories, explicit file scope, explicit directory scope, and no-source no-op behavior.

## Blocked by

None - can start immediately

## Validation plan

```bash
npm test
node --test test/*.test.mjs
```
