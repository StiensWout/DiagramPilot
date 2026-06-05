import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import type { CliStreams, CommandPlan } from "./types.js";

export function executeCommandPlan(
  plan: CommandPlan,
  streams: CliStreams,
): number {
  if (plan.stdout !== "") {
    streams.stdout.write(plan.stdout);
  }

  if (plan.stderr !== "") {
    streams.stderr.write(plan.stderr);
  }

  for (const write of plan.writes) {
    mkdirSync(path.dirname(write.path), { recursive: true });
    writeFileSync(write.path, write.content, "utf8");
  }

  return plan.exitCode;
}
