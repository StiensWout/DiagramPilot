export interface ParsedNodeReference {
  rawId: string;
  label?: string;
  approximatedShape?: string;
}

export interface ParsedEdge {
  from: string;
  to: string;
  label?: string;
  directed: boolean;
}

interface EdgePattern {
  pattern: RegExp;
  create(match: RegExpExecArray): ParsedEdge;
}

const quoteCharacters = new Set([`"`, "'", "`"]);

const labelWrappers = [
  { open: "[", close: "]", shape: undefined },
  { open: "(", close: ")", shape: "round" },
  { open: "{", close: "}", shape: "decision" },
] as const;

const edgePatterns: EdgePattern[] = [
  {
    pattern: /^(.+?)\s*(-->|---)\|([^|]+)\|\s*(.+)$/u,
    create: (match) => ({
      from: match[1],
      to: match[4],
      label: normalizeMermaidLabel(match[3]),
      directed: match[2] === "-->",
    }),
  },
  {
    pattern: /^(.+?)\s+--\s+(.+?)\s+-->\s+(.+)$/u,
    create: (match) => ({
      from: match[1],
      to: match[3],
      label: normalizeMermaidLabel(match[2]),
      directed: true,
    }),
  },
  {
    pattern: /^(.+?)\s*(-->|---)\s*(.+)$/u,
    create: (match) => ({
      from: match[1],
      to: match[3],
      directed: match[2] === "-->",
    }),
  },
];

function unquoteText(value: string): string {
  const trimmed = value.trim();
  const quote = trimmed[0];
  if (quoteCharacters.has(quote) && trimmed.endsWith(quote)) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

export function normalizeMermaidLabel(value: string): string {
  return unquoteText(value)
    .replace(/\\"/gu, `"`)
    .replace(/\\'/gu, "'")
    .replace(/<br\s*\/?>/giu, " ")
    .trim();
}

function unwrapDelimitedLabel(value: string): {
  label: string;
  approximatedShape?: string;
} {
  const unwrapped = unwrapAllLabelWrappers(value.trim());
  const asymmetric = applyAsymmetricLabel(unwrapped);

  return {
    label: normalizeMermaidLabel(asymmetric.label),
    approximatedShape: asymmetric.approximatedShape,
  };
}

function unwrapAllLabelWrappers(
  label: string,
  approximatedShape?: string,
): { label: string; approximatedShape?: string } {
  const unwrapped = unwrapOneLabelWrapper(label);
  return unwrapped === undefined
    ? { label, approximatedShape }
    : unwrapAllLabelWrappers(
        unwrapped.label,
        approximatedShape ?? unwrapped.approximatedShape,
      );
}

function unwrapOneLabelWrapper(
  label: string,
): { label: string; approximatedShape?: string } | undefined {
  for (const wrapper of labelWrappers) {
    if (label.startsWith(wrapper.open) && label.endsWith(wrapper.close)) {
      return {
        label: label.slice(1, -1).trim(),
        approximatedShape: wrapper.shape,
      };
    }
  }

  return undefined;
}

function unwrapAsymmetricLabel(label: string): string | undefined {
  return label.startsWith(">") && label.endsWith("]")
    ? label.slice(1, -1).trim()
    : undefined;
}

function applyAsymmetricLabel(value: {
  label: string;
  approximatedShape?: string;
}): { label: string; approximatedShape?: string } {
  const asymmetricLabel = unwrapAsymmetricLabel(value.label);
  return asymmetricLabel === undefined
    ? value
    : {
        label: asymmetricLabel,
        approximatedShape: "asymmetric",
      };
}

function optionalRegexValue(
  match: RegExpExecArray | null,
): string | undefined {
  if (match === null) return undefined;
  return normalizeMermaidLabel(match[1] ?? match[2] ?? match[3]);
}

function parseObjectLiteralLabel(remainder: string): {
  label?: string;
  shape?: string;
} {
  const labelMatch = /(?:^|[,{]\s*)label\s*:\s*(?:"([^"]*)"|'([^']*)'|([^,}]+))/u.exec(
    remainder,
  );
  const shapeMatch = /(?:^|[,{]\s*)shape\s*:\s*([a-z0-9_-]+)/iu.exec(
    remainder,
  );

  return {
    label: optionalRegexValue(labelMatch),
    shape: shapeMatch?.[1],
  };
}

export function parseNodeReference(
  expression: string,
): ParsedNodeReference | undefined {
  const parsed = parseNodeId(expression);
  return parsed === undefined
    ? undefined
    : nodeReferenceFromRemainder(parsed.rawId, parsed.remainder);
}

function parseNodeId(
  expression: string,
): { rawId: string; remainder: string } | undefined {
  const trimmed = expression.trim();
  const match = /^([A-Za-z0-9_.$:/-]+)/u.exec(trimmed);
  return match === null
    ? undefined
    : {
        rawId: match[1],
        remainder: trimmed.slice(match[1].length).trim(),
      };
}

function nodeReferenceFromRemainder(
  rawId: string,
  remainder: string,
): ParsedNodeReference {
  if (remainder === "") return { rawId };

  return remainder.startsWith("@{") && remainder.endsWith("}")
    ? objectLiteralNodeReference(rawId, remainder)
    : delimitedNodeReference(rawId, remainder);
}

function objectLiteralNodeReference(
  rawId: string,
  remainder: string,
): ParsedNodeReference {
  const objectLiteral = parseObjectLiteralLabel(remainder.slice(2, -1));
  return {
    rawId,
    label: objectLiteral.label,
    approximatedShape: objectLiteral.shape,
  };
}

function delimitedNodeReference(
  rawId: string,
  remainder: string,
): ParsedNodeReference {
  const label = unwrapDelimitedLabel(remainder);
  return {
    rawId,
    label: label.label,
    approximatedShape: label.approximatedShape,
  };
}

export function parseEdge(line: string): ParsedEdge | undefined {
  for (const edgePattern of edgePatterns) {
    const match = edgePattern.pattern.exec(line);
    if (match !== null) return edgePattern.create(match);
  }

  return undefined;
}
