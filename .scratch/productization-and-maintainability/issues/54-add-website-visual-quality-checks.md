Status: completed

# Add website visual quality checks

## Parent

- [PRD](../PRD.md)

## What to build

Add repeatable website visual quality checks for the redesigned landing page
and public docs routes. The checks should catch regressions that make the page
look broken, generic, inaccessible, or hard to use on common viewports.

## Acceptance criteria

- [x] Desktop and mobile landing page screenshots are generated or reviewed
      from the built website.
- [x] Checks cover at least small mobile, tablet or medium width, and desktop
      viewport sizes.
- [x] Checks verify no horizontal scroll on mobile.
- [x] Checks verify important hero and CTA text is present and not obviously
      clipped or overlapped.
- [x] Checks verify meaningful visuals render and are nonblank.
- [x] Checks verify focus states remain visible for primary links and buttons
      where practical.
- [x] Checks verify motion respects `prefers-reduced-motion` where practical.
- [x] Checks cover at least one public docs route in addition to the landing
      page.
- [x] Screenshots or generated reports live under `.scratch/` and are not
      treated as source artifacts unless explicitly committed for a reason.

## Blocked by

- [53 Redesign public landing page with product storytelling](./53-redesign-public-landing-page-with-product-storytelling.md)

## Validation plan

```bash
npm --workspace website run build
npm --workspace website run check:visual
npm --workspace website run test
npm test
git diff --check
```

## Implementation notes

- Added `npm --workspace website run check:visual`, backed by
  `website/scripts/check-visual-quality.mjs`.
- The checker serves `website/dist` locally and uses Playwright/Chromium for
  browser geometry checks when Chromium runtime libraries are available.
- The browser path checks landing and quickstart docs routes at mobile, tablet,
  and desktop viewports; writes route screenshots under
  `.scratch/productization-and-maintainability/visual-quality/`; checks mobile
  horizontal scroll, important landing text layout, nonblank hero imagery,
  visible focus treatment, and `prefers-reduced-motion`.
- Minimal containers without Chromium runtime libraries use a clearly marked
  static report mode. That mode validates built HTML/CSS, samples the real hero
  bitmap with `sharp`, and writes PNG review sheets plus `report.json` under
  `.scratch/productization-and-maintainability/visual-quality/`.
- Added `test/website-visual-quality.test.mjs` so
  `npm --workspace website run test` covers the visual quality interface,
  checked routes, required viewport set, report categories, and generated
  landing report images.
- Adjusted the Public Landing Page H1 to use breakpoint-based rem sizes and
  `line-height: 1` instead of a large viewport-clamped minimum, preventing the
  top `DiagramPilot` font from clipping or overlapping on narrow screens.

## Validation results

```bash
node --test --test-concurrency=1 test/website-visual-quality.test.mjs
npm --workspace website run check:visual
npm --workspace website run test
npm --workspace website run build
npm test
git diff --check
```

- `node --test --test-concurrency=1 test/website-visual-quality.test.mjs`
  passed.
- `npm --workspace website run check:visual` passed.
- `npm --workspace website run test` passed with 14 tests.
- `npm --workspace website run build` passed.
- `npm test` passed with 133 tests.
- `git diff --check` passed.
- Local visual quality report generated at
  `.scratch/productization-and-maintainability/visual-quality/report.json`.
- Local report mode was `static-report` because Chromium could not launch in
  this container without OS runtime libraries; the Playwright browser path
  remains implemented for environments with those libraries available.
