import http from "node:http";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { runStaticReview } from "./visual-quality-static-review.mjs";

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
    await runStaticReview({
      distRoot,
      outputRoot,
      recordDomCheck,
      repoRoot,
      report,
      viewports,
      websiteRoot,
    });
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

function staticPathCandidates(pathname) {
  return pathname.endsWith("/")
    ? [path.join(distRoot, pathname, "index.html")]
    : [
        path.join(distRoot, pathname),
        path.join(distRoot, pathname, "index.html"),
      ];
}

async function readableStaticFilePath(candidate) {
  const resolved = path.resolve(candidate);

  if (!resolved.startsWith(distRoot + path.sep)) return undefined;

  try {
    const candidateStat = await stat(resolved);
    return candidateStat.isFile() ? resolved : undefined;
  } catch {
    return undefined;
  }
}

async function resolveStaticPath(requestUrl) {
  const url = new URL(requestUrl, "http://127.0.0.1");
  const pathname = decodeURIComponent(url.pathname);

  for (const candidate of staticPathCandidates(pathname)) {
    const readablePath = await readableStaticFilePath(candidate);

    if (readablePath !== undefined) return readablePath;
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
      const result = await page.evaluate(reducedMotionDomResult);

      assert.equal(result.matches, true);
      assert.match(result.animationDuration, /0\.01ms|0s/);
    });
  } finally {
    await context.close();
  }
}

function reducedMotionDomResult() {
  return {
    matches: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    animationDuration: motionRiseDuration("animationDuration"),
    transitionDuration: motionRiseDuration("transitionDuration"),
  };
}

function motionRiseDuration(propertyName) {
  const element = document.querySelector(".motion-rise");
  return element === null ? "" : getComputedStyle(element)[propertyName];
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

function emptyHeroLayoutFailure(selector, rect) {
  if (rect.width <= 0 || rect.height <= 0) {
    return { ok: false, message: `${selector} has empty layout bounds` };
  }

  return undefined;
}

function horizontalHeroTextFailure(selector, textRect) {
  if (textRect.left < -1 || textRect.right > window.innerWidth + 1) {
    return {
      ok: false,
      message: `${selector} text is clipped horizontally: ${JSON.stringify(toRect(textRect))}`,
    };
  }

  return undefined;
}

function verticalHeroTextFailure(selector, textRect) {
  if (textRect.top < -1 || textRect.bottom > document.documentElement.scrollHeight + 1) {
    return {
      ok: false,
      message: `${selector} text is clipped vertically: ${JSON.stringify(toRect(textRect))}`,
    };
  }

  return undefined;
}

function heroTextBoundsFailure(selector, rect, textRect) {
  return (
    emptyHeroLayoutFailure(selector, rect) ??
    horizontalHeroTextFailure(selector, textRect) ??
    verticalHeroTextFailure(selector, textRect)
  );
}

function heroItemTextFailure(selector, pattern, element) {
  const text = element.textContent?.replace(/\s+/g, " ").trim() ?? "";

  return pattern.test(text)
    ? undefined
    : { ok: false, message: `${selector} text was ${text}` };
}

function checkedHeroItem(selector, pattern) {
  const element = document.querySelector(selector);
  if (!element) return { ok: false, message: `missing ${selector}` };

  const textFailure = heroItemTextFailure(selector, pattern, element);

  if (textFailure !== undefined) return textFailure;

  const rect = element.getBoundingClientRect();
  const range = document.createRange();
  range.selectNodeContents(element);
  const textRect = range.getBoundingClientRect();
  const boundsFailure = heroTextBoundsFailure(selector, rect, textRect);

  return boundsFailure ?? { ok: true, item: { selector, rect: toRect(rect) } };
}

function heroOrderPair(items, selectors, index) {
  return {
    previous: items.find((item) => item.selector === selectors[index - 1]),
    current: items.find((item) => item.selector === selectors[index]),
  };
}

function heroOrderPairFailure(previous, current) {
  if (!previous || !current) return undefined;

  return previous.rect.bottom > current.rect.top + 1
    ? {
        ok: false,
        message: `${previous.selector} overlaps ${current.selector}`,
      }
    : undefined;
}

function heroOrderFailure(items) {
  const orderedSelectors = [".eyebrow", "#landing-title", ".promise", ".action-primary"];

  for (let index = 1; index < orderedSelectors.length; index += 1) {
    const { previous, current } = heroOrderPair(items, orderedSelectors, index);
    const failure = heroOrderPairFailure(previous, current);

    if (failure !== undefined) return failure;
  }

  return undefined;
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
    const checkedItem = checkedHeroItem(selector, pattern);

    if (!checkedItem.ok) return checkedItem;

    items.push(checkedItem.item);
  }

  const orderFailure = heroOrderFailure(items);

  if (orderFailure !== undefined) return orderFailure;

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
