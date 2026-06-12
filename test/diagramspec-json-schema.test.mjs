import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { createDiagramSpecV1JsonSchema } from "../packages/core/dist/index.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const schemaPath = path.join(repoRoot, "schema", "diagramspec-v1.schema.json");

async function loadSchema() {
  return JSON.parse(await readFile(schemaPath, "utf8"));
}

function resolveReference(rootSchema, reference) {
  assert.equal(reference.startsWith("#/"), true);

  return reference
    .slice(2)
    .split("/")
    .reduce(
      (schema, segment) =>
        schema[segment.replaceAll("~1", "/").replaceAll("~0", "~")],
      rootSchema,
    );
}

function matchesJsonSchemaType(value, type) {
  const matchers = {
    array: Array.isArray,
    object: isJsonSchemaObject,
  };

  return (matchers[type] ?? ((candidate) => typeof candidate === type))(value);
}

function isJsonSchemaObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function schemaError(path, keyword) {
  return { path, keyword };
}

function validateSchemaReference(rootSchema, schema, candidate, candidatePath, validate) {
  if (schema.$ref === undefined) return false;

  validate(resolveReference(rootSchema, schema.$ref), candidate, candidatePath);
  return true;
}

function validateSchemaType(schema, candidate, candidatePath, errors) {
  if (
    schema.type === undefined ||
    matchesJsonSchemaType(candidate, schema.type)
  ) {
    return true;
  }

  errors.push(schemaError(candidatePath, "type"));
  return false;
}

function validateScalarKeywords(schema, candidate, candidatePath, errors) {
  validateConstKeyword(schema, candidate, candidatePath, errors);
  validateEnumKeyword(schema, candidate, candidatePath, errors);
  validatePatternKeyword(schema, candidate, candidatePath, errors);
}

function validateConstKeyword(schema, candidate, candidatePath, errors) {
  if (!("const" in schema) || candidate === schema.const) return;

    errors.push(schemaError(candidatePath, "const"));
}

function validateEnumKeyword(schema, candidate, candidatePath, errors) {
  if (schema.enum === undefined || schema.enum.includes(candidate)) return;

  errors.push(schemaError(candidatePath, "enum"));
}

function validatePatternKeyword(schema, candidate, candidatePath, errors) {
  if (schema.pattern === undefined || typeof candidate !== "string") return;
  if (new RegExp(schema.pattern, "u").test(candidate)) return;

  errors.push(schemaError(candidatePath, "pattern"));
}

function validateArrayKeywords(schema, candidate, candidatePath, errors, validate) {
  if (!Array.isArray(candidate)) return;

  validateMinItems(schema, candidate, candidatePath, errors);
  validateArrayItems(schema, candidate, candidatePath, validate);
}

function validateMinItems(schema, candidate, candidatePath, errors) {
  if (schema.minItems !== undefined && candidate.length < schema.minItems) {
    errors.push(schemaError(candidatePath, "minItems"));
  }
}

function validateArrayItems(schema, candidate, candidatePath, validate) {
  if (schema.items === undefined) return;

  candidate.forEach((item, index) => {
    validate(schema.items, item, `${candidatePath}[${index}]`);
  });
}

function validateRequiredProperties(schema, candidate, candidatePath, errors) {
  for (const requiredProperty of schema.required ?? []) {
    if (!Object.hasOwn(candidate, requiredProperty)) {
      errors.push(schemaError(`${candidatePath}.${requiredProperty}`, "required"));
    }
  }
}

function validateDeclaredProperties(schema, candidate, candidatePath, validate) {
  const properties = schema.properties ?? {};

  for (const [propertyName, propertySchema] of Object.entries(properties)) {
    if (Object.hasOwn(candidate, propertyName)) {
      validate(propertySchema, candidate[propertyName], `${candidatePath}.${propertyName}`);
    }
  }

  return properties;
}

function validateAdditionalProperties(
  schema,
  candidate,
  candidatePath,
  properties,
  errors,
) {
  if (schema.additionalProperties !== false) return;

  for (const propertyName of Object.keys(candidate)) {
    if (!Object.hasOwn(properties, propertyName)) {
      errors.push(
        schemaError(`${candidatePath}.${propertyName}`, "additionalProperties"),
      );
    }
  }
}

function isSchemaObjectCandidate(candidate) {
  return (
    typeof candidate === "object" &&
    candidate !== null &&
    !Array.isArray(candidate)
  );
}

