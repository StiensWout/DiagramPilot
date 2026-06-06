Status: ready-for-agent
Issue Version: 0.1.8

# Add GitHub Actions release workflow

## Parent

- [PRD](../PRD.md)

## What to build

Add release automation for future DiagramPilot releases. The release workflow
should validate the release, verify publish/version consistency, publish
pre-merge builds to `nightly`, and publish merged `main` release builds to
`latest` through npm trusted publishing where available.

## Acceptance criteria

- [ ] A GitHub Actions release workflow runs for trusted pre-merge branches or
      pull requests, merges to `main`, and manual dry-run validation with clear
      guardrails.
- [ ] The workflow reruns the full release validation suite before publishing.
- [ ] The workflow verifies the publish version matches the shared Issue
      Version, and any tag-triggered path must match the tag name.
- [ ] The workflow verifies all Public Package Set manifests and exact internal
      dependencies match the publish version.
- [ ] The workflow verifies generated or version-sensitive artifacts such as
      demo SVG provenance are current.
- [ ] The workflow publishes all Public Package Set packages together.
- [ ] The workflow uses npm trusted publishing/OIDC where available instead of
      long-lived npm tokens.
- [ ] Pre-merge publishing uses the `nightly` dist-tag.
- [ ] Nightly publishing uses unique npm prerelease versions derived from the
      shared Issue Version plus CI identity, so a nightly publish cannot consume
      the clean version intended for `latest`.
- [ ] Merges to `main` publish the clean shared version under the `latest`
      dist-tag.
- [ ] Real `nightly` or `latest` publishing cannot run from forks; fork pull
      requests use dry-run validation only.
- [ ] `latest` publishing cannot run from pull requests, issue branches, or
      manual dry-run paths.
- [ ] The workflow does not deploy the Public Website directly; Vercel remains
      the website production deployment path.
- [ ] Release workflow docs explain any required npm trusted publisher setup for
      each package.
- [ ] A dry-run or guarded validation path exists so release workflow behavior
      can be reviewed without accidentally publishing.
- [ ] Workflow tests cover `nightly`/`latest` routing, version derivation, and
      credential boundaries.

## Blocked by

- [60 Add GitHub Actions branch and PR CI](./60-add-github-actions-branch-and-pr-ci.md)

## Validation plan

```bash
npm run build
npm test
npm --workspace website run build
npm --workspace website run test
npm --workspace website run check:visual
rg -n "nightly|latest|trusted publishing|unique npm prerelease|prerelease" .scratch/public-alpha-release/PRD.md .scratch/public-alpha-release/issues/61-add-github-actions-release-workflow.md
git diff --check
```

## Implementation notes

- npm trusted publishing requires package-side trusted publisher configuration
  outside the repository workflow file.
- Planning update: release automation should publish pre-merge builds under
  `nightly` and merged `main` release builds under `latest`; do not reuse the
  clean shared version for nightly packages because npm package versions are
  immutable.
