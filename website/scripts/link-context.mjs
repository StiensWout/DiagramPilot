import path from "node:path";

const SITE_ORIGIN = "https://diagrampilot.com";
const markdownLinkPattern = /(^|[^!])\[([^\]\n]+)\]\(([^)\s]+)([^)]*)\)/gu;

function splitLinkTarget(target) {
  const hashIndex = target.indexOf("#");
  const targetWithoutHash = hashIndex === -1 ? target : target.slice(0, hashIndex);
  const hash = hashIndex === -1 ? "" : target.slice(hashIndex);
  const queryIndex = targetWithoutHash.indexOf("?");

  if (queryIndex === -1) {
    return { hash, pathname: targetWithoutHash, query: "" };
  }

  return {
    hash,
    pathname: targetWithoutHash.slice(0, queryIndex),
    query: targetWithoutHash.slice(queryIndex),
  };
}

function isExternalTarget(target) {
  return /^[a-z][a-z0-9+.-]*:/iu.test(target) || target.startsWith("//");
}

function canRewriteDocsTarget(target) {
  return !isExternalTarget(target) && !target.startsWith("#") && !target.startsWith("/");
}

function resolveDocsRelativePath(pathname, sourceRelativePath) {
  const docsRelativePath = path.posix.normalize(
    path.posix.join(path.posix.dirname(sourceRelativePath), pathname),
  );

  return docsRelativePath.startsWith("../") ? undefined : docsRelativePath;
}

function resolveMarkdownDocsTarget(target, sourceRelativePath) {
  if (!canRewriteDocsTarget(target)) return target;

  const { hash, pathname, query } = splitLinkTarget(target);
  if (!pathname.endsWith(".md")) return target;

  const docsRelativePath = resolveDocsRelativePath(pathname, sourceRelativePath);
  return docsRelativePath ? { docsRelativePath, hash, query } : target;
}

function hostedDocsTarget(target, sourceRelativePath) {
  const resolved = resolveMarkdownDocsTarget(target, sourceRelativePath);
  return typeof resolved === "string"
    ? resolved
    : `${SITE_ORIGIN}/docs/${resolved.docsRelativePath}${resolved.query}${resolved.hash}`;
}

function renderedDocsTarget(target, sourceRelativePath) {
  const resolved = resolveMarkdownDocsTarget(target, sourceRelativePath);
  if (typeof resolved === "string") return resolved;

  const renderedPath = resolved.docsRelativePath.slice(0, -".md".length);
  const routePath = renderedPath === "index" ? "" : `${renderedPath}/`;
  return `/docs/${routePath}${resolved.query}${resolved.hash}`;
}

function replaceMarkdownLinks(markdown, resolveTarget) {
  return markdown.replace(
    markdownLinkPattern,
    (match, prefix, label, target, suffix) =>
      `${prefix}[${label}](${resolveTarget(target)}${suffix})`,
  );
}

export function toWebsiteLinkContext(markdown, sourceRelativePath) {
  return replaceMarkdownLinks(markdown, (target) =>
    hostedDocsTarget(target, sourceRelativePath),
  );
}

export function toRenderedWebsiteLinkContext(markdown, sourceRelativePath) {
  return replaceMarkdownLinks(markdown, (target) =>
    renderedDocsTarget(target, sourceRelativePath),
  );
}
