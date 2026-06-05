import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

export default defineConfig({
  site: "https://diagrampilot.com",
  output: "static",
  integrations: [
    starlight({
      title: "DiagramPilot",
      favicon: "/brand/diagrampilot-mark.svg",
    }),
  ],
});
