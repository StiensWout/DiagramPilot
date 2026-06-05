export const allowedDirections = ["right", "left", "down", "up"] as const;
export const allowedDirectionList = allowedDirections.join(", ");
export const stableIdPattern = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/;
export const stableIdExpected = "^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$";
export const urlSchemePattern = /^[a-z][a-z0-9+.-]*:/i;
export const sourceReferenceExpected =
  "Local repository path or path-like glob, such as src/gateway or packages/*/src/**/*.ts.";
export const externalReferenceExpected =
  "External HTTP(S) URL, such as https://example.com/context.";
export const iconReferenceExpected =
  "Namespaced icon reference, such as lucide:database.";
export const diagramspecV1SchemaId =
  "https://diagrampilot.com/schema/diagramspec-v1.schema.json";
export const iconReferenceSchemaPattern = "^[a-z][a-z0-9-]*:[^\\s:]+$";
export const metadataSourceReferenceSchemaPattern =
  "^(?![A-Za-z][A-Za-z0-9+.-]*:)(?!/)(?!//)\\S(?:.*\\S)?$";
export const metadataExternalUrlSchemaPattern = "^https?://[^\\s/?#]+(?:[/?#].*)?$";
