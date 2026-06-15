import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  appType: "spa",
  publicDir: "public",
  plugins: [react()],
  build: {
    emptyOutDir: false,
    outDir: "dist",
  },
  ssr: {
    noExternal: ["@tanstack/react-router", "@vercel/analytics"],
  },
});
