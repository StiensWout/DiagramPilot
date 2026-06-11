#!/usr/bin/env node
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const suite = "diagrampilot-workflow-benchmark";
const fixture = "checkout-demo-configured-repo";
const defaultRuns = 5;
const defaultBaselinePath = "benchmarks/workflow-baseline.json";
const referenceScenarioId = "cli_validate";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const cliEntryPoint = path.join(repoRoot, "packages", "cli", "dist", "index.js");
const mcpEntryPoint = path.join(repoRoot, "packages", "mcp", "dist", "index.js");
const checkoutDemoRoot = path.join(repoRoot, "demo-projects", "checkout");

function usageText() {
  return [
    "Usage: node scripts/benchmark-workflows.mjs [options]",
    "",
    "Options:",
    `  --runs <count>              Samples per scenario. Default: ${defaultRuns}`,
    "  --format text|json          Output format. Default: text",
    `  --compare <path|none>       Compare with a normalized baseline. Default: ${defaultBaselinePath}`,
    "  --write-baseline <path>     Write normalized relative medians after running.",
    "  --help                      Show this help.",
    "",
  ].join("\n");
}

function parsePositiveInteger(value, optionName) {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed < 1 || String(parsed) !== value) {
    throw new Error(`${optionName} must be a positive integer.`);
  }

  return parsed;
}

function parsePathOption(value) {
  return value === "none" ? undefined : value;
}

function defaultOptions() {
  return {
    baselinePath: defaultBaselinePath,
    format: "text",
    runs: defaultRuns,
    writeBaselinePath: undefined,
  };
}

function requireOptionValue(args, index, optionName) {
  const value = args[index + 1];

  if (value === undefined) {
    throw new Error(`Missing ${optionName} value.`);
  }

  return value;
}

function parseOutputFormat(value) {
  if (value !== "text" && value !== "json") {
    throw new Error("--format must be text or json.");
  }

  return value;
}

const optionHandlers = new Map([
  [
    "--help",
    {
      takesValue: false,
      apply: (state) => {
        state.help = true;
      },
    },
  ],
  [
    "-h",
    {
      takesValue: false,
      apply: (state) => {
        state.help = true;
      },
    },
  ],
  [
    "--runs",
    {
      takesValue: true,
      apply: (state, value) => {
        state.options.runs = parsePositiveInteger(value, "--runs");
      },
    },
  ],
  [
    "--format",
    {
      takesValue: true,
      apply: (state, value) => {
        state.options.format = parseOutputFormat(value);
      },
    },
  ],
  [
    "--compare",
    {
      takesValue: true,
      apply: (state, value) => {
        state.options.baselinePath = parsePathOption(value);
      },
    },
  ],
  [
    "--write-baseline",
    {
      takesValue: true,
      apply: (state, value) => {
        state.options.writeBaselinePath = value;
      },
    },
  ],
]);

function applyOption(args, index, state) {
  const optionName = args[index];
  const handler = optionHandlers.get(optionName);

  if (handler === undefined) {
    throw new Error(`Unknown benchmark option: ${optionName}`);
  }

  if (!handler.takesValue) {
    handler.apply(state);
    return index;
  }

  handler.apply(state, requireOptionValue(args, index, optionName));
  return index + 1;
}

function parseArgs(args) {
  const state = {
    help: false,
    options: defaultOptions(),
  };

  for (let index = 0; index < args.length; index += 1) {
    index = applyOption(args, index, state);
  }

  return state;
}

function resolveRepoPath(filePath) {
  return path.isAbsolute(filePath) ? filePath : path.resolve(repoRoot, filePath);
}

function repoDisplayPath(filePath) {
  return path.relative(repoRoot, resolveRepoPath(filePath)).split(path.sep).join("/");
}

function round(value, digits = 3) {
  return Number(value.toFixed(digits));
}

function median(values) {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 1) return sorted[middle];

  return (sorted[middle - 1] + sorted[middle]) / 2;
}

