Status: ready-for-agent
Issue Version: 0.1.8

# Add GitHub Actions release workflow

## Parent

- [PRD](../PRD.md)

## What to build

Add release automation for future DiagramPilot releases. The release workflow
should validate the release, verify tag/version consistency, and publish the
Public Package Set through npm trusted publishing where available.

## Acceptance criteria

- [ ] A GitHub Actions release workflow runs manually, from version tags, or
      both, with clear guardrails.
- [ ] The workflow reruns the full release validation suite before publishing.
- [ ] The workflow verifies the Git tag matches the shared Issue Version.
- [ ] The workflow verifies all Public Package Set manifests and exact internal
      dependencies match the tag version.
- [ ] The workflow verifies generated or version-sensitive artifacts such as
      demo SVG provenance are current.
- [ ] The workflow publishes all Public Package Set packages together.
- [ ] The workflow uses npm trusted publishing/OIDC where available instead of
      long-lived npm tokens.
- [ ] The workflow can publish pre-alpha versions under `prealpha`.
- [ ] The workflow can publish v0.2.0 and later public releases under `latest`.
- [ ] The workflow does not deploy the Public Website directly; Vercel remains
      the website production deployment path.
- [ ] Release workflow docs explain any required npm trusted publisher setup for
      each package.
- [ ] A dry-run or guarded validation path exists so release workflow behavior
      can be reviewed without accidentally publishing.

## Blocked by

- [60 Add GitHub Actions branch and PR CI](./60-add-github-actions-branch-and-pr-ci.md)

## Validation plan

```bash
npm run build
npm test
npm --workspace website run build
npm --workspace website run test
npm --workspace website run check:visual
git diff --check
```

## Implementation notes

- npm trusted publishing requires package-side trusted publisher configuration
  outside the repository workflow file.
