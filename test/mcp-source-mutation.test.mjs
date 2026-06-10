import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";

import { withTempRepo } from "./cli-smoke-helpers.mjs";
import {
  assertFailedMutationPreservesSource,
  assertMutationFailedWithoutWrites,
  assertMutationSucceeded,
  assertSourceEquals,
  callMutateSource,
  writeSource,
} from "./mcp-source-mutation-helpers.mjs";

async function addBackendGroup(sourcePath) {
  return callMutateSource(sourcePath, {
    type: "add_group",
    group: { id: "backend", label: "Backend", contains: ["api"] },
  });
}

test("MCP mutate source tool updates a top-level title through a structured operation", async () => {
  await withTempRepo(async (tempRoot) => {
    const sourcePath = await writeSource(tempRoot);

    const mutated = await callMutateSource(sourcePath, {
      type: "set_title",
      title: "Checkout Runtime",
    });

    assertMutationSucceeded(mutated);
    assert.deepEqual(mutated.structuredContent, {
      ok: true,
      sourcePath,
      writtenPaths: [sourcePath],
      operation: "set_title",
      before: {
        exists: true,
        valid: true,
        title: "Checkout Architecture",
        nodeCount: 2,
        edgeCount: 1,
        groupCount: 0,
      },
      after: {
        exists: true,
        valid: true,
        title: "Checkout Runtime",
        nodeCount: 2,
        edgeCount: 1,
        groupCount: 0,
      },
    });
    await assertSourceEquals(sourcePath, [
        "version: 1",
        "title: Checkout Runtime",
        "direction: right",
        "nodes:",
        "  - id: web_app",
        "    label: Web App",
        "  - id: api",
        "    label: API",
        "edges:",
        "  - id: web_app_to_api",
        "    from: web_app",
        "    to: api",
        "    label: Calls",
        "",
    ]);
    assert.doesNotMatch(mutated.content[0].text, /web_app_to_api/);
  });
});

test("MCP mutate source tool updates top-level description direction and metadata keys", async () => {
  await withTempRepo(async (tempRoot) => {
    const sourcePath = await writeSource(tempRoot);

    await callMutateSource(sourcePath, {
      type: "set_description",
      description: "Runtime dependency view.",
    });
    await callMutateSource(sourcePath, {
      type: "set_direction",
      direction: "down",
    });
    await callMutateSource(sourcePath, {
      type: "set_metadata",
      key: "source",
      value: "architecture-review",
    });
    const mutated = await callMutateSource(sourcePath, {
      type: "delete_metadata",
      key: "source",
    });

    await assertSourceEquals(sourcePath, [
        "version: 1",
        "title: Checkout Architecture",
        "description: Runtime dependency view.",
        "direction: down",
        "nodes:",
        "  - id: web_app",
        "    label: Web App",
        "  - id: api",
        "    label: API",
        "edges:",
        "  - id: web_app_to_api",
        "    from: web_app",
        "    to: api",
        "    label: Calls",
        "",
    ]);
  });
});

test("MCP mutate source tool adds updates and removes nodes by Stable ID", async () => {
  await withTempRepo(async (tempRoot) => {
    const sourcePath = await writeSource(tempRoot);

    await callMutateSource(sourcePath, {
      type: "add_node",
      node: { id: "worker", label: "Worker" },
      beforeId: "api",
    });
    await callMutateSource(sourcePath, {
      type: "update_node",
      id: "worker",
      label: "Job Worker",
    });

    await assertSourceEquals(sourcePath, [
        "version: 1",
        "title: Checkout Architecture",
        "direction: right",
        "nodes:",
        "  - id: web_app",
        "    label: Web App",
        "  - id: worker",
        "    label: Job Worker",
        "  - id: api",
        "    label: API",
        "edges:",
        "  - id: web_app_to_api",
        "    from: web_app",
        "    to: api",
        "    label: Calls",
        "",
    ]);

    const removed = await callMutateSource(sourcePath, {
      type: "remove_node",
      id: "worker",
    });

    await assertSourceEquals(sourcePath, [
        "version: 1",
        "title: Checkout Architecture",
        "direction: right",
        "nodes:",
        "  - id: web_app",
        "    label: Web App",
        "  - id: api",
        "    label: API",
        "edges:",
        "  - id: web_app_to_api",
        "    from: web_app",
        "    to: api",
        "    label: Calls",
        "",
    ]);
  });
});

