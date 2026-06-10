import type { Dirent } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

export const prerender = true;

const publicDocsRoot = path.resolve(process.cwd(), "..", "docs-public");

async function listMarkdownFiles(root: string, current = root): Promise<string[]> {
  const entries = await readdir(current, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => listMarkdownEntryFiles(root, current, entry)),
  );

  return files.flat().sort();
}

async function listMarkdownEntryFiles(
  root: string,
  current: string,
  entry: Dirent<string>,
): Promise<string[]> {
  const absolutePath = path.join(current, entry.name);

  if (entry.isDirectory()) {
    return listMarkdownFiles(root, absolutePath);
  }

  return isMarkdownFileEntry(entry)
    ? [path.relative(root, absolutePath)]
    : [];
}

function isMarkdownFileEntry(entry: Dirent<string>): boolean {
  return entry.isFile() && entry.name.endsWith(".md");
}

export async function getStaticPaths() {
  return (await listMarkdownFiles(publicDocsRoot)).map((relativePath) => ({
    params: { slug: relativePath.slice(0, -".md".length) },
    props: { sourcePath: path.join(publicDocsRoot, relativePath) },
  }));
}

export async function GET({ props }: { props: { sourcePath: string } }) {
  const markdown = await readFile(props.sourcePath, "utf8");

  return new Response(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
    },
  });
}
