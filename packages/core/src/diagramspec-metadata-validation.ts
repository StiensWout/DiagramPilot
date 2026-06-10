import {
  externalReferenceExpected,
  sourceReferenceExpected,
  urlSchemePattern,
} from "./diagramspec-constants.js";
import type { DiagramSpecValidationError } from "./diagramspec-validation.js";
import {
  diagramObjectCollectionNames,
  forEachCollectionRecord,
  isRecord,
} from "./diagramspec-validation-helpers.js";

function isLocalSourceReference(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }

  const trimmedValue = value.trim();

  const checks = [
    trimmedValue.length > 0,
    trimmedValue === value,
    !urlSchemePattern.test(value),
    !value.startsWith("/"),
    !value.startsWith("//"),
  ];

  return checks.every(Boolean);
}

const externalUrlProtocols = new Set(["http:", "https:"]);

function parseUrlReference(value: string): URL | undefined {
  try {
    return new URL(value);
  } catch {
    return undefined;
  }
}

function isSupportedExternalUrl(url: URL): boolean {
  return externalUrlProtocols.has(url.protocol) && url.hostname.length > 0;
}

function isExternalUrlReference(value: unknown): value is string {
  if (typeof value !== "string" || value.trim() !== value) {
    return false;
  }

  const url = parseUrlReference(value);
  return url !== undefined && isSupportedExternalUrl(url);
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

  forEachCollectionRecord(
    value,
    diagramObjectCollectionNames,
    (item, index, collectionName) => {
      if (!isRecord(item.metadata)) return;

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
    },
  );
}
