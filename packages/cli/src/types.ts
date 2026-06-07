export type Writable = Pick<NodeJS.WritableStream, "write">;

export interface CliStreams {
  stdout: Writable;
  stderr: Writable;
}

export interface CommandWriteIntent {
  path: string;
  content: string | Uint8Array;
}

export interface CommandPlan {
  exitCode: number;
  stdout: string;
  stderr: string;
  writes: CommandWriteIntent[];
}
