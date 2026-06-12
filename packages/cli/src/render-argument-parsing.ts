interface RenderCommandOptions {
  aroundNodeId?: string;
  depth?: number;
  format: "svg" | "png";
  groupId?: string;
  hideEdgeLabels?: boolean;
  outPath: string;
  sourcePath: string;
  viewId?: string;
}

type RenderArgsResult =
  | {
      ok: true;
      options: RenderCommandOptions;
    }
  | {
      ok: false;
      message: string;
    };

type ParseResult<TOptions> =
  | {
      ok: true;
      options: TOptions;
    }
  | {
      ok: false;
      message: string;
    };

interface RenderParseState {
  aroundNodeId?: string;
  depth?: string;
  format?: string;
  groupId?: string;
  hideEdgeLabels?: boolean;
  outPath?: string;
  sourcePath?: string;
  viewId?: string;
}

interface RenderParseProgress {
  nextIndex: number;
  state: RenderParseState;
}

interface RequiredRenderValues {
  sourcePath: string;
  format: string;
  outPath: string;
}

const renderFormats = ["svg", "png"] as const;

function isRenderFormat(format: string): format is RenderCommandOptions["format"] {
  return (renderFormats as readonly string[]).includes(format);
}

function parseRenderValueArg(
  args: readonly string[],
  index: number,
  state: RenderParseState,
  property: "aroundNodeId" | "depth" | "format" | "groupId" | "outPath" | "viewId",
  missingMessage: string,
): ParseResult<RenderParseProgress> {
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

function parseRenderPositionalArg(
  arg: string,
  index: number,
  state: RenderParseState,
): ParseResult<RenderParseProgress> {
  if (arg.startsWith("-")) {
    return {
      ok: false,
      message: `Unknown render option: ${arg}`,
    };
  }

  if (state.sourcePath !== undefined) {
    return {
      ok: false,
      message: `Unexpected render argument: ${arg}`,
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

function parseRenderArg(
  args: readonly string[],
  index: number,
  state: RenderParseState,
): ParseResult<RenderParseProgress> {
  const arg = args[index];

  if (arg === "--hide-edge-labels") {
    return {
      ok: true,
      options: {
        nextIndex: index,
        state: {
          ...state,
          hideEdgeLabels: true,
        },
      },
    };
  }

  const valueOptions = {
    "--around": ["aroundNodeId", "Missing node ID."] as const,
    "--depth": ["depth", "Missing depth."] as const,
    "--format": ["format", "Missing render format."] as const,
    "--group": ["groupId", "Missing group ID."] as const,
    "--out": ["outPath", "Missing render output path."] as const,
    "--view": ["viewId", "Missing view ID."] as const,
  };
  const valueOption = valueOptions[arg as keyof typeof valueOptions];

  if (valueOption !== undefined) {
    return parseRenderValueArg(args, index, state, valueOption[0], valueOption[1]);
  }

  return parseRenderPositionalArg(arg, index, state);
}

function requireRenderValue(
  value: string | undefined,
  message: string,
): ParseResult<{ value: string }> {
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

type FocusCombinationRule = (state: RenderParseState) => string | undefined;

const focusCombinationRules: readonly FocusCombinationRule[] = [
  (state) =>
    state.groupId !== undefined && state.aroundNodeId !== undefined
      ? "Choose either --group or --around, not both."
      : undefined,
  (state) =>
    state.depth !== undefined && state.aroundNodeId === undefined
      ? "--depth requires --around <node-id>."
      : undefined,
];

function collectRequiredRenderValues(
  state: RenderParseState,
): ParseResult<RequiredRenderValues> {
  const sourcePath = requireRenderValue(state.sourcePath, "Missing source path.");
  if (!sourcePath.ok) return sourcePath;

  const format = requireRenderValue(state.format, "Missing render format.");
  if (!format.ok) return format;

  const outPath = requireRenderValue(
    state.outPath,
    "Missing render output path.",
  );
  if (!outPath.ok) return outPath;

  return {
    ok: true,
    options: {
      sourcePath: sourcePath.options.value,
      format: format.options.value,
      outPath: outPath.options.value,
    },
  };
}

function definedValue<TValue>(
  value: TValue | undefined,
): value is TValue {
  return value !== undefined;
}

function renderFormatError(format: string): string | undefined {
  return isRenderFormat(format)
    ? undefined
    : `Unsupported render format: ${format}`;
}

function focusCombinationError(
  state: RenderParseState,
): string | undefined {
  return focusCombinationRules
    .map((rule) => rule(state))
    .find(definedValue);
}

function depthError(depth: string | undefined): string | undefined {
  return depth === undefined || /^(0|[1-9]\d*)$/u.test(depth)
    ? undefined
    : `Invalid render depth: ${depth}`;
}

function renderStateError(
  state: RenderParseState,
  requiredValues: RequiredRenderValues,
): string | undefined {
  return [
    renderFormatError(requiredValues.format),
    focusCombinationError(state),
    depthError(state.depth),
  ].find(definedValue);
}

function parsedDepth(depth: string | undefined): number | undefined {
  return depth === undefined ? undefined : Number(depth);
}

function renderCommandOptionsFromState(
  state: RenderParseState,
): RenderArgsResult {
  const required = collectRequiredRenderValues(state);
  if (!required.ok) return required;

  const message = renderStateError(state, required.options);
  if (message !== undefined) return { ok: false, message };

  return {
    ok: true,
    options: {
      aroundNodeId: state.aroundNodeId,
      depth: parsedDepth(state.depth),
      format: required.options.format as RenderCommandOptions["format"],
      groupId: state.groupId,
      hideEdgeLabels: state.hideEdgeLabels,
      outPath: required.options.outPath,
      sourcePath: required.options.sourcePath,
      viewId: state.viewId,
    },
  };
}

export function parseRenderArgs(args: readonly string[]): RenderArgsResult {
  let state: RenderParseState = {
    format: "svg",
  };

  for (let index = 0; index < args.length; index += 1) {
    const result = parseRenderArg(args, index, state);

    if (!result.ok) return result;

    index = result.options.nextIndex;
    state = result.options.state;
  }

  return renderCommandOptionsFromState(state);
}
