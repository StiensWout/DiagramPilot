import { stableIdPattern } from "./diagramspec-constants.js";

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isStableId(value: unknown): value is string {
  return typeof value === "string" && stableIdPattern.test(value);
}
