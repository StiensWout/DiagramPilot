import { parseWatchArgs } from "./watch-argument-parsing.js";
import { planCommand as defaultPlanCommand } from "./command-planning.js";
import { executeCommandPlan as defaultExecuteCommandPlan } from "./execution.js";
import { createFileSystemWatcher } from "./watch-filesystem.js";
import {
  runWatchCycle,
  type WatchCycleResult,
} from "./watch-cycle.js";
import { textLine, watchUsageText } from "./cli-output.js";
import type { CliStreams, CommandPlan } from "./types.js";

export type { WatchCycleResult } from "./watch-cycle.js";

export interface WatchChange {
  path?: string;
}

export interface WatchHandle {
  close(): void;
}

export interface WatchCreateOptions {
  scopePath?: string;
  onChange(change: WatchChange): void;
  onError(error: Error): void;
}

export interface WatchScheduler {
  setTimeout(callback: () => void, delayMs: number): unknown;
  clearTimeout(timer: unknown): void;
}

export interface WatchCommandDependencies {
  signal?: AbortSignal;
  debounceMs?: number;
  scheduler?: WatchScheduler;
  createWatcher?(options: WatchCreateOptions): WatchHandle | Promise<WatchHandle>;
  planCommand?(args: readonly string[]): Promise<CommandPlan>;
  executeCommandPlan?(plan: CommandPlan, streams: CliStreams): number;
  onCycleComplete?(result: WatchCycleResult): void | Promise<void>;
}

const defaultDebounceMs = 150;

const defaultScheduler: WatchScheduler = {
  setTimeout: (callback, delayMs) => setTimeout(callback, delayMs),
  clearTimeout: (timer) => {
    clearTimeout(timer as ReturnType<typeof setTimeout>);
  },
};

function usagePlan(message: string): CommandPlan {
  return {
    exitCode: 1,
    stdout: "",
    stderr: [message, watchUsageText(), ""].join("\n"),
    writes: [],
  };
}

function writeStream(
  stream: CliStreams["stdout"] | CliStreams["stderr"],
  content: string,
): void {
  if (content !== "") {
    stream.write(content);
  }
}

function isHelpArgs(args: readonly string[]): boolean {
  return args.length === 1 && (args[0] === "--help" || args[0] === "-h");
}

function scopeLabel(scopePath: string | undefined): string {
  return scopePath ?? ".";
}

function errorFromUnknown(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

function waitForAbort(signal: AbortSignal | undefined): Promise<void> {
  if (signal === undefined) {
    return new Promise(() => undefined);
  }

  if (signal.aborted) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    signal.addEventListener("abort", () => resolve(), { once: true });
  });
}

function watchCreationFailure(error: unknown, scopePath: string | undefined): string {
  const message = errorFromUnknown(error).message;

  return `Unable to watch ${scopeLabel(scopePath)}: ${message}`;
}

type WatchInvocation =
  | {
      kind: "handled";
      exitCode: number;
    }
  | {
      kind: "start";
      scopePath?: string;
    };

interface WatchQueueOptions {
  scopePath?: string;
  streams: CliStreams;
  scheduler: WatchScheduler;
  debounceMs: number;
  planCommand(args: readonly string[]): Promise<CommandPlan>;
  executeCommandPlan(plan: CommandPlan, streams: CliStreams): number;
  onCycleComplete?(result: WatchCycleResult): void | Promise<void>;
}

interface WatchQueueState {
  active: boolean;
  running: boolean;
  rerunRequested: boolean;
  timer?: unknown;
}

function parseWatchInvocation(
  args: readonly string[],
  streams: CliStreams,
): WatchInvocation {
  if (isHelpArgs(args)) {
    writeStream(streams.stdout, textLine(watchUsageText()));
    return {
      kind: "handled",
      exitCode: 0,
    };
  }

  const argsResult = parseWatchArgs(args);

  if (!argsResult.ok) {
    const plan = usagePlan(argsResult.message);
    writeStream(streams.stderr, plan.stderr);
    return {
      kind: "handled",
      exitCode: plan.exitCode,
    };
  }

  return {
    kind: "start",
    scopePath: argsResult.options.scopePath,
  };
}

function clearPendingTimer(
  state: WatchQueueState,
  scheduler: WatchScheduler,
): void {
  if (state.timer === undefined) return;

  scheduler.clearTimeout(state.timer);
  state.timer = undefined;
}

async function drainQueuedCycles(
  state: WatchQueueState,
  reason: WatchCycleResult["reason"],
  options: WatchQueueOptions,
): Promise<void> {
  let currentReason = reason;

  do {
    state.rerunRequested = false;

    await runWatchCycle({
      reason: currentReason,
      scopePath: options.scopePath,
      streams: options.streams,
      planCommand: options.planCommand,
      executeCommandPlan: options.executeCommandPlan,
      onCycleComplete: options.onCycleComplete,
    });

    currentReason = "change";
  } while (state.active && state.rerunRequested);
}

