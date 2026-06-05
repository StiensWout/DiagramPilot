import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

export const prerender = true;

const publicDocsRoot = path.resolve(process.cwd(), "..", "docs-public");

async function listMarkdownFiles(root: string, current = root): Promise<string[]> {
  const entries = await readdir(current, { withFileTypes: true });
  const files: string[] = [];

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
