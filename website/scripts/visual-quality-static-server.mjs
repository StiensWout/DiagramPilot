import { readFile, stat } from "node:fs/promises";
import http from "node:http";
import path from "node:path";

const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".md", "text/markdown; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".txt", "text/plain; charset=utf-8"],
  [".wasm", "application/wasm"],
  [".xml", "application/xml; charset=utf-8"],
]);

export async function startStaticServer(distRoot) {
  const server = http.createServer(async (request, response) => {
    try {
      const filePath = await resolveStaticPath(distRoot, request.url ?? "/");
      const body = await readFile(filePath);
      response.writeHead(200, {
        "content-type": contentTypes.get(path.extname(filePath)) ?? "application/octet-stream",
      });
      response.end(body);
    } catch {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("Not found");
    }
  });

  await new Promise((resolve, reject) => {
    server.on("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  return server;
}

function staticPathCandidates(distRoot, pathname) {
  return pathname.endsWith("/")
    ? [path.join(distRoot, pathname, "index.html")]
    : [
        path.join(distRoot, pathname),
        path.join(distRoot, pathname, "index.html"),
      ];
}

async function readableStaticFilePath(distRoot, candidate) {
  const resolved = path.resolve(candidate);

  if (!resolved.startsWith(distRoot + path.sep)) return undefined;

  try {
    const candidateStat = await stat(resolved);
    return candidateStat.isFile() ? resolved : undefined;
  } catch {
    return undefined;
  }
}

async function resolveStaticPath(distRoot, requestUrl) {
  const url = new URL(requestUrl, "http://127.0.0.1");
  const pathname = decodeURIComponent(url.pathname);

  for (const candidate of staticPathCandidates(distRoot, pathname)) {
    const readablePath = await readableStaticFilePath(distRoot, candidate);

    if (readablePath !== undefined) return readablePath;
  }

  throw new Error(`No static file for ${pathname}`);
}
