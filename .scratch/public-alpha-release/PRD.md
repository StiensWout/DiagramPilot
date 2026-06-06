Status: ready-for-agent

# Public Alpha Release

## Problem Statement

DiagramPilot has a local-first compiler workflow, public documentation, a static
Public Website, package workspaces, a demo project, and release-readiness
maintenance work. The repository is not yet ready for the first public and
published alpha release.

The current package metadata still reads like an unpublished workspace:
workspace packages are versioned at `0.1.0`, the root license is `UNLICENSED`,
there is no root `LICENSE`, there is no release automation, and there is no
published npm package path for users. Public documentation also needs compact,
coherent installation and removal guidance for real adoption paths rather than
only local source-checkout invocation.

DiagramPilot also needs release discipline before public alpha. Each remaining
issue before v0.2.0 should be an Issue Version. Pre-alpha versions may be
tagged, and the first clean package-ready pre-alpha should reserve npm names
under a non-default dist-tag. The v0.2.0 release should be the first Public
Alpha Release and publish the Public Package Set under `latest`.

Before v0.2.0, DiagramPilot also needs one final behavior and public surface
gate. Package install and normal initialization should not copy DiagramPilot
agent docs into consuming repositories by default. The public website should
make the install path and source repository easier to find. Public docs should
get a full refinement and simplification pass before the alpha release is
declared complete.

Finally, DiagramPilot needs brand and repository hygiene. The uncommitted
DiagramPilot Brand Assets should become canonical committed assets and be used
where needed before release. Maintainer docs and planning trackers may remain
committed for now, but they must stay out of public website routes, package
tarballs, README and `llms.txt` release messaging, and package publish surfaces.

## Solution

Run a Public Alpha Release track after Productization And Maintainability.

This phase will:

1. Add version bump tooling so every issue closeout advances the Issue Version
   consistently across package manifests, exact internal dependencies, lockfile
   metadata, and DiagramPilot runtime version metadata.
2. Add an MIT Code License, root `LICENSE`, package license metadata, package
   repository/homepage metadata, tarball checks, and a Brand Use Policy.
3. Commit canonical DiagramPilot Brand Assets outside the website and publish
   website copies, including favicon usage and release/public entrypoint usage
   where appropriate.
4. Add compact Release-Ready Public Documentation for install and uninstall
   paths.
5. Prove Package Publishing Readiness for the full Public Package Set and
   reserve npm names with a pre-alpha publish under the `prealpha` dist-tag.
6. Add GitHub Actions CI for branch and pull request validation.
7. Add GitHub Actions release automation using npm trusted publishing where
   available.
8. Finalize alpha behavior and public surface so `diagrampilot init` does not
   install local agent docs by default, `diagrampilot init --docs` is the
   explicit local agent docs path, the Public Website exposes a repository CTA
   and quick install command bar, and docs pass a simplification gate.
9. Close v0.2.0 as the first Public Alpha Release, with packages, docs,
   website, release notes, and public surface checks aligned.

## User Stories

1. As a developer discovering DiagramPilot, I want a clean public alpha release,
   so that I can install the CLI without building from source.
2. As an AI coding agent using DiagramPilot, I want compact installation and
   removal docs, so that I can add or remove DiagramPilot from a repository
   without guessing.
3. As a repository maintainer, I want `diagrampilot` and the runtime packages
   published together, so that package dependencies resolve coherently.
4. As a release maintainer, I want every implementation issue to close with a
   version bump, so that release history maps directly to the tracker.
5. As a release maintainer, I want pre-alpha versions tagged before public
   alpha, so that changes are traceable without implying stable public
   adoption.
6. As a release maintainer, I want a first clean pre-alpha npm publish under a
   non-default tag, so that package names are reserved before v0.2.0.
7. As a release maintainer, I want v0.2.0 published under `latest`, so that the
   first public alpha has the normal install path.
8. As a user or contributor, I want clear license terms, so that I know how the
   code, docs, schema, website source, and brand assets can be used.
9. As the product owner, I want DiagramPilot names and Brand Assets protected
   separately from the software license, so that normal software use is not
   restricted but official product identity remains controlled.
10. As a contributor, I want CI to run the same build, test, docs, demo, visual,
    and package checks expected by the release, so that release failures are
    caught before tagging.