function validateWithSchema(rootSchema, value) {
  const errors = [];

  function validate(schema, candidate, candidatePath) {
    if (validateSchemaReference(rootSchema, schema, candidate, candidatePath, validate)) return;
    if (!validateSchemaType(schema, candidate, candidatePath, errors)) return;

    validateScalarKeywords(schema, candidate, candidatePath, errors);
    validateArrayKeywords(schema, candidate, candidatePath, errors, validate);

    if (!isSchemaObjectCandidate(candidate)) return;

    validateRequiredProperties(schema, candidate, candidatePath, errors);
    const properties = validateDeclaredProperties(schema, candidate, candidatePath, validate);
    validateAdditionalProperties(schema, candidate, candidatePath, properties, errors);
  }

  validate(rootSchema, value, "$");

  return errors;
}

test("DiagramSpec v1 JSON Schema is published at the stable public route shape", async () => {
  const schema = await loadSchema();

  assert.equal(
    schema.$id,
    "https://diagrampilot.com/schema/diagramspec-v1.schema.json",
  );
  assert.equal(schema.title, "DiagramSpec v1");
  assert.deepEqual(schema.required, ["version", "title", "nodes"]);
  assert.equal(schema.properties.version.const, 1);
  assert.equal(schema.properties.nodes.type, "array");
  assert.equal(schema.properties.nodes.minItems, 1);
});

test("committed DiagramSpec v1 JSON Schema matches the generated core schema", async () => {
  const schema = await loadSchema();

  assert.deepEqual(schema, createDiagramSpecV1JsonSchema());
});

test("DiagramSpec v1 JSON Schema describes source object shapes without closing extension points", async () => {
  const schema = await loadSchema();

  assert.match(schema.description, /Core DiagramPilot validation remains authoritative/);
  assert.deepEqual(schema.properties.direction.enum, [
    "right",
    "left",
    "down",
    "up",
  ]);
  assert.equal(schema.properties.nodes.items.$ref, "#/$defs/node");
  assert.equal(schema.properties.edges.items.$ref, "#/$defs/edge");
  assert.equal(schema.properties.groups.items.$ref, "#/$defs/group");
  assert.equal(schema.properties.views.items.$ref, "#/$defs/view");
  assert.equal(schema.properties.metadata.$ref, "#/$defs/metadata");

  assert.equal(schema.$defs.stableId.pattern, "^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$");
  assert.equal(schema.$defs.iconReference.pattern, "^[a-z][a-z0-9-]*:[^\\s:]+$");

  assert.deepEqual(schema.$defs.node.required, ["id", "label"]);
  assert.equal(schema.$defs.node.properties.id.$ref, "#/$defs/stableId");
  assert.equal(schema.$defs.node.properties.kind.$ref, "#/$defs/stableId");
  assert.equal(schema.$defs.node.properties.icon.$ref, "#/$defs/iconReference");
  assert.equal(schema.$defs.node.properties.metadata.$ref, "#/$defs/metadata");

  assert.deepEqual(schema.$defs.edge.required, ["id", "from", "to"]);
  assert.equal(schema.$defs.edge.properties.id.$ref, "#/$defs/stableId");
  assert.equal(schema.$defs.edge.properties.from.$ref, "#/$defs/stableId");
  assert.equal(schema.$defs.edge.properties.to.$ref, "#/$defs/stableId");
  assert.equal(schema.$defs.edge.properties.kind.$ref, "#/$defs/stableId");
  assert.match(
    schema.$defs.edge.properties.kind.description,
    /Open semantic tag/,
  );
  assert.equal(schema.$defs.edge.properties.directed.type, "boolean");

  assert.deepEqual(schema.$defs.group.required, ["id", "label", "contains"]);
  assert.equal(schema.$defs.group.properties.id.$ref, "#/$defs/stableId");
  assert.equal(schema.$defs.group.properties.kind.$ref, "#/$defs/stableId");
  assert.equal(schema.$defs.group.properties.contains.items.$ref, "#/$defs/stableId");

  assert.deepEqual(schema.$defs.view.required, ["id"]);
  assert.equal(schema.$defs.view.properties.id.$ref, "#/$defs/stableId");
  assert.equal(schema.$defs.view.properties.groups.items.$ref, "#/$defs/stableId");
  assert.equal(schema.$defs.view.properties.nodes.items.$ref, "#/$defs/stableId");
  assert.equal(schema.$defs.view.properties.edges.items.$ref, "#/$defs/stableId");
  assert.equal(schema.$defs.view.properties.nodeKinds.items.$ref, "#/$defs/stableId");
  assert.equal(schema.$defs.view.properties.edgeKinds.items.$ref, "#/$defs/stableId");
  assert.equal(schema.$defs.view.properties.metadata.$ref, "#/$defs/metadata");

  assert.equal(schema.$defs.metadata.type, "object");
  assert.equal(schema.$defs.metadata.additionalProperties, true);
  assert.equal(schema.$defs.metadata.properties.source.type, "string");
  assert.equal(
    new RegExp(schema.$defs.metadata.properties.external_url.pattern, "u").test(
      "https://example.com/context",
    ),
    true,
  );
  assert.equal(
    new RegExp(schema.$defs.metadata.properties.external_url.pattern, "u").test(
      "ftp://example.com/context",
    ),
    false,
  );
});

