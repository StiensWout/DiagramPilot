interface SourceJsonOptions {
  json: boolean;
  sourcePath: string;
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

type SourceJsonArgsResult = ArgsResult<SourceJsonOptions>;

interface SourceJsonCommandParseState {
  json: boolean;
  sourcePath?: string;
}

type SourceJsonCommandName = "lint" | "validate";

function parseSourceJsonArgs(
  args: readonly string[],
  commandName: SourceJsonCommandName,
): SourceJsonArgsResult {
  let state: SourceJsonCommandParseState = { json: false };

  for (const arg of args) {
    const result = parseSourceJsonArg(state, arg, commandName);

    if (!result.ok) {
      return result;
    }

    state = result.options;
  }

  return sourceJsonArgsFromState(state);
}

function parseSourceJsonArg(
  state: SourceJsonCommandParseState,
  arg: string,
  commandName: SourceJsonCommandName,
): ArgsResult<SourceJsonCommandParseState> {
  if (arg === "--json") {
    return { ok: true, options: { ...state, json: true } };
  }

  if (arg.startsWith("-")) {
    return { ok: false, message: `Unknown ${commandName} option: ${arg}` };
  }

  if (state.sourcePath !== undefined) {
    return { ok: false, message: `Unexpected ${commandName} argument: ${arg}` };
  }

  return { ok: true, options: { ...state, sourcePath: arg } };
}

function sourceJsonArgsFromState(
  state: SourceJsonCommandParseState,
): SourceJsonArgsResult {
  if (state.sourcePath === undefined) {
    return { ok: false, message: "Missing source path." };
  }

  return {
    ok: true,
    options: {
      json: state.json,
      sourcePath: state.sourcePath,
    },
  };
}

export function parseValidateArgs(
  args: readonly string[],
): SourceJsonArgsResult {
  return parseSourceJsonArgs(args, "validate");
}

export function parseLintArgs(args: readonly string[]): SourceJsonArgsResult {
  return parseSourceJsonArgs(args, "lint");
}
