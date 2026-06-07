import {
  externalReferenceExpected,
  sourceReferenceExpected,
  urlSchemePattern,
} from "./diagramspec-constants.js";
import type { DiagramSpecValidationError } from "./diagramspec-validation.js";
import { isRecord } from "./diagramspec-validation-helpers.js";

function isLocalSourceReference(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }

  const trimmedValue = value.trim();

  return (
    trimmedValue.length > 0 &&
    trimmedValue === value &&
    !urlSchemePattern.test(value) &&
    !value.startsWith("/") &&
    !value.startsWith("//")
  );
}

function isExternalUrlReference(value: unknown): value is string {
  if (typeof value !== "string" || value.trim() !== value) {
    return false;
  }

  try {
    const url = new URL(value);

    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      url.hostname.length > 0
    );
  } catch {
    return false;
  }
}

function validateMetadataSourceReference(
  metadataPath: string,
  metadata: Record<string, unknown>,
  errors: DiagramSpecValidationError[],
): void {
  if (!("source" in metadata) || isLocalSourceReference(metadata.source)) {
    return;
  }

  const sourcePath = `${metadataPath}.source`;

  errors.push({
    path: sourcePath,
    message: `${sourcePath} must be a local repository path or path-like glob.`,
    badValue: metadata.source,
    expected: sourceReferenceExpected,
    suggestion: `Use ${sourcePath} for a repo-relative path/glob. Use metadata.external_url for external URLs.`,
  });
}

function validateMetadataExternalReference(
  metadataPath: string,
  metadata: Record<string, unknown>,
  errors: DiagramSpecValidationError[],
): void {
  if (
    !("external_url" in metadata) ||
    isExternalUrlReference(metadata.external_url)
  ) {
    return;
  }

  const externalUrlPath = `${metadataPath}.external_url`;

  errors.push({
    path: externalUrlPath,
    message: `${externalUrlPath} must be an external URL.`,
    badValue: metadata.external_url,
    expected: externalReferenceExpected,
    suggestion: `Use ${externalUrlPath} for an external HTTP(S) URL. Use metadata.source for local repo paths or globs.`,
  });
}

export function validateWellKnownMetadataReferences(
  value: Record<string, unknown>,
  errors: DiagramSpecValidationError[],
): void {
  if (isRecord(value.metadata)) {
    validateMetadataSourceReference("metadata", value.metadata, errors);
    validateMetadataExternalReference("metadata", value.metadata, errors);
  }

  for (const collectionName of ["nodes", "edges", "groups"] as const) {
    const collection = value[collectionName];

    if (!Array.isArray(collection)) {
      continue;
    }

    collection.forEach((item, index) => {
      if (!isRecord(item) || !isRecord(item.metadata)) {
        return;
      }

      validateMetadataSourceReference(
        `${collectionName}[${index}].metadata`,
        item.metadata,
        errors,
      );
      validateMetadataExternalReference(
        `${collectionName}[${index}].metadata`,
        item.metadata,
        errors,
      );
    });
  }
}
