Status: completed

# Scaffold static Astro Starlight website

## Parent

- [PRD](../PRD.md)

## What to build

Add a top-level static website project for the Public Website using Astro and
Starlight. The site should build locally as a static artifact and stay outside
the compiler package build path.

## Acceptance criteria

- [x] A top-level `website/` project exists.
- [x] The root npm workspace configuration includes `website/`.
- [x] `website/` is not added to root TypeScript project references.
- [x] The root compiler `build` script continues to build compiler packages only.
- [x] A root script can build the website explicitly.
- [x] The website uses Astro and Starlight.
- [x] The website build output is static.
- [x] The initial website shell has no server runtime, functions, database, object storage, or hosted workspace dependency.
- [x] Website generated output is ignored by Git.
- [x] Existing product tests continue to pass.

## Blocked by

- [42 Audit and update public and internal docs](./42-audit-and-update-public-internal-docs.md)

## Validation plan

```bash
npm install
npm run build
npm --workspace website run build
npm test
```

## Implementation notes

- Added a top-level `website/` npm workspace using Astro `6.4.4` and
  `@astrojs/starlight` `0.39.3`.
- Added `website/astro.config.mjs` with `output: "static"` and the public site
  URL set to `https://diagrampilot.com`.
- Added the Starlight content collection setup and an initial docs landing page
  under `website/src/content/docs/index.md`.
- Added `website/.gitignore` entries for generated `dist/` and `.astro/`
  output.
- Added the root `build:website` script while leaving the root compiler
  `build` script unchanged.
- Added `test/website-scaffold.test.mjs` to protect the workspace boundary,
  static Starlight scaffold, and forbidden hosted/runtime dependencies.

## Validation results

Passed:

```bash
npm install
node --test test/website-scaffold.test.mjs
npm run build
npm --workspace website run build
npm test
```
