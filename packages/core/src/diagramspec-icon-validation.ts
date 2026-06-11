import {
  isPackagedLucideIconName,
  LUCIDE_ICON_NAMESPACE,
} from "@diagrampilot/icons";

import {
  iconReferenceExpected,
} from "./diagramspec-constants.js";
import {
  forEachCollectionRecord,
} from "./diagramspec-validation-helpers.js";
import type {
  DiagramSpecValidationError,
} from "./diagramspec-validation.js";

interface IconReference {
  namespace: string;
  name: string;
}

function parseIconReference(value: string): IconReference | undefined {
  const separatorIndex = value.indexOf(":");

  if (
    separatorIndex <= 0 ||
    separatorIndex === value.length - 1 ||
    value.indexOf(":", separatorIndex + 1) !== -1
  ) {
    return undefined;
  }

  return {
    namespace: value.slice(0, separatorIndex),
    name: value.slice(separatorIndex + 1),
  };
}

function iconReferenceShapeError(
  path: string,
  value: unknown,
): DiagramSpecValidationError {
  return {
    path,
    message: `${path} must be a namespaced icon reference.`,
    badValue: value,
    expected: iconReferenceExpected,
    suggestion: `Use a supported icon reference such as ${LUCIDE_ICON_NAMESPACE}:database.`,
  };
}

function unsupportedIconNamespaceError(
  path: string,
  value: string,
  reference: IconReference,
): DiagramSpecValidationError {
  return {
    path,
    message: `${path} uses unsupported icon namespace "${reference.namespace}".`,
    badValue: value,
    expected: `Supported icon namespaces: ${LUCIDE_ICON_NAMESPACE}.`,
    suggestion: `Use ${LUCIDE_ICON_NAMESPACE}:<icon-name> with a packaged Lucide icon, such as ${LUCIDE_ICON_NAMESPACE}:database.`,
  };
}

function unknownLucideIconError(
  path: string,
  value: string,
  reference: IconReference,
): DiagramSpecValidationError {
  return {
    path,
    message: `${path} references unknown Lucide icon "${reference.name}".`,
    badValue: value,
    expected: "Known Lucide icon name.",
    suggestion: `Choose a packaged Lucide icon, such as ${LUCIDE_ICON_NAMESPACE}:database.`,
  };
}

function parseIconReferenceValue(
  path: string,
  value: unknown,
): { ok: true; value: string; reference: IconReference } | {
  ok: false;
  error: DiagramSpecValidationError;
} {
  if (typeof value !== "string" || value.trim() !== value) {
    return { ok: false, error: iconReferenceShapeError(path, value) };
  }

  const reference = parseIconReference(value);

  if (reference === undefined) {
    return { ok: false, error: iconReferenceShapeError(path, value) };
  }

  return { ok: true, value, reference };
}

function validateIconReferenceValue(
  path: string,
  value: unknown,
  errors: DiagramSpecValidationError[],
): void {
  const result = parseIconReferenceValue(path, value);

  if (!result.ok) {
    errors.push(result.error);
    return;
  }

  if (result.reference.namespace !== LUCIDE_ICON_NAMESPACE) {
    errors.push(
      unsupportedIconNamespaceError(path, result.value, result.reference),
    );
    return;
  }

  if (isPackagedLucideIconName(result.reference.name)) {
    return;
  }

  errors.push(unknownLucideIconError(path, result.value, result.reference));
}

export function validateDiagramObjectIcons(
  value: Record<string, unknown>,
  errors: DiagramSpecValidationError[],
): void {
  forEachCollectionRecord(
    value,
    ["nodes", "groups"],
    (item, index, collectionName) => {
      if (!("icon" in item)) return;

      validateIconReferenceValue(
        `${collectionName}[${index}].icon`,
        item.icon,
        errors,
      );
    },
  );
}
