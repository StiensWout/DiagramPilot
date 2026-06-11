import assert from "node:assert/strict";
import test from "node:test";

import { serializeDiagramPilotSourceFile } from "../packages/core/dist/index.js";

test("serializes DiagramPilot Source Files without dropping DiagramSpec data", () => {
  const content = serializeDiagramPilotSourceFile({
    version: 1,
    title: "Checkout Architecture",
    description: "Runtime dependency view.",
    direction: "right",
    nodes: [
      {
        id: "web_app",
        label: "Web App",
        kind: "frontend",
        description: "Browser checkout UI.",
        icon: "lucide:monitor",
        metadata: {
          source: "src/web",
          owner: "team-web",
        },
      },
      {
        id: "api",
        label: "API",
      },
    ],
    groups: [
      {
        id: "clients",
        label: "Clients",
        contains: ["web_app"],
        kind: "package",
        description: "External clients.",
        icon: "lucide:box",
        metadata: {
          note: "first group stays first",
        },
      },
    ],
    edges: [
      {
        id: "web_app_to_api",
        from: "web_app",
        to: "api",
        label: "HTTPS",
        kind: "request",
        description: "Checkout requests.",
        directed: false,
        metadata: {
          protocol: "https",
        },
      },
    ],
    metadata: {
      unknown_key: {
        nested: true,
      },
    },
  });

  assert.equal(
    content,
    [
      "version: 1",
      "title: Checkout Architecture",
      "description: Runtime dependency view.",
      "direction: right",
      "nodes:",
      "  - id: web_app",
      "    label: Web App",
      "    kind: frontend",
      "    description: Browser checkout UI.",
      "    icon: lucide:monitor",
      "    metadata:",
      "      source: src/web",
      "      owner: team-web",
      "  - id: api",
      "    label: API",
      "groups:",
      "  - id: clients",
      "    label: Clients",
      "    contains:",
      "      - web_app",
      "    kind: package",
      "    description: External clients.",
      "    icon: lucide:box",
      "    metadata:",
      "      note: first group stays first",
      "edges:",
      "  - id: web_app_to_api",
      "    from: web_app",
      "    to: api",
      "    label: HTTPS",
      "    kind: request",
      "    description: Checkout requests.",
      "    directed: false",
      "    metadata:",
      "      protocol: https",
      "metadata:",
      "  unknown_key:",
      "    nested: true",
      "",
    ].join("\n"),
  );
});
