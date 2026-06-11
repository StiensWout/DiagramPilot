import {
  createDiagramPilotSourceTemplate,
  diagramPilotSourceTemplateNames,
} from "@diagrampilot/core";

import { createUsageText, textLine } from "./cli-output.js";
import type { CommandPlanningDependencies } from "./command-planning-dependencies.js";
import type { CommandPlan } from "./types.js";
import { usageFailurePlan } from "./source-command-planning.js";

interface CreateCommandOptions {
  path: string;
  template: string;
}

type CreateArgsResult =
  | {
      ok: true;
      options: CreateCommandOptions;
    }
  | {
      ok: false;
      message: string;
    };

type CreateValueResult =
  | {
      ok: true;
      value: string;
    }
  | {
      ok: false;
      message: string;
    };

type TemplateResult = ReturnType<typeof createDiagramPilotSourceTemplate>;

function parseCreatePathArg(pathArg: string | undefined): CreateValueResult {
  if (pathArg === undefined) {
    return { ok: false, message: "Missing create path." };
  }

  if (pathArg.startsWith("-")) {
    return { ok: false, message: `Unknown create option: ${pathArg}` };
  }

  return { ok: true, value: pathArg };
}

function unexpectedTemplateFlagMessage(templateFlag: string): string {
  return templateFlag.startsWith("-")
    ? `Unknown create option: ${templateFlag}`
    : `Unexpected create argument: ${templateFlag}`;
}

function parseCreateTemplateFlag(
  templateFlag: string | undefined,
): CreateValueResult {
  if (templateFlag === undefined) {
    return { ok: false, message: "Missing create template." };
  }

  if (templateFlag !== "--template") {
    return { ok: false, message: unexpectedTemplateFlagMessage(templateFlag) };
  }

  return { ok: true, value: templateFlag };
}

function parseCreateTemplateName(templateName: string | undefined): CreateValueResult {
  if (templateName === undefined) {
    return { ok: false, message: "Missing create template." };
  }

  return { ok: true, value: templateName };
}

function parseCreateTemplateArg(
  templateFlag: string | undefined,
  templateName: string | undefined,
): CreateValueResult {
  const flag = parseCreateTemplateFlag(templateFlag);
  if (!flag.ok) return flag;

  return parseCreateTemplateName(templateName);
}

function parseCreateArgs(args: readonly string[]): CreateArgsResult {
  const [pathArg, templateFlag, templateName, unexpectedArg] = args;
  const path = parseCreatePathArg(pathArg);
  if (!path.ok) return path;

  const template = parseCreateTemplateArg(templateFlag, templateName);
  if (!template.ok) return template;

  if (unexpectedArg !== undefined) {
    return { ok: false, message: `Unexpected create argument: ${unexpectedArg}` };
  }

  return {
    ok: true,
    options: {
      path: path.value,
      template: template.value,
    },
  };
}

function defaultSvgPath(sourcePath: string): string {
  return sourcePath.replace(/\.dp\.yaml$/u, ".svg");
}

function isDiagramPilotSourcePath(sourcePath: string): boolean {
  return sourcePath.endsWith(".dp.yaml");
}

function createTemplateList(): string {
  return diagramPilotSourceTemplateNames.join(", ");
}

function createOverwriteFailurePlan(sourcePath: string): CommandPlan {
  return {
    exitCode: 1,
    stdout: "",
    stderr: textLine(
      [
        `DiagramPilot Source File already exists: ${sourcePath}`,
        "Suggestion: choose a new path or remove the existing file before running create.",
      ].join("\n"),
    ),
    writes: [],
  };
}

function createTargetFailurePlan(
  sourcePath: string,
  dependencies: CommandPlanningDependencies,
): CommandPlan | undefined {
  if (!isDiagramPilotSourcePath(sourcePath)) {
    return usageFailurePlan(
      "Create path must end with .dp.yaml.",
      createUsageText(),
    );
  }

  if (dependencies.pathExists?.(sourcePath) === true) {
    return createOverwriteFailurePlan(sourcePath);
  }

  return undefined;
}

function createSuccessPlan(
  sourcePath: string,
  templateName: string,
  content: string,
): CommandPlan {
  const svgPath = defaultSvgPath(sourcePath);

  return {
    exitCode: 0,
    stdout: [
      `Created ${sourcePath} from ${templateName} template.`,
      `Next: diagrampilot validate ${sourcePath}`,
      `Render SVG: diagrampilot render ${sourcePath} --out ${svgPath}`,
      "",
    ].join("\n"),
    stderr: "",
    writes: [
      {
        path: sourcePath,
        content,
      },
    ],
  };
}

function createTemplateFailurePlan(result: Extract<TemplateResult, { ok: false }>) {
  return usageFailurePlan(
    `${result.message}. Available templates: ${createTemplateList()}.`,
    createUsageText(),
  );
}

export function planCreate(
  args: readonly string[],
  dependencies: CommandPlanningDependencies,
): CommandPlan {
  const argsResult = parseCreateArgs(args);

  if (!argsResult.ok) {
    return usageFailurePlan(argsResult.message, createUsageText());
  }

  const { path, template } = argsResult.options;
  const targetFailurePlan = createTargetFailurePlan(path, dependencies);
  if (targetFailurePlan !== undefined) return targetFailurePlan;

  const templateResult = createDiagramPilotSourceTemplate(template);
  if (!templateResult.ok) return createTemplateFailurePlan(templateResult);

  return createSuccessPlan(path, templateResult.name, templateResult.content);
}