test("DiagramSpec v1 JSON Schema validates representative source fixtures", async () => {
  const schema = await loadSchema();
  const validSpec = {
    version: 1,
    title: "Checkout Architecture",
    description: "Runtime request path for checkout.",
    direction: "down",
    metadata: {
      source: "demo-projects/checkout/src/**/*.ts",
      external_url: "https://example.com/checkout-architecture",
      review_owner: "platform_team",
      lifecycle: {
        stage: "beta",
      },
    },
    nodes: [
      {
        id: "web_app",
        label: "Web App",
        kind: "frontend",
        icon: "lucide:monitor",
        metadata: {
          source: "src/web/checkout-page.tsx",
          codeowners: ["platform_team"],
        },
      },
      {
        id: "api_gateway",
        label: "API Gateway",
        kind: "service",
      },
    ],
    edges: [
      {
        id: "web_app_to_api_gateway",
        from: "web_app",
        to: "api_gateway",
        label: "HTTPS",
        kind: "request",
        directed: false,
        metadata: {
          protocol_hint: "https",
        },
      },
    ],
    groups: [
      {
        id: "checkout_surface",
        label: "Checkout Surface",
        contains: ["web_app", "api_gateway"],
        icon: "lucide:box",
        metadata: {
          source: "demo-projects/checkout",
        },
      },
    ],
    views: [
      {
        id: "runtime",
        label: "Runtime",
        description: "Focused runtime projection.",
        groups: ["checkout_surface"],
        nodes: ["web_app"],
        edges: ["web_app_to_api_gateway"],
        nodeKinds: ["frontend"],
        edgeKinds: ["request"],
        metadata: {
          audience: "agent_review",
        },
      },
    ],
  };

  assert.deepEqual(validateWithSchema(schema, validSpec), []);

  const invalidCases = [
    {
      name: "requires top-level title",
      spec: (() => {
        const { title: _title, ...specWithoutTitle } = validSpec;

        return specWithoutTitle;
      })(),
      expected: schemaError("$.title", "required"),
    },
    {
      name: "requires at least one node",
      spec: { ...validSpec, nodes: [] },
      expected: schemaError("$.nodes", "minItems"),
    },
    {
      name: "limits direction values",
      spec: { ...validSpec, direction: "sideways" },
      expected: schemaError("$.direction", "enum"),
    },
    {
      name: "checks node IDs",
      spec: {
        ...validSpec,
        nodes: [{ ...validSpec.nodes[0], id: "Web App" }],
      },
      expected: schemaError("$.nodes[0].id", "pattern"),
    },
    {
      name: "requires node labels",
      spec: {
        ...validSpec,
        nodes: [{ id: "web_app" }],
      },
      expected: schemaError("$.nodes[0].label", "required"),
    },
    {
      name: "checks edge directed shape",
      spec: {
        ...validSpec,
        edges: [{ ...validSpec.edges[0], directed: "yes" }],
      },
      expected: schemaError("$.edges[0].directed", "type"),
    },
    {
      name: "requires group containment list",
      spec: {
        ...validSpec,
        groups: [{ id: "checkout_surface", label: "Checkout Surface" }],
      },
      expected: schemaError("$.groups[0].contains", "required"),
    },
    {
      name: "requires view IDs",
      spec: {
        ...validSpec,
        views: [{ groups: ["checkout_surface"] }],
      },
      expected: schemaError("$.views[0].id", "required"),
    },
    {
      name: "checks view filter ID shapes",
      spec: {
        ...validSpec,
        views: [{ id: "runtime", groups: ["Checkout Surface"] }],
      },
      expected: schemaError("$.views[0].groups[0]", "pattern"),
    },
    {
      name: "keeps metadata.source local",
      spec: {
        ...validSpec,
        metadata: { source: "https://example.com/source" },
      },
      expected: schemaError("$.metadata.source", "pattern"),
    },
    {
      name: "requires external_url to have an HTTP(S) host",
      spec: {
        ...validSpec,
        metadata: { external_url: "https://" },
      },
      expected: schemaError("$.metadata.external_url", "pattern"),
    },
  ];

  for (const { name, spec, expected } of invalidCases) {
    const errors = validateWithSchema(schema, spec);

    assert.equal(
      errors.some(
        (error) =>
          error.path === expected.path && error.keyword === expected.keyword,
      ),
      true,
      `${name}: expected ${expected.keyword} at ${expected.path}, got ${JSON.stringify(errors)}`,
    );
  }
});
