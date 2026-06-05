Status: ready-for-agent
Issue Version: 0.1.2

# Add MIT license package metadata tarball checks and brand policy

## Parent

- [PRD](../PRD.md)

## What to build

Add the release licensing and package metadata foundation for public package
publishing. DiagramPilot should use MIT as the Code License while protecting
official product identity through a separate Brand Use Policy.

## Acceptance criteria

- [ ] A root `LICENSE` file contains the MIT license text for DiagramPilot.
- [ ] Root and public package `package.json` files use `license: "MIT"`.
- [ ] Public package manifests include release-ready metadata such as
      repository, homepage, bugs, keywords, and appropriate publish settings.
- [ ] Root workspace and `website` remain private and unpublished.
- [ ] Public package tarball checks verify license text is included.
- [ ] Public package tarball checks verify expected publish content and exclude
      `.scratch/`, Internal Documentation, ADRs, agent workflow docs, website
      build output, local caches, generated visual reports, and source-only
      planning files.
- [ ] A public Brand Use Policy explains allowed and disallowed use of the
      DiagramPilot name, mark, wordmark, domain, and release identity.
- [ ] The Code License and Brand Use Policy are clearly separate in public
      docs or repository entrypoints.
- [ ] ADR `docs/adr/0008-public-alpha-release-and-package-publishing.md`
      captures the MIT code license, Brand Use Policy, Public Package Set,
      pre-alpha dist-tag, and v0.2.0 `latest` decision.

## Blocked by

- [55 Add release version tooling and Issue Version workflow](./55-add-release-version-tooling-and-issue-version-workflow.md)

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
git diff --check
```

## Implementation notes

- Fill in after implementation.
