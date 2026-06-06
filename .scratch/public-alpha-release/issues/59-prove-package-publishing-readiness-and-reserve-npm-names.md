Status: completed
Issue Version: 0.1.6

# Prove package publishing readiness and reserve npm names

## Parent

- [PRD](../PRD.md)

## What to build

Prove that the Public Package Set is ready to publish and reserve the npm
package names with a real pre-alpha publish under a non-default dist-tag.

## Acceptance criteria

- [x] Package name availability or ownership is verified for `diagrampilot`,
      `@diagrampilot/core`, `@diagrampilot/icons`,
      `@diagrampilot/export-mermaid`, `@diagrampilot/export-d2`, and
      `@diagrampilot/render-svg`.
- [x] Public package manifests use the same Issue Version and exact internal
      dependency versions.
- [x] The root workspace and `website` workspace are not publishable packages.
- [x] `npm pack --dry-run` or an equivalent package-readiness check passes for
      every package in the Public Package Set.
- [x] Tarball checks prove package installs include runtime files and license
      text but exclude Internal Documentation, `.scratch/`, generated reports,
      local caches, website build output, and unrelated source files.
- [x] A clean pre-alpha package set is published to npm under the `prealpha`
      dist-tag after readiness checks pass.
- [x] The `latest` dist-tag is not moved by this pre-alpha publish.
- [x] Public docs describe `0.1.x` as pre-alpha if any pre-alpha package is
      discoverable before v0.2.0.
- [x] Release notes or local issue notes record the package names, versions,
      dist-tags, and validation results.

## Blocked by

- [58 Add installation and removal public documentation](./58-add-installation-and-removal-public-documentation.md)

## Validation plan

```bash
npm run build
npm test
npm pack --dry-run --workspace diagrampilot
npm pack --dry-run --workspace @diagrampilot/core
npm pack --dry-run --workspace @diagrampilot/icons
npm pack --dry-run --workspace @diagrampilot/export-mermaid
npm pack --dry-run --workspace @diagrampilot/export-d2
npm pack --dry-run --workspace @diagrampilot/render-svg
npm run check:package-publish-state -- --expect available
npm publish --dry-run --workspace diagrampilot --tag prealpha --access public
npm publish --dry-run --workspace @diagrampilot/core --tag prealpha --access public
npm publish --dry-run --workspace @diagrampilot/icons --tag prealpha --access public
npm publish --dry-run --workspace @diagrampilot/export-mermaid --tag prealpha --access public
npm publish --dry-run --workspace @diagrampilot/export-d2 --tag prealpha --access public
npm publish --dry-run --workspace @diagrampilot/render-svg --tag prealpha --access public
npm run check:package-publish-state -- --expect prealpha
git diff --check
```

## Implementation notes

- The planning session checked npm on June 5, 2026; all planned package names
  returned npm `E404` before publishing.
- Bumped the repository to Issue Version `0.1.6` across root, public package,
  private workspace, lockfile, internal package dependency, runtime version, and
  checkout demo SVG provenance metadata.
- Added `scripts/check-package-publish-state.mjs` and root
  `check:package-publish-state` so release maintainers can verify the Public
  Package Set is either still available before reservation or published under
  `prealpha` afterward without moving `latest`.
- Verified live npm registry availability on June 6, 2026 UTC:
  `diagrampilot`, `@diagrampilot/core`, `@diagrampilot/icons`,
  `@diagrampilot/export-mermaid`, `@diagrampilot/export-d2`, and
  `@diagrampilot/render-svg` all returned npm `E404` from
  `https://registry.npmjs.org/`.
- Added package publish-state tests covering pre-reservation availability and
  post-publish `prealpha` reservation state.
- Updated the package readiness gate and CLI package manifest so npm publish
  does not auto-correct and remove the `diagrampilot` binary mapping.
- Added package-local `README.md` files for every package in the Public Package
  Set and made package readiness fail unless tarballs include them. The first
  `0.1.5` npm reservation did not include README files; because npm package
  versions are immutable, `0.1.6` supersedes it as the clean pre-alpha package
  set.
- Updated the release version workflow with guarded `prealpha` publish commands
  for every package in the Public Package Set.
