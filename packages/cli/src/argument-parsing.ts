interface ExportOptions {
  format: "d2" | "dot" | "mermaid";
  outPath?: string;
  sourcePath: string;
  viewId?: string;
}

interface RenderCommandOptions {
  format: "svg" | "png";
  outPath: string;
  sourcePath: string;
  viewId?: string;
}

interface CheckCommandOptions {
  json: boolean;
  scopePath?: string;
}

interface InspectCommandOptions {
  json: boolean;
  scopePath?: string;
}

interface GenerateCommandOptions {
  json: boolean;
  scopePath?: string;
}

type ArgsResult<TOptions> =
  | {
      ok: true;
      options: TOptions;
    }
  | {
      ok: false;
      message: string;
    };

type ExportArgsResult = ArgsResult<ExportOptions>;
type RenderArgsResult = ArgsResult<RenderCommandOptions>;
type CheckArgsResult = ArgsResult<CheckCommandOptions>;
type InspectArgsResult = ArgsResult<InspectCommandOptions>;
type GenerateArgsResult = ArgsResult<GenerateCommandOptions>;

const exportFormats = ["mermaid", "d2", "dot"] as const;
const renderFormats = ["svg", "png"] as const;

interface OutputCommandArgsConfig<TFormat extends string> {
  commandName: "export" | "render";
  defaultFormat?: TFormat;
  formats: readonly TFormat[];
  missingFormatMessage: string;
  missingOutPathMessage: string;
  requireOutPath: boolean;
}

interface OutputCommandArgs<TFormat extends string> {
  format: TFormat;
  outPath?: string;
  sourcePath: string;
  viewId?: string;
}

interface ScopedJsonParseState {
  json: boolean;
  scopePath?: string;
}

interface OutputCommandParseState {
  format?: string;
  outPath?: string;
  sourcePath?: string;
  viewId?: string;
}

interface OutputCommandParseProgress {
  nextIndex: number;
  state: OutputCommandParseState;
}

interface RequiredOutputCommandValues {
  format: string;
  outPath?: string;
  sourcePath: string;
  viewId?: string;
}

function isSupportedFormat<TFormat extends string>(
  format: string,
  formats: readonly TFormat[],
): format is TFormat {
  return (formats as readonly string[]).includes(format);
}

function parseScopedJsonPositionalArg(
  arg: string,
  commandName: "check" | "generate" | "inspect",
  state: ScopedJsonParseState,
): ArgsResult<ScopedJsonParseState> {
  if (arg.startsWith("-")) {
    return {
      ok: false,
      message: `Unknown ${commandName} option: ${arg}`,
    };
  }

  if (state.scopePath !== undefined) {
    return {
      ok: false,
      message: `Unexpected ${commandName} argument: ${arg}`,
    };
  }

  return {
    ok: true,
    options: {
      json: state.json,
      scopePath: arg,
    },
  };
}

function parseScopedJsonArg(
  arg: string,
  commandName: "check" | "generate" | "inspect",
  state: ScopedJsonParseState,
): ArgsResult<ScopedJsonParseState> {
  if (arg === "--json") {
    return {
      ok: true,
      options: {
        ...state,
        json: true,
      },
    };
  }

  return parseScopedJsonPositionalArg(arg, commandName, state);
}

function parseScopedJsonArgs(
  args: readonly string[],
  commandName: "check" | "generate" | "inspect",
): ArgsResult<CheckCommandOptions> {
  let state: ScopedJsonParseState = {
    json: false,
  };

  for (const arg of args) {
    const result = parseScopedJsonArg(arg, commandName, state);

    if (!result.ok) {
      return result;
    }

    state = result.options;
  }

  return {
    ok: true,
    options: state,
  };
}

function parseOutputValueArg(
  args: readonly string[],
  index: number,
  state: OutputCommandParseState,
  property: "format" | "outPath" | "viewId",
  missingMessage: string,
): ArgsResult<OutputCommandParseProgress> {
  const nextArg = args[index + 1];

  if (nextArg === undefined) {
    return {
      ok: false,
      message: missingMessage,
    };
  }

  return {
    ok: true,
    options: {
      nextIndex: index + 1,
      state: {
        ...state,
        [property]: nextArg,
      },
    },
  };
}

function parseOutputPositionalArg(
  arg: string,
  index: number,
  state: OutputCommandParseState,
  commandName: "export" | "render",
): ArgsResult<OutputCommandParseProgress> {
  if (arg.startsWith("-")) {
    return {
      ok: false,
      message: `Unknown ${commandName} option: ${arg}`,
    };
  }

  if (state.sourcePath !== undefined) {
    return {
      ok: false,
      message: `Unexpected ${commandName} argument: ${arg}`,
    };
  }

  return {
    ok: true,
    options: {
      nextIndex: index,
      state: {
        ...state,
        sourcePath: arg,
      },
    },
  };
}

