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
const brandAssetsRoot = path.join(repoRoot, "assets", "brand");

async function listMarkdownFiles(root, current = root) {
  const entries = await readDirectoryIfPresent(current);
  const files = [];

  for (const entry of entries) {
    files.push(...(await markdownFilesForEntry(root, current, entry)));
  }

  return files.sort();
}

async function readDirectoryIfPresent(current) {
  try {
    return await readdir(current, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

async function markdownFilesForEntry(root, current, entry) {
  const absolutePath = path.join(current, entry.name);

  if (entry.isDirectory()) return await listMarkdownFiles(root, absolutePath);
  if (entry.isFile() && entry.name.endsWith(".md")) {
    return [path.relative(root, absolutePath)];
  }

  return [];
}

async function removeLegacyPublicDocsDirs() {
  const publicTopLevelEntries = await readdir(publicDocsRoot, { withFileTypes: true });

  for (const entry of publicTopLevelEntries) {
    if (!entry.isDirectory()) continue;

    await rm(path.join(starlightDocsRoot, entry.name), {
      force: true,
      recursive: true,
    });
  }
}

function extractTitle(markdown, relativePath) {
  const h1 = markdown.match(/^#\s+(.+?)\s*$/m);
  if (h1) return h1[1];

  return path.basename(relativePath, ".md").replaceAll("-", " ");
}

function removeLeadingH1(markdown) {
  return markdown.replace(/^#\s+.+?\r?\n(?:\r?\n)?/u, "");
}

function toStarlightMarkdown(markdown, relativePath) {
  if (markdown.startsWith("---\n")) return markdown;

  const title = extractTitle(markdown, relativePath);
  return `---\ntitle: ${JSON.stringify(title)}\n---\n\n${removeLeadingH1(markdown)}`;
}

async function syncPublicDocs() {
  const sourceMarkdownFiles = await listMarkdownFiles(publicDocsRoot);
  const sourceMarkdownFileSet = new Set(sourceMarkdownFiles);

  await removeLegacyPublicDocsDirs();

  for (const relativePath of sourceMarkdownFiles) {
    const sourcePath = path.join(publicDocsRoot, relativePath);
    const targetPath = path.join(starlightPublicDocsRoot, relativePath);
    const sourceMarkdown = await readFile(sourcePath, "utf8");

    await mkdir(path.dirname(targetPath), { recursive: true });
    await writeFile(targetPath, toStarlightMarkdown(sourceMarkdown, relativePath));
  }

  for (const relativePath of await listMarkdownFiles(starlightPublicDocsRoot)) {
    if (sourceMarkdownFileSet.has(relativePath)) continue;

    await rm(path.join(starlightPublicDocsRoot, relativePath), { force: true });
  }
}

async function syncStaticPublicFiles() {
  await mkdir(path.join(websitePublicRoot, "brand"), { recursive: true });
  await mkdir(path.join(websitePublicRoot, "schema"), { recursive: true });
  await mkdir(
    path.join(websitePublicRoot, "demo-projects", "checkout", "docs"),
    { recursive: true },
  );
  for (const entry of await readdir(brandAssetsRoot, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".svg")) continue;

    await copyFile(
      path.join(brandAssetsRoot, entry.name),
      path.join(websitePublicRoot, "brand", entry.name),
    );
  }
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
