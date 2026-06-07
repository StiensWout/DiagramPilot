import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

let sharpModule;

export async function runStaticReview({
  distRoot,
  outputRoot,
  recordDomCheck,
  repoRoot,
  report,
  viewports,
  websiteRoot,
}) {
  await configureReportFonts({ outputRoot, repoRoot });
  const sharp = await loadSharp();
  const landingHtml = await readFile(path.join(distRoot, "index.html"), "utf8");
  const docsHtml = await readFile(
    path.join(distRoot, "docs", "agents", "quickstart", "index.html"),
    "utf8",
  );
  const landingCss = await readFile(
    path.join(websiteRoot, "src", "styles", "landing.css"),
    "utf8",
  );

  await recordDomCheck("static:landing:important-text", async () => {
    assertMatch(landingHtml, /<h1[^>]*>\s*DiagramPilot\s*<\/h1>/);
    assertMatch(landingHtml, /Checkout Demo Project/);
    assertMatch(landingHtml, /Documentation/);
    assertMatch(
      landingHtml,
      /repository files an AI coding agent can safely change,\s*validate, and commit/i,
    );
  });

  await recordDomCheck("static:docs-quickstart:important-text", async () => {
    assertMatch(docsHtml, /Try DiagramPilot With The Checkout Demo Project/);
    assertMatch(docsHtml, /diagrampilot check/);
  });

  await recordDomCheck("static:landing:no-horizontal-scroll-css", async () => {
    assertMatch(landingCss, /body\.landing-page\s*{[^}]*overflow-x:\s*hidden;/s);
    assertMatch(landingCss, /main\s*{[^}]*overflow:\s*clip;/s);
  });

  await recordDomCheck("static:landing:focus-css", async () => {
    assertMatch(landingCss, /:focus-visible/);
  });

  await recordDomCheck("static:landing:reduced-motion-css", async () => {
    assertMatch(landingCss, /prefers-reduced-motion:\s*reduce/);
  });

  await recordDomCheck("static:landing:top-font-not-clipped-css", async () => {
    assertNoMatch(landingCss, /letter-spacing:\s*-/);
    assertNoMatch(landingCss, /h1\s*{[^}]*font-size:[^;}]*vw/s);
    assertMatch(landingCss, /h1\s*{[^}]*line-height:\s*1;/s);
  });

  await recordDomCheck("static:landing:hero-visual-nonblank", async () => {
    const stats = await sharp(path.join(distRoot, "landing", "hero-workflow.png")).stats();
    const channelSpread = stats.channels.reduce(
      (largestSpread, channel) => Math.max(largestSpread, channel.max - channel.min),
      0,
    );
    const channelDeviation = stats.channels.reduce(
      (largestDeviation, channel) => Math.max(largestDeviation, channel.stdev),
      0,
    );

    assert(
      channelSpread >= 80 && channelDeviation >= 18,
      `hero-workflow.png looks blank: spread=${channelSpread}, stdev=${channelDeviation}`,
    );
  });

  for (const viewport of viewports) {
    await writeStaticLandingReport({ distRoot, outputRoot, viewport });
    await writeStaticDocsReport({ outputRoot, viewport });
    report.checks.push({
      name: `static:landing:${viewport.name}:report-png`,
      status: "passed",
    });
    report.checks.push({
      name: `static:docs-quickstart:${viewport.name}:report-png`,
      status: "passed",
    });
  }
}

async function writeStaticLandingReport({ distRoot, outputRoot, viewport }) {
  const sharp = await loadSharp();
  const padding = viewport.width < 500 ? 24 : 56;
  const heroWidth = Math.max(1, viewport.width - padding * 2);
  const heroTop = viewport.width < 500 ? 460 : 420;
  const heroImage = await sharp(path.join(distRoot, "landing", "hero-workflow.png"))
    .resize({ width: heroWidth, withoutEnlargement: true })
    .png()
    .toBuffer();
  const heroMeta = await sharp(heroImage).metadata();

  await sharp({
    create: {
      width: viewport.width,
      height: Math.max(viewport.height, heroTop + (heroMeta.height ?? 0) + padding),
      channels: 4,
      background: "#05070a",
    },
  })
    .composite([
      { input: staticLandingOverlay(viewport, padding), left: 0, top: 0 },
      { input: heroImage, left: padding, top: heroTop },
    ])
    .png()
    .toFile(path.join(outputRoot, `landing-${viewport.name}.png`));
}

async function writeStaticDocsReport({ outputRoot, viewport }) {
  const sharp = await loadSharp();

  await sharp({
    create: {
      width: viewport.width,
      height: viewport.height,
      channels: 4,
      background: "#ffffff",
    },
  })
    .composite([{ input: staticDocsOverlay(viewport), left: 0, top: 0 }])
    .png()
    .toFile(path.join(outputRoot, `docs-quickstart-${viewport.name}.png`));
}