function mean(values) {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function assertBuiltArtifactsPresent() {
  for (const entryPoint of [cliEntryPoint, mcpEntryPoint]) {
    if (!existsSync(entryPoint)) {
      throw new Error(
        `Missing build artifact: ${repoDisplayPath(entryPoint)}. Run npm run build before the benchmark.`,
      );
    }
  }
}

function benchmarkConfigText() {
  return [
    "version: 1",
    "artifacts:",
    "  - source: docs/architecture.dp.yaml",
    "    outputs:",
    "      - format: svg",
    "        path: docs/architecture.svg",
    "      - format: png",
    "        path: docs/architecture.png",
    "      - format: mermaid",
    "        path: generated/architecture.mmd",
    "      - format: d2",
    "        path: generated/architecture.d2",
    "      - format: dot",
    "        path: generated/architecture.dot",
    "      - format: markdown",
    "        path: generated/architecture.md",
    "",
  ].join("\n");
}

function benchmarkEnv() {
  return {
    ...process.env,
    FORCE_COLOR: "0",
    NO_COLOR: "1",
  };
}

function capturedText(stream) {
  let output = "";

  stream.setEncoding("utf8");
  stream.on("data", (chunk) => {
    output += chunk;
  });

  return () => output;
}

function runProcess(command, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: benchmarkEnv(),
      stdio: ["ignore", "pipe", "pipe"],
    });
    const stdout = capturedText(child.stdout);
    const stderr = capturedText(child.stderr);

    child.once("error", reject);
    child.once("close", (code, signal) => {
      resolve({ code, signal, stdout: stdout(), stderr: stderr() });
    });
  });
}

async function runCli(args, cwd) {
  const result = await runProcess(process.execPath, [cliEntryPoint, ...args], {
    cwd,
  });

  if (result.code !== 0 || result.signal !== null) {
    throw new Error(
      [
        `CLI command failed: diagrampilot ${args.join(" ")}`,
        `exitCode=${result.code}`,
        result.stdout.trim(),
        result.stderr.trim(),
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }

  return result;
}

async function prepareBenchmarkFixture() {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "diagrampilot-benchmark-"));
  const fixtureRoot = path.join(tempRoot, "checkout");

  await cp(checkoutDemoRoot, fixtureRoot, { recursive: true });
  await writeFile(
    path.join(fixtureRoot, "diagrampilot.config.yaml"),
    benchmarkConfigText(),
    "utf8",
  );
  await runCli(["generate", "--json"], fixtureRoot);

  return {
    fixtureRoot,
    sourcePath: "docs/architecture.dp.yaml",
    tempRoot,
  };
}

async function loadMcpRuntime() {
  return import(pathToFileURL(mcpEntryPoint).href);
}

