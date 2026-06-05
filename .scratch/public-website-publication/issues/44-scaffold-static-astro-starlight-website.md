Status: ready-for-agent

# Scaffold static Astro Starlight website

## Parent

- [PRD](../PRD.md)

## What to build

Add a top-level static website project for the Public Website using Astro and
Starlight. The site should build locally as a static artifact and stay outside
the compiler package build path.

## Acceptance criteria

- [ ] A top-level `website/` project exists.
- [ ] The root npm workspace configuration includes `website/`.
- [ ] `website/` is not added to root TypeScript project references.
- [ ] The root compiler `build` script continues to build compiler packages only.
- [ ] A root script can build the website explicitly.
- [ ] The website uses Astro and Starlight.
- [ ] The website build output is static.
- [ ] The initial website shell has no server runtime, functions, database, object storage, or hosted workspace dependency.
- [ ] Website generated output is ignored by Git.
- [ ] Existing product tests continue to pass.

## Blocked by

- [42 Audit and update public and internal docs](./42-audit-and-update-public-internal-docs.md)

## Validation plan

```bash
npm install
npm run build
npm --workspace website run build
npm test
```
