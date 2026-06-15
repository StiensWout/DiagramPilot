import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

export default defineConfig({
  site: "https://diagrampilot.com",
  output: "static",
  integrations: [
    starlight({
      title: "DiagramPilot",
      customCss: ["/src/styles/docs.css"],
      favicon: "/brand/diagrampilot-mark.svg",
      sidebar: [
        {
          label: "Documentation",
          items: [
            { label: "Public Documentation", slug: "docs" },
            { label: "Quickstart", slug: "docs/agents/quickstart" },
            { label: "Installation", slug: "docs/agents/installation" },
            { label: "Agent Workflow", slug: "docs/agents/agent-workflow" },
            { label: "Examples", slug: "docs/agents/examples" },
            { label: "DiagramSpec", slug: "docs/agents/spec" },
            { label: "Error Repair", slug: "docs/agents/error-repair" },
            { label: "MCP", slug: "docs/agents/mcp" },
            { label: "Prompting", slug: "docs/agents/prompting" },
            { label: "Icon Reference", slug: "docs/agents/icons" },
            { label: "Comparisons", slug: "docs/agents/comparisons" },
            { label: "Integrations", slug: "docs/agents/integrations" },
          ],
        },
      ],
    }),
  ],
});
