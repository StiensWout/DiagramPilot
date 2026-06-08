# Maintainability Gates

DiagramPilot keeps authored implementation and test files below a file-size
gate so maintainers and AI coding agents can review and navigate changes
without oversized modules.

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

Run the full local report:

```bash
npm run audit:fallow
```

Run the changed-code audit:

```bash
npm run audit:fallow:changed
```

CI runs the Fallow changed-code audit on pull requests and emits annotations,
but `fail-on-issues` is disabled during staged adoption. The current repository
has existing findings that need triage before Fallow can become a blocking
gate. The intended path is to fix straightforward findings, document narrow
exceptions for intentional patterns such as demo fixtures or public APIs, and
then enable failure on introduced findings once the baseline is intentional.
