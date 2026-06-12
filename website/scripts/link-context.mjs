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

function hostedDocsTarget(target, sourceRelativePath) {
  if (!canRewriteDocsTarget(target)) return target;

  const { hash, pathname, query } = splitLinkTarget(target);
  if (!pathname.endsWith(".md")) return target;

  const docsRelativePath = resolveDocsRelativePath(pathname, sourceRelativePath);
  return docsRelativePath
    ? `${SITE_ORIGIN}/docs/${docsRelativePath}${query}${hash}`
    : target;
}

export function toWebsiteLinkContext(markdown, sourceRelativePath) {
  return markdown.replace(
    markdownLinkPattern,
    (match, prefix, label, target, suffix) =>
      `${prefix}[${label}](${hostedDocsTarget(target, sourceRelativePath)}${suffix})`,
  );
}