- Shifted remaining pre-alpha Issue Versions forward by one patch after the
  corrective `0.1.6` publish: issue 60 is `0.1.7`, issue 61 is `0.1.8`, and
  issue 63 is `0.1.9`. Issue 62 remains `0.2.0`.
- Updated the public installation guide to explain that any discoverable
  `0.1.x` packages are pre-alpha packages published under `prealpha` before
  the `0.2.0` Public Alpha Release.
- Published `0.1.5` under `prealpha` on June 6, 2026 UTC, then published
  `0.1.6` under `prealpha` after adding npm README coverage. The publish used a
  temporary npm user config outside the repository and removed it afterward.
- Final npm dist-tags for all six packages are `prealpha: 0.1.6` and
  `latest: 0.1.5`. The corrective `0.1.6` publish did not move `latest`; npm
  rejected removing the first-publish `latest` tag with `E400`.
- `npm view <package>@0.1.6 readmeFilename --json` returns `"README.md"` for
  all six packages.
- Future release automation in issue 61 should use npm trusted publishing/OIDC
  rather than the one-time token path used for this manual name reservation.

## Validation results

- `npm config get registry` passed and returned `https://registry.npmjs.org/`.
- `npm whoami` initially returned `ENEEDAUTH`; after the supplied one-time token
  was used through a temporary npm config, npm identified the publisher as
  `stienswout`.
- `npm run check:release-version` passed at `0.1.6`.
- `npm run check:package-publish-state -- --expect available` passed before
  publishing.
- `npm run check:package-readiness` passed for all 6 public packages.
- `node --test test/package-publish-state.test.mjs` passed: 2 tests.
- `node --test test/package-readiness.test.mjs` passed: 5 tests.
- `node --test --test-name-pattern "release version workflow documents" test/release-version-tooling.test.mjs`
  passed.
- `node --test --test-name-pattern "canonical public install and removal guidance" test/documentation-contract.test.mjs`
  passed.
- `npm run build` passed.
- `cd demo-projects/checkout && node ../../packages/cli/dist/index.js render docs/architecture.dp.yaml --out docs/architecture.svg`
  passed.
- `cd demo-projects/checkout && node ../../packages/cli/dist/index.js check`
  passed.
- `npm test` passed: 149 tests.
- `npm --workspace website run build` passed.
- `npm pack --dry-run --workspace diagrampilot` passed.
- `npm pack --dry-run --workspace @diagrampilot/core` passed.
- `npm pack --dry-run --workspace @diagrampilot/icons` passed.
- `npm pack --dry-run --workspace @diagrampilot/export-mermaid` passed.
- `npm pack --dry-run --workspace @diagrampilot/export-d2` passed.
- `npm pack --dry-run --workspace @diagrampilot/render-svg` passed.
- `npm publish --dry-run --workspace diagrampilot --tag prealpha --access public`
  passed after correcting `bin.diagrampilot` to `dist/index.js`.
- `npm publish --dry-run --workspace @diagrampilot/core --tag prealpha --access public`
  passed.
- `npm publish --dry-run --workspace @diagrampilot/icons --tag prealpha --access public`
  passed.
- `npm publish --dry-run --workspace @diagrampilot/export-mermaid --tag prealpha --access public`
  passed.
- `npm publish --dry-run --workspace @diagrampilot/export-d2 --tag prealpha --access public`
  passed.
- `npm publish --dry-run --workspace @diagrampilot/render-svg --tag prealpha --access public`
  passed.
- Published `@diagrampilot/icons@0.1.6`,
  `@diagrampilot/core@0.1.6`,
  `@diagrampilot/export-mermaid@0.1.6`,
  `@diagrampilot/export-d2@0.1.6`,
  `@diagrampilot/render-svg@0.1.6`, and `diagrampilot@0.1.6` to npm under the
  `prealpha` dist-tag.
- `npm run check:package-publish-state -- --expect prealpha` passed after
  publish.
- `npm view <package> dist-tags --json` returned `prealpha: "0.1.6"` and
  `latest: "0.1.5"` for all six packages.
- `npm view <package>@0.1.6 readmeFilename --json` returned `"README.md"` for
  all six packages.
- `git diff --check` passed.