11. As a release maintainer, I want package publishing to use trusted
    publishing rather than long-lived npm tokens where possible, so that future
    releases have lower credential risk.
12. As a maintainer, I want Internal Documentation and planning trackers to stay
    committed for now but excluded from public release surfaces, so that project
    history remains available without confusing users.
13. As a repository maintainer, I want package install and normal
    `diagrampilot init` to avoid copying vendor agent docs into my repository,
    so that my repo-owned `llms.txt` and docs stay under my control.
14. As an AI coding agent setting up a repository, I want
    `diagrampilot init --docs` when local DiagramPilot agent docs are
    intentionally desired, so that support-file writes are explicit.
15. As a developer landing on the website, I want an obvious quick install
    command and GitHub repository button, so that I can try or inspect
    DiagramPilot without hunting through docs.
16. As a release maintainer, I want a full public docs refinement and
    simplification pass before v0.2.0, so that the first alpha release is
    coherent rather than just feature-complete.

## Implementation Decisions

- Public Alpha Release is the next release-readiness track after Productization
  And Maintainability.
- Existing packages remain at the shared version until issue 55 adds the
  version bump workflow.
- Every issue in this track has an Issue Version.
- Issues 55 through 61 and issue 63 advance through `0.1.x` Pre-Alpha
  Releases.
- Issue 62 closes as `0.2.0`, the first Public Alpha Release.
- Do not use `0.2.0-alpha.N`; `0.2.0` itself is the first alpha milestone.
- Tag Issue Versions as `v0.1.x` and `v0.2.0`.
- Pre-alpha versions can be tagged before npm Package Publishing Readiness.
- Do not publish npm packages until package metadata, licensing, tarball checks,
  package name ownership, and CI checks are ready.
- After Package Publishing Readiness, publish the first clean pre-alpha package
  set under the `prealpha` dist-tag to reserve package names.
- Publish v0.2.0 under the `latest` dist-tag.
- The Public Package Set is `diagrampilot`, `@diagrampilot/core`,
  `@diagrampilot/icons`, `@diagrampilot/export-mermaid`,
  `@diagrampilot/export-d2`, and `@diagrampilot/render-svg`.
- The root workspace and `website` workspace remain private and unpublished.
- Use MIT as the Code License for DiagramPilot code, docs, website source,
  schema, packages, and Brand Assets.
- Use a Brand Use Policy rather than a noncommercial software license to protect
  official product identity.
- Add ADR `0008-public-alpha-release-and-package-publishing.md` to capture the
  release, package, license, and brand trade-off.
- Canonical DiagramPilot Brand Assets live outside the website, such as under
  `assets/brand/`.
- Website brand files are published copies or generated outputs, not the
  canonical brand source.
- Release-Ready Public Documentation includes installation and removal guidance.
- Installation guidance should support `npx diagrampilot ...`,
  `npm install --save-dev diagrampilot`, and
  `npm install --global diagrampilot`.
- Package-manager equivalents such as `pnpm dlx`, `pnpm add -D`, `yarn dlx`,
  and `bunx` are public only after they are verified.
- Removal guidance separates package uninstallation from repository cleanup.
- Repository cleanup removes `diagrampilot:init` managed sections from
  `llms.txt` and `docs/diagrampilot.md`; deleting those files is optional only
  when DiagramPilot created them and they contain no other project content.
- Package installation provides command availability only. It must not create
  `llms.txt`, `docs/diagrampilot.md`, or any other local agent docs in a
  consuming repository.
- Normal `diagrampilot init` should not create local agent docs by default.
- `diagrampilot init --docs` is the explicit path for creating or updating
  managed local agent docs such as `llms.txt` and `docs/diagrampilot.md`.
- Do not tell users to delete `*.dp.yaml`, SVGs, or exported artifacts by
  default, because adopted diagram files are project-owned.
- The Public Website landing page should expose a copyable quick install
  command bar for the canonical one-off command.
- The Public Website landing page should include a GitHub repository button in
  the CTA position that currently points at the Checkout Demo Project. The demo
  remains available through Public Documentation.
- A full Public Documentation, README, `llms.txt`, and website copy refinement
  and simplification pass is required before v0.2.0 closeout.
- Internal Documentation, ADRs, agent workflow docs, and `.scratch/` planning
  trackers may remain committed for now.
