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
    }),
  ],
});