function scenarioDefinitions(context, mcpRuntime) {
  const sourcePath = context.sourcePath;
  const absoluteSourcePath = path.join(context.fixtureRoot, sourcePath);
  const renderOutputRoot = path.join(context.fixtureRoot, ".benchmark-output");

  return [
    {
      id: "cli_validate",
      label: "CLI validate DiagramPilot Source File",
      surface: "cli",
      coverage: ["validate"],
      run: async () => {
        await runCli(["validate", sourcePath, "--json"], context.fixtureRoot);
      },
    },
    {
      id: "cli_check",
      label: "CLI check configured Repo Workflow",
      surface: "cli",
      coverage: ["check"],
      run: async () => {
        await runCli(["check", "--json"], context.fixtureRoot);
      },
    },
    {
      id: "cli_generate",
      label: "CLI generate configured Derived Artifacts",
      surface: "cli",
      coverage: ["generate", "svg", "png", "text exports", "markdown embed"],
      run: async () => {
        await runCli(["generate", "--json"], context.fixtureRoot);
      },
    },
    {
      id: "cli_render_svg",
      label: "CLI render SVG artifact",
      surface: "cli",
      coverage: ["svg render"],
      run: async () => {
        await runCli(
          [
            "render",
            sourcePath,
            "--format",
            "svg",
            "--out",
            path.join(renderOutputRoot, "architecture.svg"),
          ],
          context.fixtureRoot,
        );
      },
    },
    {
      id: "cli_render_png",
      label: "CLI render PNG artifact",
      surface: "cli",
      coverage: ["png render"],
      run: async () => {
        await runCli(
          [
            "render",
            sourcePath,
            "--format",
            "png",
            "--out",
            path.join(renderOutputRoot, "architecture.png"),
          ],
          context.fixtureRoot,
        );
      },
    },
    {
      id: "mcp_validate_source",
      label: "MCP validate source tool",
      surface: "mcp",
      coverage: ["mcp validate overhead"],
      run: async () => {
        const result = await mcpRuntime.callDiagramPilotMcpTool(
          "diagrampilot_validate_source",
          { source_path: absoluteSourcePath },
        );

        if (result.isError === true) {
          throw new Error(`MCP validate failed: ${result.content[0]?.text ?? ""}`);
        }
      },
    },
    {
      id: "mcp_check_repo",
      label: "MCP check repo tool",
      surface: "mcp",
      coverage: ["mcp check overhead"],
      run: async () => {
        const result = await mcpRuntime.callDiagramPilotMcpTool(
          "diagrampilot_check_repo",
          { scope_path: context.fixtureRoot },
        );

        if (result.isError === true) {
          throw new Error(`MCP check failed: ${result.content[0]?.text ?? ""}`);
        }
      },
    },
  ];
}

async function measureScenario(scenario, runs) {
  const samples = [];

  for (let index = 0; index < runs; index += 1) {
    const start = process.hrtime.bigint();
    await scenario.run();
    const end = process.hrtime.bigint();
    samples.push(Number(end - start) / 1_000_000);
  }

  return {
    id: scenario.id,
    label: scenario.label,
    surface: scenario.surface,
    coverage: scenario.coverage,
    ok: true,
    sampleCount: samples.length,
    samplesMs: samples.map((sample) => round(sample)),
    minMs: round(Math.min(...samples)),
    maxMs: round(Math.max(...samples)),
    meanMs: round(mean(samples)),
    medianMs: round(median(samples)),
  };
}

async function loadBaseline(baselinePath) {
  if (baselinePath === undefined) return undefined;

  const absolutePath = resolveRepoPath(baselinePath);
  const content = await readFile(absolutePath, "utf8");
  const baseline = JSON.parse(content);

  return {
    ...baseline,
    path: repoDisplayPath(absolutePath),
  };
}

function baselineResultById(baseline) {
  return new Map(
    (baseline?.results ?? []).map((result) => [
      result.id,
      result.relativeMedian,
    ]),
  );
}

function withRelativeMedians(results, baseline) {
  const reference = results.find((result) => result.id === referenceScenarioId);

  if (reference === undefined || reference.medianMs <= 0) {
    throw new Error(`Missing positive reference scenario: ${referenceScenarioId}`);
  }

  const baselineResults = baselineResultById(baseline);

  return results.map((result) => {
    const relativeMedian = round(result.medianMs / reference.medianMs);
    const baselineRelativeMedian = baselineResults.get(result.id);

    if (baselineRelativeMedian === undefined) {
      return { ...result, relativeMedian };
    }

    return {
      ...result,
      relativeMedian,
      baselineRelativeMedian,
      relativeChange: round(
        (relativeMedian - baselineRelativeMedian) / baselineRelativeMedian,
      ),
    };
  });
}

