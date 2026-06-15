import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const websiteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distRoot = path.join(websiteRoot, "dist");
const indexPath = path.join(distRoot, "index.html");
const ssrEntryPath = path.join(distRoot, ".vite-ssr", "ssr.js");
const appHtmlPlaceholder = "<!--app-html-->";

const [{ renderLandingPage }, template] = await Promise.all([
  import(pathToFileURL(ssrEntryPath)),
  readFile(indexPath, "utf8"),
]);

if (!template.includes(appHtmlPlaceholder)) {
  throw new Error("Vite landing template is missing the app HTML placeholder.");
}

await writeFile(indexPath, template.replace(appHtmlPlaceholder, renderLandingPage()));
await rm(path.join(distRoot, ".vite-ssr"), { force: true, recursive: true });
