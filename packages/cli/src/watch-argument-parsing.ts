type ArgsResult<TOptions> =
  | {
      ok: true;
      options: TOptions;
    }
  | {
      ok: false;
      message: string;
    };

interface WatchCommandOptions {
  scopePath?: string;
}

type WatchArgsResult = ArgsResult<WatchCommandOptions>;

function parseWatchArg(
  arg: string,
  state: WatchCommandOptions,
): WatchArgsResult {
  if (arg.startsWith("-")) {
    return {
      ok: false,
      message: `Unknown watch option: ${arg}`,
    };
  }

  if (state.scopePath !== undefined) {
    return {
      ok: false,
      message: `Unexpected watch argument: ${arg}`,
    };
  }

  return {
    ok: true,
    options: {
      scopePath: arg,
    },
  };
}

export function parseWatchArgs(args: readonly string[]): WatchArgsResult {
  let state: WatchCommandOptions = {};

  for (const arg of args) {
    const result = parseWatchArg(arg, state);

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
