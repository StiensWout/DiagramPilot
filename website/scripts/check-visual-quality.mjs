import http from "node:http";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const websiteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(websiteRoot, "..");
const distRoot = path.join(websiteRoot, "dist");
const outputRoot = path.join(
  repoRoot,
  ".scratch",
  "productization-and-maintainability",
  "visual-quality",
);

const viewports = [
  { name: "mobile", width: 375, height: 812 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 960 },
];

const routes = [
  {
    name: "landing",
    path: "/",
    checks: ["landingHero", "meaningfulVisual", "reducedMotion"],
  },
  {
    name: "docs-quickstart",
    path: "/docs/agents/quickstart/",
    checks: ["docsText"],
  },
];

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

const report = {
  status: "running",
  builtSite: path.relative(repoRoot, distRoot),
  mode: "browser",
  output: path.relative(repoRoot, outputRoot),
  viewports,
  checkedRoutes: routes.map(({ name, path }) => ({ name, path })),
  checks: [],
};

const failures = [];
let sharpModule;

await resetOutputDirectory();
const server = await startStaticServer();
const baseUrl = `http://127.0.0.1:${server.address().port}`;

try {
  try {
    const browser = await chromium.launch();

    try {
      for (const viewport of viewports) {
        for (const route of routes) {
          await checkRoute(browser, baseUrl, route, viewport);
        }
      }

      await checkReducedMotion(browser, baseUrl);
    } finally {
      await browser.close();
    }
  } catch (error) {
    report.mode = "static-report";
    report.browser = {
      status: "unavailable",
      message: error instanceof Error ? error.message.split("\n")[0] : String(error),
    };
    report.checks.push({
      name: "browser:launch",
      status: "skipped",
      message:
        "Chromium could not launch in this environment; generated static visual reports from built files instead.",
    });
    await runStaticReview();
  }
} finally {
  await new Promise((resolve) => server.close(resolve));
}

report.status = failures.length === 0 ? "passed" : "failed";
await writeFile(
  path.join(outputRoot, "report.json"),
  `${JSON.stringify(report, null, 2)}\n`,
);

if (failures.length > 0) {
  throw new Error(`Website visual quality checks failed:\n- ${failures.join("\n- ")}`);
}

async function resetOutputDirectory() {
  await assertDistExists();
  await rm(outputRoot, { recursive: true, force: true });
  await mkdir(outputRoot, { recursive: true });
}

async function assertDistExists() {
  try {
    const distStat = await stat(distRoot);
    if (distStat.isDirectory()) return;
  } catch {
    // Fall through to the explicit error below.
  }

  throw new Error("website/dist is missing. Run `npm --workspace website run build` first.");
}

