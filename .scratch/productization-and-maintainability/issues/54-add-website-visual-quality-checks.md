Status: ready-for-agent

# Add website visual quality checks

## Parent

- [PRD](../PRD.md)

## What to build

Add repeatable website visual quality checks for the redesigned landing page
and public docs routes. The checks should catch regressions that make the page
look broken, generic, inaccessible, or hard to use on common viewports.

## Acceptance criteria

- [ ] Desktop and mobile landing page screenshots are generated or reviewed
      from the built website.
- [ ] Checks cover at least small mobile, tablet or medium width, and desktop
      viewport sizes.
- [ ] Checks verify no horizontal scroll on mobile.
- [ ] Checks verify important hero and CTA text is present and not obviously
      clipped or overlapped.
- [ ] Checks verify meaningful visuals render and are nonblank.
- [ ] Checks verify focus states remain visible for primary links and buttons
      where practical.
- [ ] Checks verify motion respects `prefers-reduced-motion` where practical.
- [ ] Checks cover at least one public docs route in addition to the landing
      page.
- [ ] Screenshots or generated reports live under `.scratch/` and are not
      treated as source artifacts unless explicitly committed for a reason.

## Blocked by

- [53 Redesign public landing page with product storytelling](./53-redesign-public-landing-page-with-product-storytelling.md)

## Validation plan

```bash
npm --workspace website run build
npm --workspace website run test
npm test
```
