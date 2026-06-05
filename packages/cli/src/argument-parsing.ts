export interface ValidateOptions {
  json: boolean;
  sourcePath: string;
}

export interface ExportOptions {
  format: "d2" | "mermaid";
  outPath?: string;
  sourcePath: string;
}

export interface RenderCommandOptions {
  outPath: string;
  sourcePath: string;
}

export interface CheckCommandOptions {
  json: boolean;
  scopePath?: string;
}

type ValidateArgsResult =
  | {
      ok: true;
      options: ValidateOptions;
    }
  | {
      ok: false;
      message: string;
    };

type ExportArgsResult =
  | {
      ok: true;
      options: ExportOptions;
    }
  | {
      ok: false;
      message: string;
    };

type RenderArgsResult =
  | {
      ok: true;
      options: RenderCommandOptions;
    }
  | {
      ok: false;
      message: string;
    };

type CheckArgsResult =
  | {
      ok: true;
      options: CheckCommandOptions;
    }
  | {
      ok: false;
      message: string;
    };

export function parseValidateArgs(
  args: readonly string[],
): ValidateArgsResult {
  let json = false;
  let sourcePath: string | undefined;

  for (const arg of args) {
    if (arg === "--json") {
      json = true;
      continue;
    }

    if (arg.startsWith("-")) {
      return {
        ok: false,
        message: `Unknown validate option: ${arg}`,
      };
    }

    if (sourcePath !== undefined) {
      return {
        ok: false,
        message: `Unexpected validate argument: ${arg}`,
      };
    }

    sourcePath = arg;
  }

  if (sourcePath === undefined) {
    return {
      ok: false,
      message: "Missing source path.",
    };
  }

  return {
    ok: true,
    options: {
      json,
      sourcePath,
    },
  };
}

export function parseExportArgs(args: readonly string[]): ExportArgsResult {
  let format: string | undefined;
  let outPath: string | undefined;
  let sourcePath: string | undefined;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--format") {
      const nextArg = args[index + 1];

      if (nextArg === undefined) {
        return {
          ok: false,
          message: "Missing export format.",
        };
      }

      format = nextArg;
      index += 1;
      continue;
    }

    if (arg === "--out") {
      const nextArg = args[index + 1];

      if (nextArg === undefined) {
        return {
          ok: false,
          message: "Missing export output path.",
        };
      }

      outPath = nextArg;
      index += 1;
      continue;
    }

    if (arg.startsWith("-")) {
      return {
        ok: false,
        message: `Unknown export option: ${arg}`,
      };
    }

    if (sourcePath !== undefined) {
      return {
        ok: false,
        message: `Unexpected export argument: ${arg}`,
      };
    }

    sourcePath = arg;
  }

  if (sourcePath === undefined) {
    return {
      ok: false,
      message: "Missing source path.",
    };
  }

  if (format === undefined) {
    return {
      ok: false,
      message: "Missing export format.",
    };
  }

  if (format !== "mermaid" && format !== "d2") {
    return {
      ok: false,
      message: `Unsupported export format: ${format}`,
    };
  }

  return {
    ok: true,
    options: {
      format,
      outPath,
      sourcePath,
    },
  };
}

export function parseRenderArgs(args: readonly string[]): RenderArgsResult {
  let outPath: string | undefined;
  let sourcePath: string | undefined;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--out") {
      const nextArg = args[index + 1];

      if (nextArg === undefined) {
        return {
          ok: false,
          message: "Missing render output path.",
        };
      }

      outPath = nextArg;
      index += 1;
      continue;
    }

    if (arg.startsWith("-")) {
      return {
        ok: false,
        message: `Unknown render option: ${arg}`,
      };
    }

    if (sourcePath !== undefined) {
      return {
        ok: false,
        message: `Unexpected render argument: ${arg}`,
      };
    }

    sourcePath = arg;
  }

  if (sourcePath === undefined) {
    return {
      ok: false,
      message: "Missing source path.",
    };
  }

  if (outPath === undefined) {
    return {
      ok: false,
      message: "Missing render output path.",
    };
  }

  return {
    ok: true,
    options: {
      outPath,
      sourcePath,
    },
  };
}

export function parseCheckArgs(args: readonly string[]): CheckArgsResult {
  let json = false;
  let scopePath: string | undefined;

  for (const arg of args) {
    if (arg === "--json") {
      json = true;
      continue;
    }

    if (arg.startsWith("-")) {
      return {
        ok: false,
        message: `Unknown check option: ${arg}`,
      };
    }

    if (scopePath !== undefined) {
      return {
        ok: false,
        message: `Unexpected check argument: ${arg}`,
      };
    }

    scopePath = arg;
  }

  return {
    ok: true,
    options: {
      json,
      scopePath,
    },
  };
}