function createWatchQueue(options: WatchQueueOptions) {
  const state: WatchQueueState = {
    active: true,
    running: false,
    rerunRequested: false,
  };

  async function runQueuedCycle(
    reason: WatchCycleResult["reason"],
  ): Promise<void> {
    if (!state.active) return;

    if (state.running) {
      state.rerunRequested = true;
      return;
    }

    state.running = true;

    try {
      await drainQueuedCycles(state, reason, options);
    } finally {
      state.running = false;
    }
  }

  return {
    async runInitialCycle() {
      await runQueuedCycle("initial");
    },
    scheduleCycle() {
      if (!state.active) return;

      clearPendingTimer(state, options.scheduler);

      state.timer = options.scheduler.setTimeout(() => {
        state.timer = undefined;
        void runQueuedCycle("change").catch((error: unknown) => {
          writeStream(
            options.streams.stderr,
            textLine(errorFromUnknown(error).message),
          );
        });
      }, options.debounceMs);
    },
    stop() {
      state.active = false;
      clearPendingTimer(state, options.scheduler);
    },
  };
}

async function openWatcher(options: {
  scopePath?: string;
  streams: CliStreams;
  createWatcher(options: WatchCreateOptions): WatchHandle | Promise<WatchHandle>;
  onChange(change: WatchChange): void;
}): Promise<
  | {
      ok: true;
      watcher: WatchHandle;
    }
  | {
      ok: false;
    }
> {
  try {
    return {
      ok: true,
      watcher: await options.createWatcher({
        scopePath: options.scopePath,
        onChange: options.onChange,
        onError(error) {
          writeStream(options.streams.stderr, textLine(error.message));
        },
      }),
    };
  } catch (error) {
    writeStream(
      options.streams.stderr,
      textLine(watchCreationFailure(error, options.scopePath)),
    );
    return { ok: false };
  }
}

function resolveScheduler(
  dependencies: WatchCommandDependencies,
): WatchScheduler {
  return dependencies.scheduler ?? defaultScheduler;
}

function resolveDebounceMs(dependencies: WatchCommandDependencies): number {
  return dependencies.debounceMs ?? defaultDebounceMs;
}

function resolvePlanCommand(
  dependencies: WatchCommandDependencies,
): (args: readonly string[]) => Promise<CommandPlan> {
  return dependencies.planCommand ?? defaultPlanCommand;
}

function resolveExecuteCommandPlan(
  dependencies: WatchCommandDependencies,
): (plan: CommandPlan, streams: CliStreams) => number {
  return dependencies.executeCommandPlan ?? defaultExecuteCommandPlan;
}

function resolveCreateWatcher(
  dependencies: WatchCommandDependencies,
): (options: WatchCreateOptions) => WatchHandle | Promise<WatchHandle> {
  return dependencies.createWatcher ?? createFileSystemWatcher;
}

function createQueueForWatch(options: {
  scopePath?: string;
  streams: CliStreams;
  dependencies: WatchCommandDependencies;
}) {
  return createWatchQueue({
    scopePath: options.scopePath,
    streams: options.streams,
    scheduler: resolveScheduler(options.dependencies),
    debounceMs: resolveDebounceMs(options.dependencies),
    planCommand: resolvePlanCommand(options.dependencies),
    executeCommandPlan: resolveExecuteCommandPlan(options.dependencies),
    onCycleComplete: options.dependencies.onCycleComplete,
  });
}

async function runStartedWatch(options: {
  scopePath?: string;
  streams: CliStreams;
  dependencies: WatchCommandDependencies;
}): Promise<number> {
  const queue = createQueueForWatch(options);
  const watcherResult = await openWatcher({
    scopePath: options.scopePath,
    streams: options.streams,
    createWatcher: resolveCreateWatcher(options.dependencies),
    onChange: queue.scheduleCycle,
  });

  if (!watcherResult.ok) {
    return 1;
  }

  writeStream(
    options.streams.stdout,
    `Watching ${scopeLabel(options.scopePath)} for DiagramPilot changes.\n`,
  );

  try {
    await queue.runInitialCycle();
    await waitForAbort(options.dependencies.signal);
    return 0;
  } finally {
    queue.stop();
    watcherResult.watcher.close();
  }
}

export async function runWatch(
  args: readonly string[],
  streams: CliStreams,
  dependencies: WatchCommandDependencies = {},
): Promise<number> {
  const invocation = parseWatchInvocation(args, streams);

  if (invocation.kind === "handled") return invocation.exitCode;

  return runStartedWatch({
    scopePath: invocation.scopePath,
    streams,
    dependencies,
  });
}
