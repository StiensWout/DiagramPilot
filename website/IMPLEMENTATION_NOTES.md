# Website Implementation Notes

The public landing page uses TanStack Router and Vite React while Astro
Starlight remains responsible for generated public docs routes and Markdown
publishing. The split build keeps `docs-public` canonical and lets the landing
page hydrate from static HTML.

If DiagramPilot adds accounts, paid tiers, or app functionality, revisit this
choice with a future framework reassessment before expanding the public website
into an application surface.