test("MCP mutate source tool adds updates and removes edges by Stable ID", async () => {
  await withTempRepo(async (tempRoot) => {
    const sourcePath = await writeSource(tempRoot);

    await callMutateSource(sourcePath, {
      type: "add_edge",
      edge: {
        id: "api_to_web_app",
        from: "api",
        to: "web_app",
      },
      afterId: "web_app_to_api",
    });
    await callMutateSource(sourcePath, {
      type: "update_edge",
      id: "api_to_web_app",
      label: "Responds",
    });

    await assertSourceEquals(sourcePath, [
        "version: 1",
        "title: Checkout Architecture",
        "direction: right",
        "nodes:",
        "  - id: web_app",
        "    label: Web App",
        "  - id: api",
        "    label: API",
        "edges:",
        "  - id: web_app_to_api",
        "    from: web_app",
        "    to: api",
        "    label: Calls",
        "  - id: api_to_web_app",
        "    from: api",
        "    to: web_app",
        "    label: Responds",
        "",
    ]);

    const removed = await callMutateSource(sourcePath, {
      type: "remove_edge",
      id: "web_app_to_api",
    });

    await assertSourceEquals(sourcePath, [
        "version: 1",
        "title: Checkout Architecture",
        "direction: right",
        "nodes:",
        "  - id: web_app",
        "    label: Web App",
        "  - id: api",
        "    label: API",
        "edges:",
        "  - id: api_to_web_app",
        "    from: api",
        "    to: web_app",
        "    label: Responds",
        "",
    ]);
  });
});

test("MCP mutate source tool adds updates and removes groups by Stable ID", async () => {
  await withTempRepo(async (tempRoot) => {
    const sourcePath = await writeSource(tempRoot);

    await addBackendGroup(sourcePath);
    await callMutateSource(sourcePath, {
      type: "update_group",
      id: "backend",
      label: "Backend Services",
    });

    await assertSourceEquals(sourcePath, [
        "version: 1",
        "title: Checkout Architecture",
        "direction: right",
        "nodes:",
        "  - id: web_app",
        "    label: Web App",
        "  - id: api",
        "    label: API",
        "groups:",
        "  - id: backend",
        "    label: Backend Services",
        "    contains:",
        "      - api",
        "edges:",
        "  - id: web_app_to_api",
        "    from: web_app",
        "    to: api",
        "    label: Calls",
        "",
    ]);

    const removed = await callMutateSource(sourcePath, {
      type: "remove_group",
      id: "backend",
    });

    await assertSourceEquals(sourcePath, [
        "version: 1",
        "title: Checkout Architecture",
        "direction: right",
        "nodes:",
        "  - id: web_app",
        "    label: Web App",
        "  - id: api",
        "    label: API",
        "edges:",
        "  - id: web_app_to_api",
        "    from: web_app",
        "    to: api",
        "    label: Calls",
        "",
    ]);
  });
});

test("MCP mutate source tool updates object metadata keys by Stable ID", async () => {
  await withTempRepo(async (tempRoot) => {
    const sourcePath = await writeSource(tempRoot);

    await addBackendGroup(sourcePath);
    await callMutateSource(sourcePath, {
      type: "set_object_metadata",
      id: "web_app",
      key: "owner",
      value: "frontend",
    });
    await callMutateSource(sourcePath, {
      type: "set_object_metadata",
      id: "web_app_to_api",
      key: "protocol",
      value: "https",
    });
    await callMutateSource(sourcePath, {
      type: "set_object_metadata",
      id: "backend",
      key: "tier",
      value: "service",
    });

    await assertSourceEquals(sourcePath, [
        "version: 1",
        "title: Checkout Architecture",
        "direction: right",
        "nodes:",
        "  - id: web_app",
        "    label: Web App",
        "    metadata:",
        "      owner: frontend",
        "  - id: api",
        "    label: API",
        "groups:",
        "  - id: backend",
        "    label: Backend",
        "    contains:",
        "      - api",
        "    metadata:",
        "      tier: service",
        "edges:",
        "  - id: web_app_to_api",
        "    from: web_app",
        "    to: api",
        "    label: Calls",
        "    metadata:",
        "      protocol: https",
        "",
    ]);

    const deleted = await callMutateSource(sourcePath, {
      type: "delete_object_metadata",
      id: "web_app",
      key: "owner",
    });

    assert.equal(deleted.isError, undefined);
    assert.doesNotMatch(await readFile(sourcePath, "utf8"), /owner: frontend/);
  });
});

