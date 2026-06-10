import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import type { CliStreams, CommandPlan } from "./types.js";

function writeStreamIfPresent(
  stream: CliStreams["stdout"] | CliStreams["stderr"],
  content: string,
): void {
  if (content !== "") {
    stream.write(content);
  }
}

function writeContentEncoding(content: string | Uint8Array): "utf8" | undefined {
  return typeof content === "string" ? "utf8" : undefined;
}

function executeWriteIntent(write: CommandPlan["writes"][number]): void {
  mkdirSync(path.dirname(write.path), { recursive: true });
  writeFileSync(write.path, write.content, writeContentEncoding(write.content));
}

export function executeCommandPlan(
  plan: CommandPlan,
  streams: CliStreams,
): number {
  writeStreamIfPresent(streams.stdout, plan.stdout);
  writeStreamIfPresent(streams.stderr, plan.stderr);

  for (const write of plan.writes) {
    executeWriteIntent(write);
  }

  return plan.exitCode;
}
