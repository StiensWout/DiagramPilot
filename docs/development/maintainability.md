# Maintainability Gates

DiagramPilot keeps authored implementation and test files below a file-size
gate so maintainers and AI coding agents can review and navigate changes
without oversized modules.

## Workflow Performance Benchmark

Run the local workflow benchmark before and after performance work:

```bash
npm run benchmark
```

The command builds the workspace, copies the checkout Demo Project into a
temporary configured Repo Workflow fixture, and measures representative
maintainer workflows. The benchmark covers `validate`, `check`, `generate`, SVG
render, PNG render, and MCP validation/check overhead. Use JSON output when a
before/after run needs to be diffed or attached to an implementation note:

```bash
npm run benchmark -- --format json
```

The checked-in baseline lives at `benchmarks/workflow-baseline.json`. It stores
relative median values normalized to `cli_validate`, not raw sample timings or
machine metadata. A result with a positive relative change is slower than the
baseline for that workflow; a negative relative change is faster. Treat small
changes as noise unless they repeat across multiple local runs on the same
machine.

Refresh the normalized baseline only when an intentional performance change
lands:

```bash
npm run benchmark -- --compare none --write-baseline benchmarks/workflow-baseline.json
```

## File-Size Gate

The file-size gate threshold is **500 LOC**.

Included paths:

- `packages/**/*.ts`
- `test/**/*.mjs`
- `website/src/**/*`
- `website/scripts/**/*`

Excluded paths:

- Generated output and build artifacts: `**/dist/**`, `**/build/**`,
  `**/coverage/**`, `**/.next/**`, `**/.vite/**`, `**/.turbo/**`,
  `**/.astro/**`, `**/*.generated.*`, `**/*.gen.*`, and
  `**/generated/**`
- Synced Starlight docs: `website/src/content/docs/**`
- Schema artifacts: `schema/**`, `**/schema/**`, and `**/*.schema.json`
- SVGs and other generated or binary assets: `**/*.svg`, `**/*.png`,
  `**/*.jpg`, `**/*.jpeg`, `**/*.gif`, `**/*.webp`, `**/*.avif`, and
  `**/*.ico`
- Markdown docs, PRDs, and issue files: `**/*.md`, `**/*.mdx`, and
  `.scratch/**`
- Lockfiles: `package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, `bun.lock`,
  and `bun.lockb`
- Vendored assets: `**/vendor/**`
- Generated declaration files: `**/*.d.ts`

Run the advisory audit:

```bash
npm run audit:maintainability
```

The audit reports each violating file with its current line count. It is
advisory in the file-size gate definition slice so existing violations can be
documented before refactor work begins.

## Known Violations

Current known violations from `npm run audit:maintainability`:

- `packages/core/src/index.ts`: 2366 LOC

`packages/cli/src/index.ts` is currently 985 LOC, below the hard threshold but
close enough that the CLI split remains part of the Productization And
Maintainability phase.

## Enforcement Blocker

Hard enforcement is blocked until the core split removes
`packages/core/src/index.ts` from the violation list. Issue 50,
`Split core under file-size gate and enforce it`, is the enforcement point that
should turn the advisory audit into a failing repository validation step.

## Fallow Codebase Intelligence

DiagramPilot also uses Fallow as a deterministic JS/TS codebase quality signal
for unused code, dependency hygiene, duplication, complexity hotspots, and PR
risk.

Run the required full local gate:

```bash
npm run audit:fallow
```

Run the required changed-code audit before PR review:

```bash
npm run audit:fallow:changed
```

CI runs the full Fallow gate in release readiness and the Fallow changed-code
audit on pull requests. Both are blocking.

Fallow baselines should stay empty after the v0.3.0 cleanup, and future Fallow
findings should be fixed instead of parked in `fallow-baselines/`.

Narrow documented static-analysis limitations belong in `.fallowrc.jsonc`,
with a comment explaining why the exception is intentional. Only update a
baseline when Fallow adds a new baseline category that cannot be represented as
a narrow configuration exception, and keep that entry empty whenever possible.
