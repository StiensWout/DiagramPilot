import { writeFileSync } from "node:fs";

import {
  loadValidatedDiagramSpec,
  serializeDiagramPilotSourceFile,
  type DiagramSpec,
  validateDiagramSpec,
} from "@diagrampilot/core";

import type {
  DiagramPilotMcpToolDependencies,
  DiagramPilotMcpToolResult,
} from "./types.js";
import {
  stringArgument,
  toolResult,
  validationFailureResult,
} from "./tool-helpers.js";
import {
  applySourceMutation,
  diagramSummary,
  operationArgument,
  type SourceMutationOperation,
} from "./source-mutation-operations.js";

type MutatedSpecResult = {
  ok: true;
  operationType: string;
  spec: DiagramSpec;
};
type LoadedMutationSource = {
  ok: true;
  spec: DiagramSpec;
};

function validationErrorResult(
  sourcePath: string,
  operationType: string,
  before: Record<string, unknown>,
  spec: DiagramSpec,
): DiagramPilotMcpToolResult | undefined {
  const validation = validateDiagramSpec(spec);
  if (validation.ok) return undefined;

  const structuredContent = {
    ok: false,
    sourcePath,
    writtenPaths: [],
    operation: operationType,
    before,
    errors: validation.errors,
  };

  return toolResult(
    `${JSON.stringify(structuredContent, null, 2)}\n`,
    structuredContent,
    { isError: true },
  );
}

function operationErrorResult(
  sourcePath: string,
  before: Record<string, unknown>,
  error: unknown,
): DiagramPilotMcpToolResult {
  const message = error instanceof Error ? error.message : String(error);
  const structuredContent = {
    ok: false,
    sourcePath,
    writtenPaths: [],
    before,
    errors: [
      {
        path: "operation.type",
        message,
        expected:
          "A supported structured DiagramPilot source mutation operation.",
        suggestion:
          "Use operations such as set_title, add_node, update_edge, or set_object_metadata.",
      },
    ],
  };

  return toolResult(
    `${JSON.stringify(structuredContent, null, 2)}\n`,
    structuredContent,
    { isError: true },
  );
}

function sourceLoadFailureResult(
  sourcePath: string,
  failure: Parameters<typeof validationFailureResult>[0],
): DiagramPilotMcpToolResult {
  const failureResult = validationFailureResult(failure);
  const structuredContent = {
    ...(failureResult.structuredContent as Record<string, unknown>),
    sourcePath,
    writtenPaths: [],
  };

  return toolResult(
    `${JSON.stringify(structuredContent, null, 2)}\n`,
    structuredContent,
    { isError: true },
  );
}

function mutateLoadedSpec(
  sourcePath: string,
  spec: DiagramSpec,
  operation: SourceMutationOperation,
): MutatedSpecResult | DiagramPilotMcpToolResult {
  const before = diagramSummary(spec);
  const mutated = structuredClone(spec) as DiagramSpec;

  try {
    const operationType = applySourceMutation(mutated, operation);
    const validationError = validationErrorResult(
      sourcePath,
      operationType,
      before,
      mutated,
    );
    return validationError ?? { ok: true, operationType, spec: mutated };
  } catch (error) {
    return operationErrorResult(sourcePath, before, error);
  }
}

function isMutatedSpecResult(
  result: MutatedSpecResult | DiagramPilotMcpToolResult,
): result is MutatedSpecResult {
  return "ok" in result && result.ok === true;
}

function loadSourceForMutation(
  sourcePath: string,
): LoadedMutationSource | DiagramPilotMcpToolResult {
  const loaded = loadValidatedDiagramSpec(sourcePath);
  if (loaded.ok) return { ok: true, spec: loaded.spec };
  return sourceLoadFailureResult(sourcePath, loaded.failure);
}

function isLoadedMutationSource(
  result: LoadedMutationSource | DiagramPilotMcpToolResult,
): result is LoadedMutationSource {
  return "ok" in result && result.ok === true;
}

function writeMutationResult(
  sourcePath: string,
  originalSpec: DiagramSpec,
  mutation: MutatedSpecResult,
  dependencies: DiagramPilotMcpToolDependencies,
): DiagramPilotMcpToolResult {
  const content = serializeDiagramPilotSourceFile(mutation.spec);
  const write = dependencies.writeFile ?? writeFileSync;
  write(sourcePath, content);

  const reloaded = loadValidatedDiagramSpec(sourcePath);
  if (!reloaded.ok) return sourceLoadFailureResult(sourcePath, reloaded.failure);

  const structuredContent = {
    ok: true,
    sourcePath,
    writtenPaths: [sourcePath],
    operation: mutation.operationType,
    before: diagramSummary(originalSpec),
    after: diagramSummary(reloaded.spec),
  };

  return toolResult(
    `${JSON.stringify(structuredContent, null, 2)}\n`,
    structuredContent,
  );
}

export async function mutateSourceTool(
  args: Record<string, unknown>,
  dependencies: DiagramPilotMcpToolDependencies,
): Promise<DiagramPilotMcpToolResult> {
  const sourcePath = stringArgument(args, "source_path");
  const operation = operationArgument(args);
  const loaded = loadSourceForMutation(sourcePath);
  if (!isLoadedMutationSource(loaded)) return loaded;

  const mutation = mutateLoadedSpec(sourcePath, loaded.spec, operation);
  if (!isMutatedSpecResult(mutation)) return mutation;
  return writeMutationResult(sourcePath, loaded.spec, mutation, dependencies);
}
