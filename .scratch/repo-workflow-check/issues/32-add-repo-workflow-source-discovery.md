Status: completed

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

- [x] Discovery finds `*.dp.yaml` and `*.dp.json` files recursively from the current working directory.
- [x] Discovery supports one explicit directory path.
- [x] Discovery supports one explicit DiagramPilot Source File path.
- [x] Discovery rejects unsupported explicit source extensions such as `.dp.yml`.
- [x] Discovery ignores `.git`, `node_modules`, `dist`, `build`, `coverage`, `.next`, `.vite`, and `.turbo`.
- [x] Directory discovery with no DiagramPilot Source Files is represented as a successful no-op.
- [x] Discovery returns sources in stable normalized relative path order.
- [x] Discovery does not validate, render, write files, or rewrite source files.
- [x] Tests cover supported extensions, unsupported explicit paths, ignored directories, explicit file scope, explicit directory scope, and no-source no-op behavior.

## Blocked by

None - can start immediately

## Validation plan

```bash
npm test
node --test test/*.test.mjs
```

## Comments

Implemented 2026-06-04:

- Added `discoverDiagramPilotSourceFiles()` to `@diagrampilot/core` as the reusable repo workflow discovery seam for later `check` command work.
- Added explicit discovery result types for successful directory/file scope handling and for unsupported or missing explicit paths.
- Implemented recursive directory walking for `*.dp.yaml` and `*.dp.json` only, with stable normalized relative path ordering.
- Ignored the documented VCS, dependency, and build directories: `.git`, `node_modules`, `dist`, `build`, `coverage`, `.next`, `.vite`, and `.turbo`.
- Kept discovery read-only and validation-free so invalid DiagramPilot source files are still discoverable for later check-phase validation.
- Added focused tests covering explicit file scope, unsupported explicit source extensions, explicit directory recursion, ignored directories, current-working-directory scope, and no-source success.

Validation plan:

```bash
npm test
node --test test/repo-workflow-source-discovery.test.mjs
```

Validation performed 2026-06-04:

- `npm test` passed 59 tests.
- `npm run build && node --test test/repo-workflow-source-discovery.test.mjs` passed 5 tests.
