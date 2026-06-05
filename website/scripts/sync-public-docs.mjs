import {
  copyFile,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const websiteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(websiteRoot, "..");
const publicDocsRoot = path.join(repoRoot, "docs-public");
const starlightDocsRoot = path.join(websiteRoot, "src", "content", "docs");
const starlightPublicDocsRoot = path.join(starlightDocsRoot, "docs");
const websitePublicRoot = path.join(websiteRoot, "public");

async function listMarkdownFiles(root, current = root) {
  const entries = await readdir(current, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolutePath = path.join(current, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listMarkdownFiles(root, absolutePath)));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(path.relative(root, absolutePath));
    }
  }

  return files.sort();
}

function extractTitle(markdown, relativePath) {
  const h1 = markdown.match(/^#\s+(.+?)\s*$/m);
  if (h1) return h1[1];

  return path.basename(relativePath, ".md").replaceAll("-", " ");
}

function toStarlightMarkdown(markdown, relativePath) {
  if (markdown.startsWith("---\n")) return markdown;

  const title = extractTitle(markdown, relativePath);
  return `---\ntitle: ${JSON.stringify(title)}\n---\n\n${markdown}`;
}

async function syncPublicDocs() {
  const publicTopLevelEntries = await readdir(publicDocsRoot, { withFileTypes: true });

  await Promise.all(
    publicTopLevelEntries
      .filter((entry) => entry.isDirectory())
      .map((entry) =>
        rm(path.join(starlightDocsRoot, entry.name), {
          force: true,
          recursive: true,
        }),
      ),
  );
  await rm(starlightPublicDocsRoot, { force: true, recursive: true });

  for (const relativePath of await listMarkdownFiles(publicDocsRoot)) {
    const sourcePath = path.join(publicDocsRoot, relativePath);
    const targetPath = path.join(starlightPublicDocsRoot, relativePath);
    const sourceMarkdown = await readFile(sourcePath, "utf8");

    await mkdir(path.dirname(targetPath), { recursive: true });
    await writeFile(targetPath, toStarlightMarkdown(sourceMarkdown, relativePath));
  }
}

async function syncStaticPublicFiles() {
  await mkdir(path.join(websitePublicRoot, "schema"), { recursive: true });
  await mkdir(
    path.join(websitePublicRoot, "demo-projects", "checkout", "docs"),
    { recursive: true },
  );
  await copyFile(
    path.join(repoRoot, "llms.txt"),
    path.join(websitePublicRoot, "llms.txt"),
  );
  await copyFile(
    path.join(repoRoot, "schema", "diagramspec-v1.schema.json"),
    path.join(websitePublicRoot, "schema", "diagramspec-v1.schema.json"),
  );
  await copyFile(
    path.join(repoRoot, "demo-projects", "checkout", "docs", "architecture.svg"),
    path.join(
      websitePublicRoot,
      "demo-projects",
      "checkout",
      "docs",
      "architecture.svg",
    ),
  );
}

await syncPublicDocs();
await syncStaticPublicFiles();
