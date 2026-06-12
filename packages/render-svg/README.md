# @diagrampilot/render-svg

SVG rendering adapter for validated DiagramSpec data.

Most users should call the CLI:

```bash
diagrampilot render <path> --out <artifact.svg>
diagrampilot render <path> --view <view-id> --out <artifact.svg>
diagrampilot render <path> --format png --out <artifact.png>
```

SVG remains the default render format. PNG rendering rasterizes the SVG render
path so SVG and PNG stay visually aligned.

Configured SVG outputs support fixed profiles from repo workflow configuration.
Use `profile: overview` for dense review artifacts that should preserve
topology while suppressing edge labels.

Public documentation:

- https://diagrampilot.com/docs/agents/quickstart.md
- https://diagrampilot.com/docs/agents/spec.md
