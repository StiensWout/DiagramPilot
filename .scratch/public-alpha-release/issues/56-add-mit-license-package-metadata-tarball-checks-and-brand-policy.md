Status: completed
Issue Version: 0.1.2

# Add MIT license package metadata tarball checks and brand policy

## Parent

- [PRD](../PRD.md)

## What to build

Add the release licensing and package metadata foundation for public package
publishing. DiagramPilot should use MIT as the Code License while protecting
official product identity through a separate Brand Use Policy.

## Acceptance criteria

- [x] A root `LICENSE` file contains the MIT license text for DiagramPilot.
- [x] Root and public package `package.json` files use `license: "MIT"`.
- [x] Public package manifests include release-ready metadata such as
      repository, homepage, bugs, keywords, and appropriate publish settings.
- [x] Root workspace and `website` remain private and unpublished.
- [x] Public package tarball checks verify license text is included.
- [x] Public package tarball checks verify expected publish content and exclude
      `.scratch/`, Internal Documentation, ADRs, agent workflow docs, website
      build output, local caches, generated visual reports, and source-only
      planning files.
- [x] A public Brand Use Policy explains allowed and disallowed use of the
      DiagramPilot name, mark, wordmark, domain, and release identity.
- [x] The Code License and Brand Use Policy are clearly separate in public
      docs or repository entrypoints.
- [x] ADR `docs/adr/0008-public-alpha-release-and-package-publishing.md`
      captures the MIT code license, Brand Use Policy, Public Package Set,
      pre-alpha dist-tag, and v0.2.0 `latest` decision.

## Blocked by

- [55 Add release version tooling and Issue Version workflow](./55-add-release-version-tooling-and-issue-version-workflow.md)

## Validation plan

```bash
npm run check:release-version
npm run check:package-readiness
npm run build
npm test
npm pack --dry-run --workspace diagrampilot
npm pack --dry-run --workspace @diagrampilot/core
npm pack --dry-run --workspace @diagrampilot/icons
npm pack --dry-run --workspace @diagrampilot/export-mermaid
npm pack --dry-run --workspace @diagrampilot/export-d2
npm pack --dry-run --workspace @diagrampilot/render-svg
cd demo-projects/checkout && node ../../packages/cli/dist/index.js render docs/architecture.dp.yaml --out docs/architecture.svg
cd demo-projects/checkout && node ../../packages/cli/dist/index.js check
git diff --check
```

## Implementation notes

- Bumped the repository to Issue Version `0.1.2` across root, public package,
  private workspace, lockfile, internal package dependency, runtime version, and
  checkout demo SVG provenance metadata.
- Added root and package-local MIT `LICENSE` files so each public package
  tarball includes the license text that matches the root Code License.
- Updated root and public package manifests with MIT license metadata,
  repository/homepage/bugs/keywords, package-specific repository directories,
  `publishConfig.access: "public"`, and narrow `files` globs that publish built
  JS/types/maps plus `LICENSE` only.
- Kept the root workspace and `website` private while carrying MIT license
  metadata for repository code/source clarity.
- Added `scripts/check-package-readiness.mjs` and
  `test/package-readiness.test.mjs` to validate public package metadata,
  package-local license text, and real `npm pack --dry-run --json` output for
  the Public Package Set.
- Added `BRAND_USE_POLICY.md`, README license/brand links, and ADR
  `docs/adr/0008-public-alpha-release-and-package-publishing.md` to separate
  MIT code licensing from DiagramPilot product identity rules.
- Updated release workflow and agent guidance so future closeout work can find
  the package readiness check and new public/internal docs surfaces.
- Validation results on 2026-06-05 UTC:
  - `npm run check:release-version` passed.
  - `npm run check:package-readiness` passed for 6 public packages.
  - `npm run build` passed.
  - `npm test` passed: 140 tests.
  - `npm pack --dry-run --workspace diagrampilot` passed.
  - `npm pack --dry-run --workspace @diagrampilot/core` passed.
  - `npm pack --dry-run --workspace @diagrampilot/icons` passed.
  - `npm pack --dry-run --workspace @diagrampilot/export-mermaid` passed.
  - `npm pack --dry-run --workspace @diagrampilot/export-d2` passed.
  - `npm pack --dry-run --workspace @diagrampilot/render-svg` passed.
  - `cd demo-projects/checkout && node ../../packages/cli/dist/index.js render docs/architecture.dp.yaml --out docs/architecture.svg` passed.
  - `cd demo-projects/checkout && node ../../packages/cli/dist/index.js check` passed.
  - `git diff --check` passed.