function staticLandingOverlay(viewport, padding) {
  const isMobile = viewport.width < 500;
  const titleSize = isMobile ? 44 : 88;
  const promiseSize = isMobile ? 20 : 34;
  const buttonTop = isMobile ? 322 : 282;
  const primaryWidth = isMobile ? 252 : 210;
  const secondaryWidth = isMobile ? 184 : 148;
  const eyebrow = isMobile
    ? `<text x="${padding}" y="${padding + 16}" fill="#34d399" font-family="DejaVu Sans" font-size="12" font-weight="700">
        <tspan x="${padding}">REPO-NATIVE DIAGRAM COMPILER</tspan>
        <tspan x="${padding}" dy="17">FOR AI CODING AGENTS</tspan>
      </text>`
    : `<text x="${padding}" y="${padding + 18}" fill="#34d399" font-family="DejaVu Sans" font-size="13" font-weight="700">REPO-NATIVE DIAGRAM COMPILER FOR AI CODING AGENTS</text>`;
  const promise = isMobile
    ? `<text x="${padding}" y="${padding + 142}" fill="#f8fafc" font-family="DejaVu Sans" font-size="${promiseSize}" font-weight="700">
        <tspan x="${padding}">Diagrams are repository</tspan>
        <tspan x="${padding}" dy="${promiseSize + 8}">files an AI coding agent</tspan>
        <tspan x="${padding}" dy="${promiseSize + 8}">can safely change, validate,</tspan>
        <tspan x="${padding}" dy="${promiseSize + 8}">and commit.</tspan>
      </text>`
    : `<text x="${padding}" y="${padding + 150}" fill="#f8fafc" font-family="DejaVu Sans" font-size="${promiseSize}" font-weight="700">
        <tspan x="${padding}">Diagrams are repository files an AI coding agent</tspan>
        <tspan x="${padding}" dy="${promiseSize + 8}">can safely change, validate, and commit.</tspan>
      </text>`;

  return Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${viewport.width}" height="${viewport.height}">
      <rect width="100%" height="100%" fill="#05070a"/>
      ${eyebrow}
      <text x="${padding}" y="${padding + 94}" fill="#ffffff" font-family="DejaVu Sans" font-size="${titleSize}" font-weight="700">DiagramPilot</text>
      ${promise}
      <rect x="${padding}" y="${buttonTop}" width="${primaryWidth}" height="48" rx="8" fill="#34d399"/>
      <text x="${padding + 20}" y="${buttonTop + 31}" fill="#03120c" font-family="DejaVu Sans" font-size="16" font-weight="700">Checkout Demo Project</text>
      <rect x="${padding}" y="${buttonTop + 60}" width="${secondaryWidth}" height="48" rx="8" fill="#0f172a" stroke="#475569"/>
      <text x="${padding + 20}" y="${buttonTop + 91}" fill="#f8fafc" font-family="DejaVu Sans" font-size="16" font-weight="700">Documentation</text>
    </svg>`);
}

function staticDocsOverlay(viewport) {
  const padding = viewport.width < 500 ? 24 : 56;
  const titleSize = viewport.width < 500 ? 30 : 48;

  return Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${viewport.width}" height="${viewport.height}">
      <rect width="100%" height="100%" fill="#ffffff"/>
      <text x="${padding}" y="${padding + 28}" fill="#111827" font-family="DejaVu Sans" font-size="${titleSize}" font-weight="700">
        <tspan x="${padding}">Try DiagramPilot With The</tspan>
        <tspan x="${padding}" dy="${titleSize + 8}">Checkout Demo Project</tspan>
      </text>
      <rect x="${padding}" y="${padding + titleSize * 2 + 48}" width="${viewport.width - padding * 2}" height="92" rx="8" fill="#f8fafc" stroke="#d1d5db"/>
      <text x="${padding + 20}" y="${padding + titleSize * 2 + 104}" fill="#111827" font-family="DejaVu Sans" font-size="18">diagrampilot check</text>
    </svg>`);
}

async function configureReportFonts({ outputRoot, repoRoot }) {
  const fontConfigPath = path.join(outputRoot, "fonts.conf");
  const fontCachePath = path.join(outputRoot, "font-cache");
  const fontDirectory = path.join(repoRoot, "node_modules", "dejavu-fonts-ttf", "ttf");

  await mkdir(fontCachePath, { recursive: true });
  await writeFile(
    fontConfigPath,
    `<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig>
  <dir>${fontDirectory}</dir>
  <cachedir>${fontCachePath}</cachedir>
</fontconfig>
`,
  );

  process.env.FONTCONFIG_FILE = fontConfigPath;
}

async function loadSharp() {
  sharpModule ??= (await import("sharp")).default;
  return sharpModule;
}

function assert(value, message) {
  if (!value) throw new Error(message);
}

function assertMatch(value, pattern) {
  assert(pattern.test(value), `expected ${pattern} to match`);
}

function assertNoMatch(value, pattern) {
  assert(!pattern.test(value), `expected ${pattern} not to match`);
}