test("MCP mutate source tool rolls back mutations that fail validation", async () => {
  await withTempRepo(async (tempRoot) => {
    const sourcePath = await writeSource(tempRoot);
    await assertFailedMutationPreservesSource(
      sourcePath,
      () =>
        callMutateSource(sourcePath, {
          type: "add_edge",
          edge: {
            id: "web_app_to_missing_service",
            from: "web_app",
            to: "missing_service",
          },
        }),
      (mutated) => {
        assert.match(mutated.structuredContent.errors[0].path, /edges/);
      },
    );
  });
});

test("MCP mutate source tool returns diagnostics for invalid sources before mutation", async () => {
  await withTempRepo(async (tempRoot) => {
    const docsPath = path.join(tempRoot, "docs");
    const sourcePath = path.join(docsPath, "broken.dp.yaml");
    await mkdir(docsPath, { recursive: true });
    await writeFile(sourcePath, "version: 1\ntitle: [broken\n");
    await assertFailedMutationPreservesSource(
      sourcePath,
      () =>
        callMutateSource(sourcePath, {
          type: "set_title",
          title: "Recovered",
        }),
      (mutated) => {
        assert.match(mutated.structuredContent.errors[0].message, /parse/i);
      },
    );
  });
});

test("MCP mutate source tool rejects raw YAML replacement and contains positioning", async () => {
  await withTempRepo(async (tempRoot) => {
    const sourcePath = await writeSource(tempRoot);
    const before = await readFile(sourcePath, "utf8");

    const rawReplacement = await callMutateSource(sourcePath, {
      type: "replace_yaml",
      yaml: "version: 1\ntitle: Replaced\nnodes: []\n",
    });

    assert.equal(rawReplacement.isError, true);
    assert.equal(rawReplacement.structuredContent.ok, false);
    assert.equal(rawReplacement.structuredContent.writtenPaths.length, 0);
    assert.match(
      rawReplacement.structuredContent.errors[0].message,
      /Unsupported/,
    );

    const containsPositioning = await callMutateSource(sourcePath, {
      type: "position_contains",
      id: "backend",
      childId: "api",
      beforeId: "web_app",
    });

    assert.equal(containsPositioning.isError, true);
    assert.equal(containsPositioning.structuredContent.ok, false);
    assert.equal(containsPositioning.structuredContent.writtenPaths.length, 0);
    assert.equal(await readFile(sourcePath, "utf8"), before);
  });
});

test("MCP mutate source tool rejects non-YAML source paths without writing", async () => {
  await withTempRepo(async (tempRoot) => {
    const docsPath = path.join(tempRoot, "docs");
    const sourcePath = path.join(docsPath, "architecture.dp.json");
    await mkdir(docsPath, { recursive: true });
    await writeFile(
      sourcePath,
      `${JSON.stringify({
        version: 1,
        title: "Checkout Architecture",
        nodes: [{ id: "web_app", label: "Web App" }],
      })}\n`,
    );
    const before = await readFile(sourcePath, "utf8");

    const mutated = await callMutateSource(sourcePath, {
      type: "set_title",
      title: "Checkout Runtime",
    });

    assertMutationFailedWithoutWrites(mutated);
    assert.match(mutated.structuredContent.errors[0].message, /\*\.dp\.yaml/);
    assert.equal(await readFile(sourcePath, "utf8"), before);
  });
});
