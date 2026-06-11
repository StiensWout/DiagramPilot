import { textLine } from "./cli-output.js";
import type { CliStreams, CommandPlan } from "./types.js";

interface CheckPayloadSource {
  validation?: {
    ok?: boolean;
  };
}

interface CheckPayload {
  summary?: {
    issueCount?: number;
  };
  sources?: CheckPayloadSource[];
}

type WatchCheckDecision =
  | {
      kind: "check-failed";
      message: string;
    }
  | {
      kind: "invalid-source";
      invalidCount: number;
    }
  | {
      kind: "generate";
      issueCount: number;
    };

export interface WatchCycleResult {
  reason: "change" | "initial";
  checkable: boolean;
  generated: boolean;
}

function scopedCommandArgs(
  command: "check" | "generate",
  scopePath: string | undefined,
  options: { json?: boolean } = {},
): string[] {
  return [
    command,
    ...(scopePath === undefined ? [] : [scopePath]),
    ...(options.json === true ? ["--json"] : []),
  ];
}

function scopeLabel(scopePath: string | undefined): string {
  return scopePath ?? ".";
}

function scopedDisplayCommand(
  command: "check" | "generate",
  scopePath: string | undefined,
): string {
  return scopePath === undefined
    ? `diagrampilot ${command}`
    : `diagrampilot ${command} ${scopePath}`;
}

function formatWorkflowIssueCount(count: number): string {
  return `${count} workflow issue${count === 1 ? "" : "s"}`;
}

function formatInvalidSourceCount(count: number): string {
  return `${count} invalid DiagramPilot Source File${count === 1 ? "" : "s"}`;
}

function parseCheckPayload(plan: CommandPlan):
  | {
      ok: true;
      payload: CheckPayload;
    }
  | {
      ok: false;
      message: string;
    } {
  try {
    return {
      ok: true,
      payload: JSON.parse(plan.stdout) as CheckPayload,
    };
  } catch {
    const message = [plan.stderr, plan.stdout].join("").trim();

    return {
      ok: false,
      message: message === "" ? "Repo workflow check failed." : message,
    };
  }
}

function invalidSourceCount(payload: CheckPayload): number {
  return (payload.sources ?? []).filter(
    (source) => source.validation?.ok === false,
  ).length;
}

function workflowIssueCount(payload: CheckPayload, plan: CommandPlan): number {
  return payload.summary?.issueCount ?? (plan.exitCode === 0 ? 0 : 1);
}

function checkDecision(plan: CommandPlan): WatchCheckDecision {
  const payloadResult = parseCheckPayload(plan);

  if (!payloadResult.ok) {
    return {
      kind: "check-failed",
      message: payloadResult.message,
    };
  }

  const invalidCount = invalidSourceCount(payloadResult.payload);

  if (invalidCount > 0) {
    return {
      kind: "invalid-source",
      invalidCount,
    };
  }

  return {
    kind: "generate",
    issueCount: workflowIssueCount(payloadResult.payload, plan),
  };
}

async function completeWatchCycle(
  options: {
    reason: WatchCycleResult["reason"];
    onCycleComplete?(result: WatchCycleResult): void | Promise<void>;
  },
  result: Pick<WatchCycleResult, "checkable" | "generated">,
): Promise<void> {
  await options.onCycleComplete?.({
    reason: options.reason,
    ...result,
  });
}

function reportCheckFailure(streams: CliStreams, message: string): void {
  streams.stderr.write(textLine(message));
  streams.stderr.write(
    "Generation skipped: fix DiagramPilot source or config issues.\n",
  );
}

async function skipWatchGeneration(
  options: {
    reason: WatchCycleResult["reason"];
    scopePath?: string;
    streams: CliStreams;
    onCycleComplete?(result: WatchCycleResult): void | Promise<void>;
  },
  decision: Exclude<WatchCheckDecision, { kind: "generate" }>,
): Promise<void> {
  if (decision.kind === "check-failed") {
    reportCheckFailure(options.streams, decision.message);
  } else {
    options.streams.stderr.write(
      `Generation skipped: ${formatInvalidSourceCount(decision.invalidCount)}. Run \`${scopedDisplayCommand("check", options.scopePath)}\`.\n`,
    );
  }

  await completeWatchCycle(options, {
    checkable: false,
    generated: false,
  });
}

function writeGenerateStatus(streams: CliStreams, issueCount: number): void {
  streams.stdout.write(
    issueCount === 0
      ? "Check passed; generating.\n"
      : `Check found ${formatWorkflowIssueCount(issueCount)}; generating.\n`,
  );
}

export async function runWatchCycle(options: {
  reason: WatchCycleResult["reason"];
  scopePath?: string;
  streams: CliStreams;
  planCommand(args: readonly string[]): Promise<CommandPlan>;
  executeCommandPlan(plan: CommandPlan, streams: CliStreams): number;
  onCycleComplete?(result: WatchCycleResult): void | Promise<void>;
}): Promise<void> {
  options.streams.stdout.write(`Checking ${scopeLabel(options.scopePath)}...\n`);

  const checkPlan = await options.planCommand(
    scopedCommandArgs("check", options.scopePath, { json: true }),
  );
  const decision = checkDecision(checkPlan);

  if (decision.kind !== "generate") {
    await skipWatchGeneration(options, decision);
    return;
  }

  writeGenerateStatus(options.streams, decision.issueCount);

  const generatePlan = await options.planCommand(
    scopedCommandArgs("generate", options.scopePath),
  );
  options.executeCommandPlan(generatePlan, options.streams);

  await completeWatchCycle(options, {
    checkable: true,
    generated: true,
  });
}
