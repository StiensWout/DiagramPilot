interface ValidateOptions {
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

type ValidateArgsResult = ArgsResult<ValidateOptions>;

interface ValidateCommandParseState {
  json: boolean;
  sourcePath?: string;
}

export function parseValidateArgs(
  args: readonly string[],
): ValidateArgsResult {
  let state: ValidateCommandParseState = { json: false };

  for (const arg of args) {
    const result = parseValidateArg(state, arg);

    if (!result.ok) {
      return result;
    }

    state = result.options;
  }

  return validateArgsFromState(state);
}

function parseValidateArg(
  state: ValidateCommandParseState,
  arg: string,
): ArgsResult<ValidateCommandParseState> {
  if (arg === "--json") {
    return { ok: true, options: { ...state, json: true } };
  }

  if (arg.startsWith("-")) {
    return { ok: false, message: `Unknown validate option: ${arg}` };
  }

  if (state.sourcePath !== undefined) {
    return { ok: false, message: `Unexpected validate argument: ${arg}` };
  }

  return { ok: true, options: { ...state, sourcePath: arg } };
}

function validateArgsFromState(
  state: ValidateCommandParseState,
): ValidateArgsResult {
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