- Internal Documentation, ADRs, agent workflow docs, and `.scratch/` planning
  trackers must not be published through website docs routes, included in npm
  tarballs, linked from public release messaging, or treated as user-facing
  product docs.
- Generated visual reports and font cache files under `.scratch/` should not
  remain part of the public release surface unless a specific committed-review
  reason exists.
- The Public Website remains static and deployed separately through the Vercel
  path already documented for the website.
- Release Automation publishes packages; Vercel handles the Public Website
  production deployment path.

## Testing Decisions

- Version tooling tests should fail if public package versions, exact internal
  dependency versions, lockfile metadata, or DiagramPilot runtime version
  metadata drift.
- Demo SVGs must be refreshed when the DiagramPilot version changes because SVG
  provenance includes `diagramPilotVersion`.
- License tests should verify root and package license metadata and package
  tarball inclusion of license text.
- Package tarball checks should verify only expected publish files are included
  and Internal Documentation, `.scratch/`, generated reports, website build
  output, source-only planning files, and local caches are excluded.
- Brand asset checks should verify canonical assets exist and website favicon
  and brand routes resolve from the built site.
- Documentation tests should verify install and removal guidance includes
  supported paths and does not expose unverified package-manager equivalents.
- CLI tests should verify `diagrampilot init` does not write local agent docs by
  default and `diagrampilot init --docs` writes managed agent docs explicitly.
- Website tests or visual checks should verify the landing page exposes the
  GitHub repository button and quick install command bar.
- Documentation boundary tests should verify the final docs refinement keeps
  public release surfaces compact, current, and free of duplicated long-form
  install sources.
- CI tests should cover root build/tests, website build/tests, visual checks,
  schema drift, demo workflow checks, and npm package dry-run checks.
- Release workflow tests should verify version/tag consistency and use dry-run
  or guarded paths before a real publish.
- Final release validation should include npm package metadata, GitHub release
  notes, website route checks, public docs route checks, and public surface
  checks.

## Out Of Scope

- Production-ready v1.0 semantics.
- Hosted diagram workspace.
- Prompt-only diagram generation.
- Visual editor or drag-and-drop canvas.
- User accounts, login, billing, hosted project storage, or collaboration.
- MCP implementation.
- Project analyzers.
- DOT export.
- PNG rendering.
- Replacing core validation with JSON Schema validation.
- Removing committed Internal Documentation, ADRs, agent workflow docs, or all
  `.scratch/` planning trackers from the repository.
- Publishing the website through a package release workflow.
- Long-lived npm token publishing if trusted publishing is available.
- Enforcing noncommercial restrictions through the Code License.

## Issue Slices

- [55 Add release version tooling and Issue Version workflow](./issues/55-add-release-version-tooling-and-issue-version-workflow.md)
- [56 Add MIT license package metadata tarball checks and brand policy](./issues/56-add-mit-license-package-metadata-tarball-checks-and-brand-policy.md)
- [57 Commit and apply DiagramPilot Brand Assets](./issues/57-commit-and-apply-diagrampilot-brand-assets.md)
- [58 Add installation and removal public documentation](./issues/58-add-installation-and-removal-public-documentation.md)
- [59 Prove package publishing readiness and reserve npm names](./issues/59-prove-package-publishing-readiness-and-reserve-npm-names.md)
- [60 Add GitHub Actions branch and PR CI](./issues/60-add-github-actions-branch-and-pr-ci.md)
- [61 Add GitHub Actions release workflow](./issues/61-add-github-actions-release-workflow.md)
- [63 Finalize alpha behavior and public surface gate](./issues/63-finalize-alpha-behavior-and-public-surface-gate.md)
- [62 Close v0.2.0 Public Alpha Release](./issues/62-close-v0-2-0-public-alpha-release.md)

## Validation Plan

```bash
find .scratch -path '*/issues/[0-9][0-9]-*.md' -type f | sed -E 's#^.*issues/([0-9]+)-.*#\1 #' | sort -n | uniq -d
rg -n "Public Alpha Release|Issue Version|Public Package Set|Package Publishing Readiness|Brand Use Policy" CONTEXT.md .scratch/public-alpha-release docs/development/roadmap.md
rg -n "55-add-release-version-tooling|63-finalize-alpha-behavior|62-close-v0-2-0-public-alpha-release" .scratch/public-alpha-release/PRD.md
git diff --check
```
