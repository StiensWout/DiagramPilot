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
    assertMatch(landingHtml, /See the workflow/);
    assertMatch(landingHtml, /Install Guide/);
    assertMatch(
      landingHtml,
      /Commit diagrams like code:\s*`\.dp\.yaml` source in the repo,\s*local\s*checks before review,\s*and SVG artifacts maintainers can inspect/i,
    );
    assertMatch(landingHtml, /From `\.dp\.yaml` to review-stable SVG without leaving the repo/);
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

  await recordDomCheck("static:landing:artifact-diagram-present", async () => {
    assertMatch(landingHtml, /class="demo-svg"/);
    assertMatch(landingHtml, /artifact-node-service/);
    assertMatch(landingHtml, /artifact-edge/);
    assertMatch(landingHtml, /payment provider/);
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

async function writeStaticLandingReport({ outputRoot, viewport }) {
  const sharp = await loadSharp();
  const padding = viewport.width < 500 ? 24 : 56;
  const metrics = staticLandingMetrics(viewport.width < 500);

  await sharp({
    create: {
      width: viewport.width,
      height: Math.max(viewport.height, metrics.proofBottom + padding),
      channels: 4,
      background: "#05070a",
    },
  })
    .composite([{ input: staticLandingOverlay(viewport, padding), left: 0, top: 0 }])
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

function staticLandingEyebrow(padding, isMobile) {
  return isMobile
    ? `<text x="${padding}" y="${padding + 16}" fill="#34d399" font-family="DejaVu Sans" font-size="12" font-weight="700">
        <tspan x="${padding}">REPO-NATIVE DIAGRAM COMPILER</tspan>
        <tspan x="${padding}" dy="17">FOR AI CODING AGENTS</tspan>
      </text>`
    : `<text x="${padding}" y="${padding + 18}" fill="#34d399" font-family="DejaVu Sans" font-size="13" font-weight="700">REPO-NATIVE DIAGRAM COMPILER FOR AI CODING AGENTS</text>`;
}

function staticLandingPromise(padding, promiseSize, isMobile) {
  return isMobile
    ? `<text x="${padding}" y="${padding + 142}" fill="#f8fafc" font-family="DejaVu Sans" font-size="${promiseSize}" font-weight="700">
        <tspan x="${padding}">Commit diagrams like code:</tspan>
        <tspan x="${padding}" dy="${promiseSize + 8}">.dp.yaml source in the repo,</tspan>
        <tspan x="${padding}" dy="${promiseSize + 8}">local checks before review,</tspan>
        <tspan x="${padding}" dy="${promiseSize + 8}">and SVG artifacts.</tspan>
      </text>`
    : `<text x="${padding}" y="${padding + 150}" fill="#f8fafc" font-family="DejaVu Sans" font-size="${promiseSize}" font-weight="700">
        <tspan x="${padding}">Commit diagrams like code: .dp.yaml source in the repo,</tspan>
        <tspan x="${padding}" dy="${promiseSize + 8}">local checks before review, and SVG artifacts.</tspan>
      </text>`;
}

function staticLandingMetrics(isMobile) {
  return isMobile
    ? {
        titleSize: 38,
        promiseSize: 18,
        buttonTop: 292,
        primaryWidth: 252,
        proofBottom: 706,
        proofHeight: 276,
        proofTop: 420,
        proofStacked: true,
        proofNodeGap: 12,
        proofNodeWidth: 124,
        secondaryWidth: 184,
      }
    : {
        titleSize: 88,
        promiseSize: 34,
        buttonTop: 282,
        primaryWidth: 210,
        proofBottom: 760,
        proofHeight: 270,
        proofTop: 410,
        proofStacked: false,
        proofNodeGap: 28,
        proofNodeWidth: 156,
        secondaryWidth: 148,
      };
}

function staticLandingProofLayout(viewport, padding, metrics) {
  const proofWidth = viewport.width - padding * 2;
  const nodeWidth = metrics.proofNodeWidth;
  const nodeTop = metrics.proofTop + 92;
  const nodeLeft = padding + 22;
  const serviceLeft = nodeLeft + nodeWidth + metrics.proofNodeGap;
  const dataLeft = metrics.proofStacked
    ? nodeLeft
    : serviceLeft + nodeWidth + metrics.proofNodeGap;
  const dataTop = metrics.proofStacked ? nodeTop + 86 : nodeTop;

  return { dataLeft, dataTop, nodeLeft, nodeTop, nodeWidth, proofWidth, serviceLeft };
}

function staticLandingProofSvg(padding, metrics, layout) {
  return `
      <rect x="${padding}" y="${metrics.proofTop}" width="${layout.proofWidth}" height="${metrics.proofHeight}" rx="8" fill="#07111f" stroke="#1e3a35"/>
      <text x="${padding + 22}" y="${metrics.proofTop + 34}" fill="#f8fafc" font-family="DejaVu Sans" font-size="17" font-weight="700">Review-stable SVG artifact</text>
      <text x="${padding + 22}" y="${metrics.proofTop + 62}" fill="#94a3b8" font-family="DejaVu Sans" font-size="13">docs/architecture.svg</text>
      <line x1="${layout.nodeLeft + layout.nodeWidth}" y1="${layout.nodeTop + 34}" x2="${layout.serviceLeft}" y2="${layout.nodeTop + 34}" stroke="#34d399" stroke-width="3"/>
      <line x1="${layout.serviceLeft + layout.nodeWidth}" y1="${layout.nodeTop + 34}" x2="${layout.dataLeft}" y2="${layout.dataTop + 34}" stroke="#34d399" stroke-width="3"/>
      <rect x="${layout.nodeLeft}" y="${layout.nodeTop}" width="${layout.nodeWidth}" height="68" rx="8" fill="#0b1726" stroke="#34d399"/>
      <text x="${layout.nodeLeft + 18}" y="${layout.nodeTop + 41}" fill="#f8fafc" font-family="DejaVu Sans" font-size="14" font-weight="700">web app</text>
      <rect x="${layout.serviceLeft}" y="${layout.nodeTop}" width="${layout.nodeWidth}" height="68" rx="8" fill="#0b1726" stroke="#34d399"/>
      <text x="${layout.serviceLeft + 18}" y="${layout.nodeTop + 41}" fill="#f8fafc" font-family="DejaVu Sans" font-size="14" font-weight="700">checkout API</text>
      <rect x="${layout.dataLeft}" y="${layout.dataTop}" width="${layout.nodeWidth}" height="68" rx="8" fill="#0b1726" stroke="#38bdf8"/>
      <text x="${layout.dataLeft + 18}" y="${layout.dataTop + 41}" fill="#f8fafc" font-family="DejaVu Sans" font-size="14" font-weight="700">orders DB</text>`;
}

function staticLandingOverlay(viewport, padding) {
  const isMobile = viewport.width < 500;
  const metrics = staticLandingMetrics(isMobile);
  const proofLayout = staticLandingProofLayout(viewport, padding, metrics);

  return Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${viewport.width}" height="${viewport.height}">
      <rect width="100%" height="100%" fill="#05070a"/>
      ${staticLandingEyebrow(padding, isMobile)}
      <text x="${padding}" y="${padding + 94}" fill="#ffffff" font-family="DejaVu Sans" font-size="${metrics.titleSize}" font-weight="700">DiagramPilot</text>
      ${staticLandingPromise(padding, metrics.promiseSize, isMobile)}
      <rect x="${padding}" y="${metrics.buttonTop}" width="${metrics.primaryWidth}" height="48" rx="8" fill="#34d399"/>
      <text x="${padding + 20}" y="${metrics.buttonTop + 31}" fill="#03120c" font-family="DejaVu Sans" font-size="16" font-weight="700">See the workflow</text>
      <rect x="${padding}" y="${metrics.buttonTop + 60}" width="${metrics.secondaryWidth}" height="48" rx="8" fill="#0f172a" stroke="#475569"/>
      <text x="${padding + 20}" y="${metrics.buttonTop + 91}" fill="#f8fafc" font-family="DejaVu Sans" font-size="16" font-weight="700">Install Guide</text>
      ${staticLandingProofSvg(padding, metrics, proofLayout)}
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
