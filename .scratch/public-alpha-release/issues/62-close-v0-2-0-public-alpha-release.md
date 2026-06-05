Status: ready-for-agent
Issue Version: 0.2.0

# Close v0.2.0 Public Alpha Release

## Parent

- [PRD](../PRD.md)

## What to build

Close the v0.2.0 scope as the first Public Alpha Release. This issue should
coordinate the final version bump, package publish, public docs, website,
release notes, and public surface audit.

## Acceptance criteria

- [ ] The shared DiagramPilot version is `0.2.0` across public packages,
      internal dependencies, lockfile metadata, runtime version metadata, and
      version-sensitive tests.
- [ ] Demo SVG provenance and any other version-sensitive Derived Artifacts are
      refreshed and committed.
- [ ] Public docs are compact, coherent, structured, current with v0.2.0, and
      published through the Public Website.
- [ ] Installation and removal docs are published and linked from README,
      `llms.txt`, and website entrypoints.
- [ ] The MIT Code License and Brand Use Policy are present and discoverable.
- [ ] Canonical DiagramPilot Brand Assets are committed and applied to website
      and release surfaces where appropriate.
- [ ] Public Package Set tarball checks pass.
- [ ] Public Package Set packages are published to npm at `0.2.0` under the
      `latest` dist-tag.
- [ ] `diagrampilot` can be installed and invoked through the documented npm
      install paths.
- [ ] Git tag `v0.2.0` points at the release commit.
- [ ] A GitHub release exists for `v0.2.0` with concise release notes.
- [ ] The Public Website production deployment serves the v0.2.0 docs and
      release-aligned public routes.
- [ ] Internal Documentation, ADRs, agent workflow docs, and `.scratch/`
      planning trackers are not published through website docs routes, included
      in npm package tarballs, or linked as user-facing release materials.
- [ ] Generated visual reports and font cache files under `.scratch/` are
      removed from the public release surface unless a specific committed-review
      reason exists.
- [ ] Local issue status, acceptance criteria, implementation notes, validation
      plan, and validation results are updated before closeout.

## Blocked by

- [61 Add GitHub Actions release workflow](./61-add-github-actions-release-workflow.md)

## Validation plan

```bash
npm ci
npm run build
npm test
npm --workspace website run build
npm --workspace website run test
npm --workspace website run check:visual
cd demo-projects/checkout && diagrampilot check
npm view diagrampilot@0.2.0 version
npm view @diagrampilot/core@0.2.0 version
npm view @diagrampilot/icons@0.2.0 version
npm view @diagrampilot/export-mermaid@0.2.0 version
npm view @diagrampilot/export-d2@0.2.0 version
npm view @diagrampilot/render-svg@0.2.0 version
git diff --check
```

## Implementation notes

- Fill in after implementation.
