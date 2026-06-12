import {
  isPackagedLucideIconName,
  LUCIDE_ICON_NAMESPACE,
} from "@diagrampilot/icons";

import {
  createRepairableDiagnosticReport,
  loadValidatedDiagramSpec,
  type ValidatedDiagramSpecLoadFailure,
} from "./source-loading.js";
import { serializeDiagramPilotSourceFile } from "./source-serialization.js";
import {
  validateDiagramSpec,
  type RepairableDiagnostic,
} from "./diagramspec-validation.js";
import type { DiagramSpec } from "./diagramspec-topology.js";

export type DiagramPilotSourceFixRepairKind = "format-source" | "replace-icon";

export interface DiagramPilotSourceFixRepair {
  kind: DiagramPilotSourceFixRepairKind;
  path: string;
  message: string;
  before?: unknown;
  after?: unknown;
}

export interface DiagramPilotSourceFixOptions {
  fallbackIcon?: string;
}

export interface DiagramPilotSourceFixValidation {
  ok: boolean;
  errors: RepairableDiagnostic[];
}

export type DiagramPilotSourceFixResult =
  | {
      ok: true;
      sourcePath: string;
      changed: boolean;
      repairs: DiagramPilotSourceFixRepair[];
      content: string;
      validation: {
        ok: true;
        errors: [];
      };
    }
  | {
      ok: false;
      sourcePath: string;
      changed: false;
      repairs: DiagramPilotSourceFixRepair[];
      validation: {
        ok: false;
        errors: RepairableDiagnostic[];
      };
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseFallbackLucideIconName(
  fallbackIcon: string | undefined,
): string | undefined {
  if (fallbackIcon === undefined) return undefined;

  const prefix = `${LUCIDE_ICON_NAMESPACE}:`;
  if (!fallbackIcon.startsWith(prefix)) return undefined;

  const iconName = fallbackIcon.slice(prefix.length);
  return isPackagedLucideIconName(iconName) ? iconName : undefined;
}

function iconPathParts(
  diagnosticPath: string,
): { collectionName: "nodes" | "groups"; index: number } | undefined {
  const match = /^(?<collectionName>nodes|groups)\[(?<index>\d+)\]\.icon$/u.exec(
    diagnosticPath,
  );

  if (match?.groups === undefined) return undefined;

  return {
    collectionName: match.groups.collectionName as "nodes" | "groups",
    index: Number.parseInt(match.groups.index, 10),
  };
}

function recordAtIconPath(
  sourceValue: Record<string, unknown>,
  diagnosticPath: string,
): Record<string, unknown> | undefined {
  const parts = iconPathParts(diagnosticPath);
  if (parts === undefined) return undefined;

  const collection = sourceValue[parts.collectionName];
  if (!Array.isArray(collection)) return undefined;

  const item = collection[parts.index];
  return isRecord(item) ? item : undefined;
}

function applyIconFallbackRepair(
  sourceValue: Record<string, unknown>,
  diagnostic: RepairableDiagnostic,
  fallbackIcon: string | undefined,
): DiagramPilotSourceFixRepair | undefined {
  if (parseFallbackLucideIconName(fallbackIcon) === undefined) return undefined;
  if (diagnostic.expected !== "Known Lucide icon name.") return undefined;

  const object = recordAtIconPath(sourceValue, diagnostic.path);
  if (object === undefined) return undefined;

  const before = object.icon;
  object.icon = fallbackIcon;

  return {
    kind: "replace-icon",
    path: diagnostic.path,
    message: `Replace invalid icon with configured fallback ${fallbackIcon}.`,
    before,
    after: fallbackIcon,
  };
}

function formatSourceRepair(
  originalContent: string,
  nextContent: string,
): DiagramPilotSourceFixRepair | undefined {
  if (originalContent === nextContent) return undefined;

  return {
    kind: "format-source",
    path: "$",
    message: "Format source as canonical DiagramPilot YAML.",
  };
}

function failedFixResult(
  failure: ValidatedDiagramSpecLoadFailure,
  repairs: DiagramPilotSourceFixRepair[] = [],
): DiagramPilotSourceFixResult {
  const report = createRepairableDiagnosticReport(failure);

  return {
    ok: false,
    sourcePath: report.file,
    changed: false,
    repairs,
    validation: {
      ok: false,
      errors: report.errors,
    },
  };
}

function planValidationFailureFix(
  failure: Extract<ValidatedDiagramSpecLoadFailure, { kind: "validation" }>,
  options: DiagramPilotSourceFixOptions,
): DiagramPilotSourceFixResult {
  if (!isRecord(failure.source.value)) {
    return failedFixResult(failure);
  }

  const repairedValue = structuredClone(failure.source.value);
  const repairs = failure.errors
    .map((error) =>
      applyIconFallbackRepair(repairedValue, error, options.fallbackIcon),
    )
    .filter(
      (repair): repair is DiagramPilotSourceFixRepair => repair !== undefined,
    );

  if (repairs.length === 0) {
    return failedFixResult(failure);
  }

  const validation = validateDiagramSpec(repairedValue);

  if (!validation.ok) {
    return {
      ok: false,
      sourcePath: failure.source.path,
      changed: false,
      repairs,
      validation: {
        ok: false,
        errors: validation.errors,
      },
    };
  }

  return {
    ok: true,
    sourcePath: failure.source.path,
    changed: true,
    repairs,
    content: serializeDiagramPilotSourceFile(
      repairedValue as unknown as DiagramSpec,
    ),
    validation: {
      ok: true,
      errors: [],
    },
  };
}

export function planDiagramPilotSourceFix(
  sourcePath: string,
  options: DiagramPilotSourceFixOptions = {},
): DiagramPilotSourceFixResult {
  const loaded = loadValidatedDiagramSpec(sourcePath);

  if (!loaded.ok) {
    return loaded.failure.kind === "validation"
      ? planValidationFailureFix(loaded.failure, options)
      : failedFixResult(loaded.failure);
  }

  const content = serializeDiagramPilotSourceFile(loaded.spec);
  const repair = formatSourceRepair(loaded.source.content, content);

  return {
    ok: true,
    sourcePath: loaded.source.path,
    changed: repair !== undefined,
    repairs: repair === undefined ? [] : [repair],
    content,
    validation: {
      ok: true,
      errors: [],
    },
  };
}
