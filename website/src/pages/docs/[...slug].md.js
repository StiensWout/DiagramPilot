import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { toWebsiteLinkContext } from "../../../scripts/link-context.mjs";

export const prerender = true;

const publicDocsRoot = path.resolve(process.cwd(), "..", "docs-public");

async function listMarkdownFiles(root, current = root) {
  const entries = await readdir(current, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => listMarkdownEntryFiles(root, current, entry)),
  );

  return files.flat().sort();
}

async function listMarkdownEntryFiles(root, current, entry) {
  const absolutePath = path.join(current, entry.name);

  if (entry.isDirectory()) {
    return listMarkdownFiles(root, absolutePath);
  }

  return isMarkdownFileEntry(entry) ? [path.relative(root, absolutePath)] : [];
}

function isMarkdownFileEntry(entry) {
  return entry.isFile() && entry.name.endsWith(".md");
}

export async function getStaticPaths() {
  return (await listMarkdownFiles(publicDocsRoot)).map((relativePath) => ({
    params: { slug: relativePath.slice(0, -".md".length) },
    props: {
      relativePath,
      sourcePath: path.join(publicDocsRoot, relativePath),
    },
  }));
}

export async function GET({ props }) {
  const markdown = await readFile(props.sourcePath, "utf8");

  return new Response(toWebsiteLinkContext(markdown, props.relativePath), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
    },
  });
}
