# D2 Is The Default MVP SVG Renderer

DiagramPilot's MVP `render` command uses one default local SVG rendering path,
with D2 as the initial renderer target. The DiagramPilot install includes the
rendering capability through a pinned, platform-specific renderer dependency,
so users do not need a separate manual D2 installation or a first-run download.
Mermaid and other formats remain export targets first, which keeps early render
behavior stable enough for code review while preserving interop with existing
diagram ecosystems.
