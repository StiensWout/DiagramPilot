import {
  allowedDirections,
  diagramspecV1SchemaId,
  iconReferenceExpected,
  iconReferenceSchemaPattern,
  metadataExternalUrlSchemaPattern,
  metadataSourceReferenceSchemaPattern,
  stableIdExpected,
} from "./diagramspec-constants.js";

export interface JsonSchemaDocument {
  [key: string]: unknown;
}

export function createDiagramSpecV1JsonSchema(): JsonSchemaDocument {
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: diagramspecV1SchemaId,
    title: "DiagramSpec v1",
    description:
      "Machine-readable helper schema for DiagramSpec v1 source shape. Core DiagramPilot validation remains authoritative for semantic rules.",
    type: "object",
    additionalProperties: false,
    required: ["version", "title", "nodes"],
    properties: {
      version: {
        description: "DiagramSpec contract version.",
        const: 1,
      },
      title: {
        description: "Human-readable diagram title.",
        type: "string",
      },
      description: {
        description:
          "Optional plain-text summary of what the diagram represents.",
        type: "string",
      },
      direction: {
        description: "Preferred layout direction. Defaults to right.",
        type: "string",
        enum: [...allowedDirections],
        default: "right",
      },
      nodes: {
        description:
          "Diagram nodes. Nodes are the only valid edge endpoints in DiagramSpec v1.",
        type: "array",
        minItems: 1,
        items: {
          $ref: "#/$defs/node",
        },
      },
      edges: {
        description: "Directed connections between nodes.",
        type: "array",
        items: {
          $ref: "#/$defs/edge",
        },
        default: [],
      },
      groups: {
        description: "Logical containers for nodes or other groups.",
        type: "array",
        items: {
          $ref: "#/$defs/group",
        },
        default: [],
      },
      views: {
        description: "Named projections from this DiagramSpec source.",
        type: "array",
        items: {
          $ref: "#/$defs/view",
        },
        default: [],
      },
      layout: {
        $ref: "#/$defs/layout",
      },
      metadata: {
        $ref: "#/$defs/metadata",
      },
    },
    $defs: {
      stableId: {
        description: "Lowercase snake case stable ID.",
        type: "string",
        pattern: stableIdExpected,
      },
      plainText: {
        description:
          "Plain text. Markdown is not part of the DiagramSpec v1 text contract.",
        type: "string",
      },
      iconReference: {
        description: iconReferenceExpected,
        type: "string",
        pattern: iconReferenceSchemaPattern,
      },
      metadata: {
        description:
          "Free-form metadata. DiagramPilot preserves unknown metadata keys.",
        type: "object",
        additionalProperties: true,
        properties: {
          source: {
            description: "Local repository path or path-like glob.",
            type: "string",
            pattern: metadataSourceReferenceSchemaPattern,
          },
          external_url: {
            description:
              "External HTTP(S) URL that points to supporting context.",
            type: "string",
            pattern: metadataExternalUrlSchemaPattern,
          },
        },
      },
      node: {
        description: "Diagram node.",
        type: "object",
        additionalProperties: false,
        required: ["id", "label"],
        properties: {
          id: {
            $ref: "#/$defs/stableId",
          },
          label: {
            $ref: "#/$defs/plainText",
          },
          kind: {
            $ref: "#/$defs/stableId",
          },
          description: {
            $ref: "#/$defs/plainText",
          },
          icon: {
            $ref: "#/$defs/iconReference",
          },
          metadata: {
            $ref: "#/$defs/metadata",
          },
        },
      },
      edge: {
        description:
          "Connection between nodes. JSON Schema checks endpoint ID shape; core validation checks that endpoints reference existing nodes.",
        type: "object",
        additionalProperties: false,
        required: ["id", "from", "to"],
        properties: {
          id: {
            $ref: "#/$defs/stableId",
          },
          from: {
            $ref: "#/$defs/stableId",
          },
          to: {
            $ref: "#/$defs/stableId",
          },
          label: {
            $ref: "#/$defs/plainText",
          },
          kind: {
            description:
              "Open semantic tag for edge meaning. DiagramPilot has recommended known kinds, but custom stable-id-shaped kinds remain valid.",
            $ref: "#/$defs/stableId",
          },
          description: {
            $ref: "#/$defs/plainText",
          },
          directed: {
            description:
              "Whether the edge is directed. Edges are directed by default.",
            type: "boolean",
            default: true,
          },
          metadata: {
            $ref: "#/$defs/metadata",
          },
        },
      },
      group: {
        description:
          "Logical container for nodes or groups. JSON Schema checks contained ID shape; core validation checks references, duplicate parentage, and cycles.",
        type: "object",
        additionalProperties: false,
        required: ["id", "label", "contains"],
        properties: {
          id: {
            $ref: "#/$defs/stableId",
          },
          label: {
            $ref: "#/$defs/plainText",
          },
          contains: {
            description: "Node or group IDs contained by this group.",
            type: "array",
            items: {
              $ref: "#/$defs/stableId",
            },
          },
          kind: {
            $ref: "#/$defs/stableId",
          },
          description: {
            $ref: "#/$defs/plainText",
          },
          icon: {
            $ref: "#/$defs/iconReference",
          },
          metadata: {
            $ref: "#/$defs/metadata",
          },
        },
      },
      layout: {
        description:
          "Soft renderer-neutral layout intent. Hints are portability guidance, not hard rendering guarantees.",
        type: "object",
        additionalProperties: false,
        properties: {
          hints: {
            description:
              "Renderer-neutral layout hints for review ergonomics.",
            type: "array",
            items: {
              $ref: "#/$defs/layoutHint",
            },
            default: [],
          },
        },
      },
      layoutHint: {
        description:
          "Soft layout intent for a set of nodes. Renderers may ignore hints they cannot represent cleanly.",
        type: "object",
        additionalProperties: false,
        required: ["id", "kind", "nodes"],
        properties: {
          id: {
            $ref: "#/$defs/stableId",
          },
          kind: {
            description:
              "Renderer-neutral layout intent. primary_flow marks the main ordered path; same_layer marks peers that should stay visually aligned when possible.",
            type: "string",
            enum: ["primary_flow", "same_layer"],
          },
          nodes: {
            description:
              "Node IDs participating in this layout hint. Core validation checks references.",
            type: "array",
            minItems: 1,
            items: {
              $ref: "#/$defs/stableId",
            },
          },
          metadata: {
            $ref: "#/$defs/metadata",
          },
        },
      },
      view: {
        description: "Named projection filters.",
        type: "object",
        additionalProperties: false,
        required: ["id"],
        properties: {
          id: {
            $ref: "#/$defs/stableId",
          },
          label: {
            $ref: "#/$defs/plainText",
          },
          description: {
            $ref: "#/$defs/plainText",
          },
          groups: {
            type: "array",
            items: {
              $ref: "#/$defs/stableId",
            },
          },
          nodes: {
            type: "array",
            items: {
              $ref: "#/$defs/stableId",
            },
          },
          edges: {
            type: "array",
            items: {
              $ref: "#/$defs/stableId",
            },
          },
          nodeKinds: {
            type: "array",
            items: {
              $ref: "#/$defs/stableId",
            },
          },
          edgeKinds: {
            type: "array",
            items: {
              $ref: "#/$defs/stableId",
            },
          },
          metadata: {
            $ref: "#/$defs/metadata",
          },
        },
      },
    },
  };
}
