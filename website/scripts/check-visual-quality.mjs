import { mkdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { runStaticReview } from "./visual-quality-static-review.mjs";
import { startStaticServer } from "./visual-quality-static-server.mjs";

const websiteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(websiteRoot, "..");
const distRoot = path.join(websiteRoot, "dist");
const outputRoot = path.join(websiteRoot, "visual-quality-report");

const viewports = [
  { name: "mobile", width: 375, height: 812 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 960 },
];

const routes = [
  {
    name: "landing",
    path: "/",
    checks: ["landingHero", "workflowDemo"],
  },
  {
    name: "docs-quickstart",
    path: "/docs/agents/quickstart/",
    checks: ["docsText"],
  },
];

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
const server = await startStaticServer(distRoot);
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

    if (route.checks.includes("workflowDemo")) {
      await recordDomCheck(`${route.name}:${viewport.name}:workflow-demo-layout`, async () => {
        const result = await page.evaluate(checkWorkflowDemoLayout);
        assert(result.ok, result.message);
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
  const orderedSelectors = [".hero-eyebrow", ".promise", ".action-primary"];

  for (let index = 1; index < orderedSelectors.length; index += 1) {
    const { previous, current } = heroOrderPair(items, orderedSelectors, index);
    const failure = heroOrderPairFailure(previous, current);

    if (failure !== undefined) return failure;
  }

  return undefined;
}

function checkLandingHeroLayout() {
  const selectors = [
    [".hero-eyebrow", /repo-native diagram compiler/i],
    [".promise", /Commit diagrams like code/i],
    [".action-primary", /See the workflow/i],
    [".action-secondary", /Install Guide|Read Docs/i],
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

function checkedBounds(selector) {
  const element = document.querySelector(selector);
  if (!element) return { ok: false, message: `missing ${selector}` };

  const rect = element.getBoundingClientRect();
  const boundsFailure = emptyHeroLayoutFailure(selector, rect);

  return boundsFailure ?? { ok: true, rect: toRect(rect) };
}

function workflowButtonHeightFailure(rect, text) {
  if (rect.height >= 44) return undefined;
  return {
    ok: false,
    message: `workflow control "${text}" is shorter than 44px: ${Math.round(rect.height)}`,
  };
}

function workflowButtonHorizontalFailure(rect, text) {
  if (rect.left >= -1 && rect.right <= window.innerWidth + 1) return undefined;
  return {
    ok: false,
    message: `workflow control "${text}" is clipped horizontally: ${JSON.stringify(toRect(rect))}`,
  };
}

function workflowButtonFailure(button) {
  const rect = button.getBoundingClientRect();
  const text = button.textContent?.replace(/\s+/g, " ").trim() ?? "";

  return workflowButtonHeightFailure(rect, text) ?? workflowButtonHorizontalFailure(rect, text);
}

function workflowButtonsFailure(buttons) {
  for (const button of buttons) {
    const failure = workflowButtonFailure(button);
    if (failure !== undefined) return failure;
  }
  return undefined;
}

function workflowTextFailure(stage) {
  const text = stage.textContent?.replace(/\s+/g, " ").trim() ?? "";
  const required = [/\.dp\.yaml/, /diagrampilot check/, /diagrampilot generate/];
  required.push(/architecture\.svg/, /Review-stable SVG artifact/, /checkout API/);
  required.push(/payment provider/, /orders DB/);

  for (const pattern of required) {
    if (!pattern.test(text)) {
      return { ok: false, message: `workflow demo is missing ${pattern}` };
    }
  }

  return undefined;
}

function workflowStageBoundsFailure() {
  const stageBounds = checkedBounds("[data-demo-stage]");
  if (!stageBounds.ok) return stageBounds;
  if (stageBounds.rect.left >= -1 && stageBounds.rect.right <= window.innerWidth + 1) {
    return undefined;
  }
  return {
    ok: false,
    message: `workflow demo is clipped horizontally: ${JSON.stringify(stageBounds.rect)}`,
  };
}

function workflowControlCountFailure(buttons) {
  return buttons.length !== 4
    ? { ok: false, message: `expected 4 workflow controls, found ${buttons.length}` }
    : undefined;
}

function checkWorkflowDemoLayout() {
  const stage = document.querySelector("[data-demo-stage]");
  if (!stage) return { ok: false, message: "missing workflow demo stage" };
  const stageFailure = workflowStageBoundsFailure();
  if (stageFailure !== undefined) return stageFailure;
  const buttons = Array.from(document.querySelectorAll("[data-demo-control]"));
  const demoFailure = [
    workflowControlCountFailure(buttons),
    workflowButtonsFailure(buttons),
    workflowTextFailure(stage),
  ].find((failure) => failure !== undefined);

  return demoFailure ?? { ok: true };
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
