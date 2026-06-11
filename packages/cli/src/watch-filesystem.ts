import {
  statSync,
  watch as watchFileSystem,
  type FSWatcher,
} from "node:fs";
import { readdir } from "node:fs/promises";
import path from "node:path";

interface WatchChange {
  path?: string;
}

interface WatchHandle {
  close(): void;
}

export interface FileSystemWatchCreateOptions {
  scopePath?: string;
  onChange(change: WatchChange): void;
  onError(error: Error): void;
}

const relevantConfigFile = "diagrampilot.config.yaml";
const ignoredDirectoryNames = new Set([".git", "node_modules"]);

function isRelevantWatchPath(filePath: string): boolean {
  const basename = path.basename(filePath);

  return basename === relevantConfigFile || basename.endsWith(".dp.yaml");
}

function shouldSkipDirectory(directoryPath: string): boolean {
  return ignoredDirectoryNames.has(path.basename(directoryPath));
}

function shouldWatchDirectory(
  directoryPath: string,
  watchedDirectories: Set<string>,
): boolean {
  return !shouldSkipDirectory(directoryPath) && !watchedDirectories.has(directoryPath);
}

function changedPathForEvent(directoryPath: string, filename: string | Buffer | null): string {
  return filename === null
    ? directoryPath
    : path.join(directoryPath, filename.toString());
}

function addNewDirectoryIfPresent(
  options: DirectoryTreeOptions,
  filename: string | Buffer | null,
  changedPath: string,
): void {
  if (filename === null) return;

  try {
    if (statSync(changedPath).isDirectory()) {
      void addDirectoryTree({ ...options, directoryPath: changedPath }).catch(
        options.onError,
      );
    }
  } catch {
    // A remove event may arrive after the path is already gone.
  }
}

function shouldEmitDirectoryChange(
  filename: string | Buffer | null,
  changedPath: string,
): boolean {
  return filename === null || isRelevantWatchPath(changedPath);
}

function handleDirectoryWatchEvent(
  options: DirectoryTreeOptions,
  filename: string | Buffer | null,
): void {
  const changedPath = changedPathForEvent(options.directoryPath, filename);

  addNewDirectoryIfPresent(options, filename, changedPath);

  if (shouldEmitDirectoryChange(filename, changedPath)) {
    options.onChange({ path: changedPath });
  }
}

interface DirectoryTreeOptions {
  directoryPath: string;
  watchedDirectories: Set<string>;
  watchers: FSWatcher[];
  onChange(change: WatchChange): void;
  onError(error: Error): void;
}

async function addDirectoryTree(options: {
  directoryPath: string;
  watchedDirectories: Set<string>;
  watchers: FSWatcher[];
  onChange(change: WatchChange): void;
  onError(error: Error): void;
}): Promise<void> {
  if (!shouldWatchDirectory(options.directoryPath, options.watchedDirectories)) {
    return;
  }

  options.watchedDirectories.add(options.directoryPath);

  const watcher = watchFileSystem(options.directoryPath, (_eventType, filename) =>
    handleDirectoryWatchEvent(options, filename),
  );

  watcher.on("error", options.onError);
  options.watchers.push(watcher);

  const entries = await readdir(options.directoryPath, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      await addDirectoryTree({
        ...options,
        directoryPath: path.join(options.directoryPath, entry.name),
      });
    }
  }
}

async function createDirectoryWatcher(
  options: FileSystemWatchCreateOptions & {
    directoryPath: string;
  },
): Promise<WatchHandle> {
  const watchers: FSWatcher[] = [];
  const watchedDirectories = new Set<string>();

  await addDirectoryTree({
    directoryPath: options.directoryPath,
    watchedDirectories,
    watchers,
    onChange: options.onChange,
    onError: options.onError,
  });

  return {
    close() {
      for (const watcher of watchers) {
        watcher.close();
      }
    },
  };
}

function createFileWatcher(
  options: FileSystemWatchCreateOptions & {
    filePath: string;
  },
): WatchHandle {
  const directoryPath = path.dirname(options.filePath);
  const watcher = watchFileSystem(directoryPath, (_eventType, filename) => {
    if (filename === null) {
      options.onChange({ path: directoryPath });
      return;
    }

    const changedPath = path.join(directoryPath, filename.toString());
    const isSelectedFile = path.resolve(changedPath) === options.filePath;
    const isLocalConfig = path.basename(changedPath) === relevantConfigFile;

    if (isSelectedFile || isLocalConfig) {
      options.onChange({ path: changedPath });
    }
  });

  watcher.on("error", options.onError);

  return {
    close() {
      watcher.close();
    },
  };
}

export async function createFileSystemWatcher(
  options: FileSystemWatchCreateOptions,
): Promise<WatchHandle> {
  const requestedPath = path.resolve(options.scopePath ?? ".");
  const stats = statSync(requestedPath);

  if (stats.isDirectory()) {
    return createDirectoryWatcher({ ...options, directoryPath: requestedPath });
  }

  if (stats.isFile()) {
    return createFileWatcher({ ...options, filePath: requestedPath });
  }

  throw new Error("Watch scope must be a directory or file.");
}
