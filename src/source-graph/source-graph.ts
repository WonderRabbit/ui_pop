import { access, readFile } from "node:fs/promises";
import * as path from "node:path";

export type SourceGraphOptions = {
  readonly entry: string;
  readonly maxDepth: number;
  readonly maxFiles: number;
};

export type SourceGraphResult = {
  readonly entry: string;
  readonly files: readonly string[];
  readonly truncated: boolean;
};

export type SourceGraphErrorCode =
  | "ERR_UNSUPPORTED_ENTRY"
  | "ERR_MALFORMED_TSX"
  | "ERR_GRAPH_DEPTH_EXCEEDED"
  | "ERR_GRAPH_FILE_LIMIT_EXCEEDED";

export type SourceGraphFailure = {
  readonly ok: false;
  readonly code: SourceGraphErrorCode;
  readonly message: string;
};

export type SourceGraphSuccess = {
  readonly ok: true;
  readonly graph: SourceGraphResult;
};

export type SourceGraphBuildResult = SourceGraphSuccess | SourceGraphFailure;

export async function buildSourceGraph(
  options: SourceGraphOptions,
): Promise<SourceGraphBuildResult> {
  if (path.extname(options.entry) !== ".tsx") {
    return failure(
      "ERR_UNSUPPORTED_ENTRY",
      "Only React or Next.js TSX screen entry files are supported.",
    );
  }

  const source = await readFile(options.entry, "utf8");
  if (!looksLikeTsx(source)) {
    return failure("ERR_MALFORMED_TSX", "Entry file does not contain parseable TSX screen markup.");
  }

  if (options.maxDepth < 1) {
    return failure("ERR_GRAPH_DEPTH_EXCEEDED", "Import graph maxDepth must be at least 1.");
  }

  if (options.maxFiles < 1) {
    return failure("ERR_GRAPH_FILE_LIMIT_EXCEEDED", "Import graph maxFiles must be at least 1.");
  }

  const graph = await collectGraph(options.entry, options.maxDepth, options.maxFiles);
  if (!graph.ok) {
    return graph;
  }

  return {
    graph: {
      entry: options.entry,
      files: graph.files,
      truncated: graph.truncated,
    },
    ok: true,
  };
}

type GraphCollection =
  | {
      readonly ok: true;
      readonly files: readonly string[];
      readonly truncated: boolean;
    }
  | SourceGraphFailure;

async function collectGraph(
  entry: string,
  maxDepth: number,
  maxFiles: number,
): Promise<GraphCollection> {
  const visited = new Set<string>();
  const files: string[] = [];
  let truncated = false;

  async function walk(file: string, depth: number): Promise<SourceGraphFailure | undefined> {
    if (visited.has(file)) {
      return undefined;
    }
    if (files.length >= maxFiles) {
      return failure("ERR_GRAPH_FILE_LIMIT_EXCEEDED", "Import graph file limit was exceeded.");
    }

    visited.add(file);
    files.push(file);
    if (depth >= maxDepth) {
      truncated = true;
      return undefined;
    }

    const source = await readFile(file, "utf8");
    for (const specifier of findRelativeImports(source)) {
      const resolved = await resolveImport(file, specifier);
      if (resolved === undefined) {
        continue;
      }
      const failureResult = await walk(resolved, depth + 1);
      if (failureResult !== undefined) {
        return failureResult;
      }
    }

    return undefined;
  }

  const failureResult = await walk(entry, 1);
  if (failureResult !== undefined) {
    return failureResult;
  }

  return { files, ok: true, truncated };
}

function findRelativeImports(source: string): readonly string[] {
  const imports: string[] = [];
  const importPattern = /import\s+(?:[^'"]+\s+from\s+)?["'](\.[^"']+)["']/g;
  let match = importPattern.exec(source);

  while (match !== null) {
    const specifier = match[1];
    if (specifier !== undefined) {
      imports.push(specifier);
    }
    match = importPattern.exec(source);
  }

  return imports;
}

async function resolveImport(fromFile: string, specifier: string): Promise<string | undefined> {
  const base = path.normalize(path.join(path.dirname(fromFile), specifier));
  const candidates = [base, `${base}.tsx`, `${base}.ts`, path.join(base, "index.tsx")];

  for (const candidate of candidates) {
    if (await exists(candidate)) {
      return candidate;
    }
  }

  return undefined;
}

async function exists(file: string): Promise<boolean> {
  try {
    await access(file);
    return true;
  } catch (error) {
    if (error instanceof Error) {
      return false;
    }
    throw error;
  }
}

function looksLikeTsx(source: string): boolean {
  return (
    /<[A-Za-z][\s\S]*>/.test(source) &&
    /export\s+default|export\s+function|const\s+\w+/.test(source)
  );
}

function failure(code: SourceGraphErrorCode, message: string): SourceGraphFailure {
  return {
    code,
    message,
    ok: false,
  };
}
