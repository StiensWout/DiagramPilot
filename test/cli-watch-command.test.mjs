import assert from "node:assert/strict";
import test from "node:test";

import { runWatch } from "../packages/cli/dist/index.js";

function createStreams() {
  let stdout = "";
  let stderr = "";

  return {
    streams: {
      stdout: {
        write: (content) => {
          stdout += content;
        },
      },
      stderr: {
        write: (content) => {
          stderr += content;
        },
      },
    },
    output: () => ({ stdout, stderr }),
  };
}

function createAbortableCycleTracker(abortController) {
  return {
    cycles: 0,
    onCycleComplete() {
      this.cycles += 1;
      abortController.abort();
    },
  };
}

function createSingleCycleWatchHarness() {
  const abortController = new AbortController();
  const { streams, output } = createStreams();
  const calls = [];
  const executedPlans = [];
  const tracker = createAbortableCycleTracker(abortController);

  return {
    abortController,
    calls,
    executedPlans,
    output,
    streams,
    watchDependencies: {
      signal: abortController.signal,
      createWatcher: () => ({ close() {} }),
      onCycleComplete: tracker.onCycleComplete.bind(tracker),
    },
  };
}

test("watch checks before generating and writes only generated artifacts", async () => {
  const harness = createSingleCycleWatchHarness();

  const exitCode = await runWatch(["docs"], harness.streams, {
    ...harness.watchDependencies,
    planCommand: async (args) => {
      harness.calls.push(args);

      if (args[0] === "check") {
        return {
          exitCode: 1,
          stdout: `${JSON.stringify({
            ok: false,
            summary: { issueCount: 1 },
            sources: [
              {
                sourcePath: "docs/architecture.dp.yaml",
                validation: { ok: true, errors: [] },
                artifact: { status: "stale", path: "docs/architecture.svg" },
              },
            ],
          })}\n`,
          stderr: "",
          writes: [],
        };
      }

      assert.equal(args[0], "generate");
      return {
        exitCode: 0,
        stdout: "Generated 1 artifact for 1 DiagramPilot Source File.\n",
        stderr: "",
        writes: [{ path: "/repo/docs/architecture.svg", content: "<svg />" }],
      };
    },
    executeCommandPlan: (plan, planStreams) => {
      harness.executedPlans.push(plan);
      planStreams.stdout.write(plan.stdout);
      planStreams.stderr.write(plan.stderr);
      return plan.exitCode;
    },
  });

  assert.equal(exitCode, 0);
  assert.deepEqual(harness.calls, [
    ["check", "docs", "--json"],
    ["generate", "docs"],
  ]);
  assert.deepEqual(harness.executedPlans.map((plan) => plan.writes), [
    [{ path: "/repo/docs/architecture.svg", content: "<svg />" }],
  ]);
  assert.match(harness.output().stdout, /Watching docs for DiagramPilot changes\./);
  assert.match(
    harness.output().stdout,
    /Check found 1 workflow issue; generating\./,
  );
  assert.match(
    harness.output().stdout,
    /Generated 1 artifact for 1 DiagramPilot Source File\./,
  );
  assert.equal(harness.output().stderr, "");
});

test("watch skips generation when source validation fails", async () => {
  const harness = createSingleCycleWatchHarness();

  const exitCode = await runWatch([], harness.streams, {
    ...harness.watchDependencies,
    planCommand: async (args) => {
      harness.calls.push(args);

      return {
        exitCode: 1,
        stdout: `${JSON.stringify({
          ok: false,
          summary: { issueCount: 1 },
          sources: [
            {
              sourcePath: "docs/invalid.dp.yaml",
              validation: {
                ok: false,
                errors: [{ message: "Missing required top-level field: title." }],
              },
              artifact: { status: "unchecked" },
            },
          ],
        })}\n`,
        stderr: "",
        writes: [],
      };
    },
    executeCommandPlan: (plan) => {
      harness.executedPlans.push(plan);
      return plan.exitCode;
    },
  });

  assert.equal(exitCode, 0);
  assert.deepEqual(harness.calls, [["check", "--json"]]);
  assert.deepEqual(harness.executedPlans, []);
  assert.match(
    harness.output().stderr,
    /Generation skipped: 1 invalid DiagramPilot Source File\./,
  );
});

test("watch debounces relevant source and config changes", async () => {
  const abortController = new AbortController();
  const { streams } = createStreams();
  const calls = [];
  const timers = [];
  let emitChange;
  let cycleCount = 0;

  const scheduler = {
    setTimeout(callback) {
      const timer = { callback, active: true };
      timers.push(timer);
      return timer;
    },
    clearTimeout(timer) {
      timer.active = false;
    },
  };

  function flushTimers() {
    const activeTimers = timers.filter((timer) => timer.active);
    timers.length = 0;

    for (const timer of activeTimers) {
      timer.active = false;
      timer.callback();
    }
  }

  let resolveFirstCycle;
  const firstCycleComplete = new Promise((resolve) => {
    resolveFirstCycle = resolve;
  });

  const exitCodePromise = runWatch([], streams, {
    signal: abortController.signal,
    scheduler,
    createWatcher: ({ onChange }) => {
      emitChange = onChange;
      return { close() {} };
    },
    onCycleComplete: () => {
      cycleCount += 1;

      if (cycleCount === 1) {
        resolveFirstCycle();
      }

      if (cycleCount === 2) {
        abortController.abort();
      }
    },
    planCommand: async (args) => {
      calls.push(args);

      if (args[0] === "check") {
        return {
          exitCode: 0,
          stdout: `${JSON.stringify({
            ok: true,
            summary: { issueCount: 0 },
            sources: [],
          })}\n`,
          stderr: "",
          writes: [],
        };
      }

      return {
        exitCode: 0,
        stdout: "Generated 0 artifacts for 0 DiagramPilot Source Files.\n",
        stderr: "",
        writes: [],
      };
    },
    executeCommandPlan: (plan) => plan.exitCode,
  });

  await firstCycleComplete;

  emitChange({ path: "docs/architecture.dp.yaml" });
  emitChange({ path: "diagrampilot.config.yaml" });
  flushTimers();

  assert.equal(await exitCodePromise, 0);
  assert.deepEqual(calls, [
    ["check", "--json"],
    ["generate"],
    ["check", "--json"],
    ["generate"],
  ]);
});
