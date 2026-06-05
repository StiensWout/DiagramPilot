Status: ready-for-agent
Issue Version: 0.1.5

# Prove package publishing readiness and reserve npm names

## Parent

- [PRD](../PRD.md)

## What to build

Prove that the Public Package Set is ready to publish and reserve the npm
package names with a real pre-alpha publish under a non-default dist-tag.

## Acceptance criteria

- [ ] Package name availability or ownership is verified for `diagrampilot`,
      `@diagrampilot/core`, `@diagrampilot/icons`,
      `@diagrampilot/export-mermaid`, `@diagrampilot/export-d2`, and
      `@diagrampilot/render-svg`.
- [ ] Public package manifests use the same Issue Version and exact internal
      dependency versions.
- [ ] The root workspace and `website` workspace are not publishable packages.
- [ ] `npm pack --dry-run` or an equivalent package-readiness check passes for
      every package in the Public Package Set.
- [ ] Tarball checks prove package installs include runtime files and license
      text but exclude Internal Documentation, `.scratch/`, generated reports,
      local caches, website build output, and unrelated source files.
- [ ] A clean pre-alpha package set is published to npm under the `prealpha`
      dist-tag after readiness checks pass.
- [ ] The `latest` dist-tag is not moved by this pre-alpha publish.
- [ ] Public docs describe `0.1.x` as pre-alpha if any pre-alpha package is
      discoverable before v0.2.0.
- [ ] Release notes or local issue notes record the package names, versions,
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
npm view diagrampilot dist-tags --json
npm view @diagrampilot/core dist-tags --json
git diff --check
```

## Implementation notes

- The planning session checked npm on June 5, 2026; all planned package names
  returned npm `E404` before publishing.
