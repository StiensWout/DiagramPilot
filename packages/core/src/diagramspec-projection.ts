import type {
  DiagramSpec,
  DiagramSpecGroup,
} from "./diagramspec-topology.js";
import type { RepairableDiagnostic } from "./diagramspec-validation.js";

export interface DiagramSpecGroupProjectionSelection {
  nodeIds: ReadonlySet<string>;
  groupIds: ReadonlySet<string>;
}

export interface UnknownDiagramSpecReferenceOptions {
  path: "groups" | "nodes" | "views";
  id: string;
  ids: readonly string[];
  objectLabel: "group" | "node" | "view";
}

export function createUnknownDiagramSpecReferenceDiagnostic(
  options: UnknownDiagramSpecReferenceOptions,
): RepairableDiagnostic {
  const expected =
    options.ids.length === 0
      ? `A declared DiagramSpec ${options.objectLabel} ID.`
      : `One of: ${options.ids.join(", ")}.`;

  return {
    path: options.path,
    message: `Unknown DiagramSpec ${options.objectLabel} "${options.id}".`,
    badValue: options.id,
    expected,
    suggestion: `Choose a ${options.objectLabel} ID declared in the DiagramSpec ${options.path} collection.`,
  };
}

export function selectedDiagramSpecGroups(
  spec: DiagramSpec,
  selection: DiagramSpecGroupProjectionSelection,
): DiagramSpecGroup[] {
  return (spec.groups ?? [])
    .filter((group) => selection.groupIds.has(group.id))
    .map((group) => ({
      ...group,
      contains: group.contains.filter(
        (id) => selection.nodeIds.has(id) || selection.groupIds.has(id),
      ),
    }));
}
