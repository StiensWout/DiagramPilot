import { readFileSync } from "node:fs";

import type { RepairableDiagnostic } from "./diagramspec-validation.js";
import type { RepoWorkflowConfigFailure } from "./repo-workflow-config.js";
import { invalidConfig } from "./repo-workflow-config-validation.js";
import { parseYamlDocument } from "./yaml-parse.js";

export function invalidConfigFailure(
  configPath: string,
  diagnostic: RepairableDiagnostic,
): RepoWorkflowConfigFailure {
  const result = invalidConfig(configPath, diagnostic);

  if (result.ok) {
    throw new Error("Expected invalid Repo Workflow Configuration result.");
  }

  return result.failure;
}

export function readRepoWorkflowConfigContent(configPath: string):
  | {
      ok: true;
      content: string;
    }
  | {
      ok: false;
      failure: RepoWorkflowConfigFailure;
    } {
  try {
    return {
      ok: true,
      content: readFileSync(configPath, "utf8"),
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to read config.";

    return {
      ok: false,
      failure: invalidConfigFailure(configPath, {
        path: "$",
        message: `Unable to read Repo Workflow Configuration: ${message}`,
        expected: "Readable Repo Workflow Configuration.",
        suggestion: "Check that the config file exists and is readable.",
      }),
    };
  }
}

export function parseRepoWorkflowConfigValue(configPath: string, content: string):
  | {
      ok: true;
      value: unknown;
    }
  | {
      ok: false;
      failure: RepoWorkflowConfigFailure;
    } {
  const { document, firstError, firstErrorPosition } = parseYamlDocument(content);

  if (firstError === undefined) {
    return {
      ok: true,
      value: document.toJS(),
    };
  }

  const { line, column } = firstErrorPosition;
  const location =
    line === undefined || column === undefined
      ? ""
      : ` at line ${line}, column ${column}`;

  return {
    ok: false,
    failure: invalidConfigFailure(configPath, {
      path: "$",
      message: `YAML parse error${location}: ${firstError.message}`,
      expected: "Valid YAML Repo Workflow Configuration syntax.",
      suggestion: "Fix the YAML syntax before running repo workflow commands.",
    }),
  };
}