async function runBenchmark(options) {
  assertBuiltArtifactsPresent();

  const baseline = await loadBaseline(options.baselinePath);
  const context = await prepareBenchmarkFixture();

  try {
    const mcpRuntime = await loadMcpRuntime();
    const scenarios = scenarioDefinitions(context, mcpRuntime);
    const measuredResults = [];

    for (const scenario of scenarios) {
      measuredResults.push(await measureScenario(scenario, options.runs));
    }

    const results = withRelativeMedians(measuredResults, baseline);
    const report = {
      schemaVersion: 1,
      suite,
      fixture,
      runsPerScenario: options.runs,
      baseline:
        baseline === undefined
          ? undefined
          : {
              path: baseline.path,
              id: baseline.id,
              referenceScenarioId: baseline.referenceScenarioId,
              unit: baseline.unit,
            },
      results,
    };

    if (options.writeBaselinePath !== undefined) {
      const baselinePath = await writeBaseline(options.writeBaselinePath, report);
      report.writtenBaselinePath = baselinePath;
    }

    return report;
  } finally {
    await rm(context.tempRoot, { recursive: true, force: true });
  }
}

function createBaseline(report) {
  return {
    schemaVersion: 1,
    id: "dp-8-workflow-baseline",
    suite: report.suite,
    fixture: report.fixture,
    unit: "relative-median",
    referenceScenarioId,
    runsPerScenario: report.runsPerScenario,
    results: report.results.map((result) => ({
      id: result.id,
      label: result.label,
      surface: result.surface,
      coverage: result.coverage,
      relativeMedian: result.relativeMedian,
    })),
  };
}

async function writeBaseline(baselinePath, report) {
  const absolutePath = resolveRepoPath(baselinePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(
    absolutePath,
    `${JSON.stringify(createBaseline(report), null, 2)}\n`,
    "utf8",
  );
  return repoDisplayPath(absolutePath);
}

function formatOptionalNumber(value, suffix = "") {
  return typeof value === "number" ? `${value}${suffix}` : "n/a";
}

function formatRelativeChange(value) {
  if (typeof value !== "number") return "n/a";
  const percent = round(value * 100, 1);
  return `${percent >= 0 ? "+" : ""}${percent}%`;
}

function textReportHeader(report) {
  return [
    "DiagramPilot workflow benchmark",
    `Fixture: ${report.fixture}`,
    `Runs per scenario: ${report.runsPerScenario}`,
    `Baseline: ${report.baseline?.path ?? "none"}`,
    "",
    [
      "Scenario".padEnd(24),
      "Median ms".padStart(10),
      "Relative".padStart(10),
      "Baseline".padStart(10),
      "Change".padStart(10),
    ].join("  "),
  ];
}

function textReportResultLine(result) {
  return [
    result.id.padEnd(24),
    formatOptionalNumber(result.medianMs).padStart(10),
    formatOptionalNumber(result.relativeMedian, "x").padStart(10),
    formatOptionalNumber(result.baselineRelativeMedian, "x").padStart(10),
    formatRelativeChange(result.relativeChange).padStart(10),
  ].join("  ");
}

function writtenBaselineLines(report) {
  return report.writtenBaselinePath === undefined
    ? []
    : ["", `Wrote normalized baseline: ${report.writtenBaselinePath}`];
}

function formatTextReport(report) {
  return `${[
    ...textReportHeader(report),
    ...report.results.map(textReportResultLine),
    ...writtenBaselineLines(report),
  ].join("\n")}\n`;
}

function outputForReport(report, format) {
  return format === "json"
    ? `${JSON.stringify(report, null, 2)}\n`
    : formatTextReport(report);
}

async function successfulOutput(args) {
  const { help, options } = parseArgs(args);

  if (help) return usageText();

  return outputForReport(await runBenchmark(options), options.format);
}

function formatError(error) {
  return `${error instanceof Error ? error.message : String(error)}\n`;
}

async function main(args) {
  try {
    process.stdout.write(await successfulOutput(args));
    return 0;
  } catch (error) {
    process.stderr.write(formatError(error));
    process.stderr.write(usageText());
    return 1;
  }
}

process.exitCode = await main(process.argv.slice(2));