function parseOutputCommandArg<TFormat extends string>(
  args: readonly string[],
  index: number,
  state: OutputCommandParseState,
  config: OutputCommandArgsConfig<TFormat>,
): ArgsResult<OutputCommandParseProgress> {
  const arg = args[index];

  if (arg === "--format") {
    return parseOutputValueArg(
      args,
      index,
      state,
      "format",
      config.missingFormatMessage,
    );
  }

  if (arg === "--out") {
    return parseOutputValueArg(
      args,
      index,
      state,
      "outPath",
      config.missingOutPathMessage,
    );
  }

  if (arg === "--view") {
    return parseOutputValueArg(
      args,
      index,
      state,
      "viewId",
      "Missing view ID.",
    );
  }

  return parseOutputPositionalArg(arg, index, state, config.commandName);
}

function requireOutputCommandValue(
  value: string | undefined,
  message: string,
): ArgsResult<{ value: string }> {
  if (value === undefined) {
    return {
      ok: false,
      message,
    };
  }

  return {
    ok: true,
    options: { value },
  };
}

function requireOutputPathForCommand<TFormat extends string>(
  state: OutputCommandParseState,
  config: OutputCommandArgsConfig<TFormat>,
): ArgsResult<{ outPath?: string }> {
  if (!config.requireOutPath) {
    return {
      ok: true,
      options: {
        outPath: state.outPath,
      },
    };
  }

  const outPath = requireOutputCommandValue(
    state.outPath,
    config.missingOutPathMessage,
  );

  if (!outPath.ok) {
    return outPath;
  }

  return {
    ok: true,
    options: {
      outPath: outPath.options.value,
    },
  };
}

function collectRequiredOutputCommandValues<TFormat extends string>(
  state: OutputCommandParseState,
  config: OutputCommandArgsConfig<TFormat>,
): ArgsResult<RequiredOutputCommandValues> {
  const sourcePath = requireOutputCommandValue(
    state.sourcePath,
    "Missing source path.",
  );

  if (!sourcePath.ok) {
    return sourcePath;
  }

  const format = requireOutputCommandValue(
    state.format,
    config.missingFormatMessage,
  );

  if (!format.ok) {
    return format;
  }

  const outPath = requireOutputPathForCommand(state, config);

  if (!outPath.ok) {
    return outPath;
  }

  return {
    ok: true,
    options: {
      format: format.options.value,
      outPath: outPath.options.outPath,
      sourcePath: sourcePath.options.value,
      viewId: state.viewId,
    },
  };
}

function outputCommandArgsFromValues<TFormat extends string>(
  values: RequiredOutputCommandValues,
  config: OutputCommandArgsConfig<TFormat>,
): ArgsResult<OutputCommandArgs<TFormat>> {
  if (!isSupportedFormat(values.format, config.formats)) {
    return {
      ok: false,
      message: `Unsupported ${config.commandName} format: ${values.format}`,
    };
  }

  return {
    ok: true,
    options: {
      format: values.format,
      outPath: values.outPath,
      sourcePath: values.sourcePath,
      viewId: values.viewId,
    },
  };
}

function parseOutputCommandArgs<TFormat extends string>(
  args: readonly string[],
  config: OutputCommandArgsConfig<TFormat>,
): ArgsResult<OutputCommandArgs<TFormat>> {
  let state: OutputCommandParseState = {
    format: config.defaultFormat,
  };

  for (let index = 0; index < args.length; index += 1) {
    const result = parseOutputCommandArg(args, index, state, config);

    if (!result.ok) {
      return result;
    }

    index = result.options.nextIndex;
    state = result.options.state;
  }

  const values = collectRequiredOutputCommandValues(state, config);

  if (!values.ok) {
    return values;
  }

  return outputCommandArgsFromValues(values.options, config);
}

export {
  parseLintArgs,
  parseValidateArgs,
} from "./validate-argument-parsing.js";

export function parseExportArgs(args: readonly string[]): ExportArgsResult {
  return parseOutputCommandArgs(args, {
    commandName: "export",
    formats: exportFormats,
    missingFormatMessage: "Missing export format.",
    missingOutPathMessage: "Missing export output path.",
    requireOutPath: false,
  });
}

export function parseRenderArgs(args: readonly string[]): RenderArgsResult {
  const result = parseOutputCommandArgs(args, {
    commandName: "render",
    defaultFormat: "svg",
    formats: renderFormats,
    missingFormatMessage: "Missing render format.",
    missingOutPathMessage: "Missing render output path.",
    requireOutPath: true,
  });

  if (!result.ok) {
    return result;
  }

  if (result.options.outPath === undefined) {
    return {
      ok: false,
      message: "Missing render output path.",
    };
  }

  return {
    ok: true,
    options: {
      format: result.options.format,
      outPath: result.options.outPath,
      sourcePath: result.options.sourcePath,
      viewId: result.options.viewId,
    },
  };
}

export function parseCheckArgs(args: readonly string[]): CheckArgsResult {
  return parseScopedJsonArgs(args, "check");
}

export function parseInspectArgs(args: readonly string[]): InspectArgsResult {
  return parseScopedJsonArgs(args, "inspect");
}

export function parseGenerateArgs(
  args: readonly string[],
): GenerateArgsResult {
  return parseScopedJsonArgs(args, "generate");
}
