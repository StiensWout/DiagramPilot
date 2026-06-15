export const PUBLIC_PACKAGE_SET = [
  {
    name: "diagrampilot",
    repoPath: "packages/cli/package.json",
    directory: "packages/cli",
    bin: {
      diagrampilot: "dist/index.js",
    },
  },
  {
    name: "@diagrampilot/core",
    repoPath: "packages/core/package.json",
    directory: "packages/core",
  },
  {
    name: "@diagrampilot/icons",
    repoPath: "packages/icons/package.json",
    directory: "packages/icons",
  },
  {
    name: "@diagrampilot/export-mermaid",
    repoPath: "packages/export-mermaid/package.json",
    directory: "packages/export-mermaid",
  },
  {
    name: "@diagrampilot/export-d2",
    repoPath: "packages/export-d2/package.json",
    directory: "packages/export-d2",
  },
  {
    name: "@diagrampilot/export-dot",
    repoPath: "packages/export-dot/package.json",
    directory: "packages/export-dot",
  },
  {
    name: "@diagrampilot/mcp",
    repoPath: "packages/mcp/package.json",
    directory: "packages/mcp",
    bin: {
      "diagrampilot-mcp": "dist/index.js",
    },
  },
  {
    name: "@diagrampilot/render-svg",
    repoPath: "packages/render-svg/package.json",
    directory: "packages/render-svg",
  },
];

export const PUBLIC_PACKAGE_NAMES = PUBLIC_PACKAGE_SET.map(
  (packageRecord) => packageRecord.name,
);