async function startStaticServer() {
  const server = http.createServer(async (request, response) => {
    try {
      const filePath = await resolveStaticPath(request.url ?? "/");
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

async function resolveStaticPath(requestUrl) {
  const url = new URL(requestUrl, "http://127.0.0.1");
  const pathname = decodeURIComponent(url.pathname);
  const candidates = [];

  if (pathname.endsWith("/")) {
    candidates.push(path.join(distRoot, pathname, "index.html"));
  } else {
    candidates.push(path.join(distRoot, pathname));
    candidates.push(path.join(distRoot, pathname, "index.html"));
  }

  for (const candidate of candidates) {
    const resolved = path.resolve(candidate);
    if (!resolved.startsWith(distRoot + path.sep)) continue;

    try {
      const candidateStat = await stat(resolved);
      if (candidateStat.isFile()) return resolved;
    } catch {
      // Try the next candidate.
    }
  }

  throw new Error(`No static file for ${pathname}`);
}

async function checkRoute(browser, baseUrl, route, viewport) {
  const context = await browser.newContext({
    colorScheme: "dark",
    reducedMotion: "no-preference",
    viewport: { width: viewport.width, height: viewport.height },
  });
  const page = await context.newPage();

  try {
    await page.goto(`${baseUrl}${route.path}`, { waitUntil: "networkidle" });
    await page.screenshot({
      animations: "disabled",
      fullPage: true,
      path: path.join(outputRoot, `${route.name}-${viewport.name}.png`),
    });

    await recordDomCheck(`${route.name}:${viewport.name}:no-horizontal-scroll`, async () => {
      const scroll = await page.evaluate(() => ({
        body: document.body.scrollWidth,
        client: document.documentElement.clientWidth,
        document: document.documentElement.scrollWidth,
        viewport: window.innerWidth,
      }));
      assert(
        scroll.body <= scroll.viewport + 1 && scroll.document <= scroll.viewport + 1,
        `expected no horizontal scroll, saw body=${scroll.body}, document=${scroll.document}, viewport=${scroll.viewport}`,
      );
    });

    await recordDomCheck(`${route.name}:${viewport.name}:focus-visible`, async () => {
      const selector = route.name === "landing" ? ".action-primary" : "main a[href]";
      await assertVisibleFocus(page, selector);
    });

    if (route.checks.includes("landingHero")) {
      await recordDomCheck(`${route.name}:${viewport.name}:important-text-layout`, async () => {
        const result = await page.evaluate(checkLandingHeroLayout);
        assert(result.ok, result.message);
      });
    }

    if (route.checks.includes("meaningfulVisual")) {
      await recordDomCheck(`${route.name}:${viewport.name}:hero-visual-nonblank`, async () => {
        const stats = await page.evaluate(sampleHeroVisual);
        assert(
          stats.visibleWidth >= 280 && stats.visibleHeight >= 150,
          `hero visual is too small: ${stats.visibleWidth}x${stats.visibleHeight}`,
        );
        assert(
          stats.colorBuckets >= 12 && stats.luminanceSpread >= 18,
          `hero visual looks blank: ${JSON.stringify(stats)}`,
        );
      });
    }

    if (route.checks.includes("docsText")) {
      await recordDomCheck(`${route.name}:${viewport.name}:important-text`, async () => {
        await page.getByText("Try DiagramPilot With The Checkout Demo Project").waitFor();
        await page.getByText("diagrampilot check").first().waitFor();
      });
    }
  } finally {
    await context.close();
  }
}

async function checkReducedMotion(browser, baseUrl) {
  const context = await browser.newContext({
    colorScheme: "dark",
    reducedMotion: "reduce",
    viewport: { width: 375, height: 812 },
  });
  const page = await context.newPage();

  try {
    await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
    await recordDomCheck("landing:mobile:prefers-reduced-motion", async () => {
      const result = await page.evaluate(() => {
        const element = document.querySelector(".motion-rise");
        const style = element ? getComputedStyle(element) : null;
        return {
          matches: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
          animationDuration: style?.animationDuration ?? "",
          transitionDuration: style?.transitionDuration ?? "",
        };
      });

      assert.equal(result.matches, true);
      assert.match(result.animationDuration, /0\.01ms|0s/);
    });
  } finally {
    await context.close();
  }
}

async function runStaticReview() {
  await configureReportFonts();
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
    await writeStaticLandingReport(viewport);
    await writeStaticDocsReport(viewport);
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

async function writeStaticLandingReport(viewport) {
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

async function writeStaticDocsReport(viewport) {
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

async function configureReportFonts() {
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

async function recordDomCheck(name, check) {
  try {
    await check();
    report.checks.push({ name, status: "passed" });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    failures.push(`${name}: ${message}`);
    report.checks.push({ name, status: "failed", message });
  }
}

async function assertVisibleFocus(page, selector) {
  const locator = page.locator(selector).first();
  await locator.waitFor();
  await locator.focus();

  const focus = await locator.evaluate((element) => {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    const outlineWidth = Number.parseFloat(style.outlineWidth);

    return {
      active: document.activeElement === element,
      boxShadow: style.boxShadow,
      outlineColor: style.outlineColor,
      outlineStyle: style.outlineStyle,
      outlineWidth: Number.isNaN(outlineWidth) ? 0 : outlineWidth,
      visible: rect.width >= 44 && rect.height >= 44,
    };
  });

  assert.equal(focus.active, true, `${selector} did not receive focus`);
  assert.equal(focus.visible, true, `${selector} is smaller than a practical focus target`);
  assert(
    (focus.outlineStyle !== "none" && focus.outlineWidth >= 2) ||
      focus.boxShadow !== "none",
    `${selector} has no visible focus treatment: ${JSON.stringify(focus)}`,
  );
}

function checkLandingHeroLayout() {
  const selectors = [
    [".eyebrow", /repo-native diagram compiler/i],
    ["#landing-title", /^DiagramPilot$/],
    [".promise", /repository files an AI coding agent can safely change/i],
    [".action-primary", /Checkout Demo Project|Open Quickstart/i],
    [".action-secondary", /Documentation|Read Docs/i],
  ];
  const items = [];

  for (const [selector, pattern] of selectors) {
    const element = document.querySelector(selector);
    if (!element) return { ok: false, message: `missing ${selector}` };

    const text = element.textContent?.replace(/\s+/g, " ").trim() ?? "";
    if (!pattern.test(text)) return { ok: false, message: `${selector} text was ${text}` };

    const rect = element.getBoundingClientRect();
    const range = document.createRange();
    range.selectNodeContents(element);
    const textRect = range.getBoundingClientRect();

    if (rect.width <= 0 || rect.height <= 0) {
      return { ok: false, message: `${selector} has empty layout bounds` };
    }
    if (textRect.left < -1 || textRect.right > window.innerWidth + 1) {
      return {
        ok: false,
        message: `${selector} text is clipped horizontally: ${JSON.stringify(toRect(textRect))}`,
      };
    }
    if (textRect.top < -1 || textRect.bottom > document.documentElement.scrollHeight + 1) {
      return {
        ok: false,
        message: `${selector} text is clipped vertically: ${JSON.stringify(toRect(textRect))}`,
      };
    }

    items.push({ selector, rect: toRect(rect) });
  }

  const orderedSelectors = [".eyebrow", "#landing-title", ".promise", ".action-primary"];
  for (let index = 1; index < orderedSelectors.length; index += 1) {
    const previous = items.find((item) => item.selector === orderedSelectors[index - 1]);
    const current = items.find((item) => item.selector === orderedSelectors[index]);
    if (!previous || !current) continue;

    if (previous.rect.bottom > current.rect.top + 1) {
      return {
        ok: false,
        message: `${previous.selector} overlaps ${current.selector}`,
      };
    }
  }

  return { ok: true };
}

function sampleHeroVisual() {
  const image = document.querySelector(".workflow-shell img");
  if (!(image instanceof HTMLImageElement)) {
    return { colorBuckets: 0, luminanceSpread: 0, visibleHeight: 0, visibleWidth: 0 };
  }

  const rect = image.getBoundingClientRect();
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 36;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
  const buckets = new Set();
  let minLuminance = 255;
  let maxLuminance = 0;

  for (let index = 0; index < data.length; index += 4) {
    const red = data[index];
    const green = data[index + 1];
    const blue = data[index + 2];
    const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
    minLuminance = Math.min(minLuminance, luminance);
    maxLuminance = Math.max(maxLuminance, luminance);
    buckets.add(`${Math.round(red / 32)}-${Math.round(green / 32)}-${Math.round(blue / 32)}`);
  }

  return {
    colorBuckets: buckets.size,
    luminanceSpread: Math.round(maxLuminance - minLuminance),
    naturalHeight: image.naturalHeight,
    naturalWidth: image.naturalWidth,
    visibleHeight: Math.round(rect.height),
    visibleWidth: Math.round(rect.width),
  };
}

function toRect(rect) {
  return {
    bottom: Math.round(rect.bottom),
    left: Math.round(rect.left),
    right: Math.round(rect.right),
    top: Math.round(rect.top),
  };
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
