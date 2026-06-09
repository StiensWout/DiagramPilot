import { mcpHelpText } from "./runtime.js";
import { runStdioMcpServer } from "./server.js";
import type { McpCliStreams } from "./types.js";

type CliHandler = (
  streams: McpCliStreams,
  commandName: string,
) => Promise<number> | number;

function showHelp(streams: McpCliStreams, commandName: string): number {
  streams.stdout.write(mcpHelpText(commandName));
  return 0;
}

async function startServer(): Promise<number> {
  await runStdioMcpServer();
  return 0;
}

function rejectUnexpectedArgs(
  streams: McpCliStreams,
  commandName: string,
): number {
  streams.stderr.write(
    [
      "DiagramPilot MCP server requires an MCP client stdio connection.",
      `Run \`${commandName} --help\` for usage.`,
      "",
    ].join("\n"),
  );
  return 1;
}

const cliHandlers = new Map<string | undefined, CliHandler>([
  [undefined, () => startServer()],
  ["--help", showHelp],
  ["-h", showHelp],
]);

export async function runMcpCli(
  args: readonly string[],
  streams: McpCliStreams,
  options: { commandName?: string } = {},
): Promise<number> {
  const commandName = options.commandName ?? "diagrampilot-mcp";
  const handler = cliHandlers.get(args[0]) ?? rejectUnexpectedArgs;

  return handler(streams, commandName);
}
