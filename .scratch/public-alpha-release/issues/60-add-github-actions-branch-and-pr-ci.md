Status: ready-for-agent
Issue Version: 0.1.7

# Add GitHub Actions branch and PR CI

## Parent

- [PRD](../PRD.md)

## What to build

Add GitHub Actions CI that validates branch and pull request changes with the
same checks expected before release.

## Acceptance criteria

- [ ] A GitHub Actions workflow runs on pull requests and relevant branch
      pushes.
- [ ] CI uses the repository's required Node and npm versions or a documented
      compatible setup.
- [ ] CI runs `npm ci`.
- [ ] CI runs the root build and test suite.
- [ ] CI runs website build and website tests.
- [ ] CI runs website visual quality checks in a mode suitable for GitHub-hosted
      runners.
- [ ] CI verifies schema generation drift.
- [ ] CI verifies the checkout demo workflow, including `diagrampilot check`.
- [ ] CI runs package dry-run or package-readiness checks for the Public Package
      Set.
- [ ] CI verifies public/internal documentation boundaries still hold.
- [ ] CI does not require Vercel credentials or npm publish credentials.
- [ ] Internal Documentation and `.scratch/` may remain committed, but CI proves
      they are not published through website docs routes or package tarballs.

## Blocked by

- [59 Prove package publishing readiness and reserve npm names](./59-prove-package-publishing-readiness-and-reserve-npm-names.md)

## Validation plan

```bash
npm ci
npm run build
npm test
npm --workspace website run build
npm --workspace website run test
npm --workspace website run check:visual
git diff --check
```

## Implementation notes

- Fill in after implementation.
