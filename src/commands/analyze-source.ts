import { mkdir, readFile, writeFile } from "node:fs/promises";
import * as path from "node:path";
import { analyzeScreenSource } from "../analyzer/source-analysis.js";
import { createStaticEvidenceSummary } from "../evidence/evidence-sanitizer.js";
import { ExitCode } from "../exit-codes.js";
import { serializeUiIr } from "../schema/ui-ir.js";
import type { CliResult } from "../types.js";

const artifactNames = [
  "manifest.json",
  "ui-ir.json",
  "source-graph.json",
  "source-evidence.json",
] as const;

type AnalyzeSourceArgs = {
  readonly entry: string;
  readonly outDir: string;
  readonly force: boolean;
  readonly maxDepth: number;
  readonly maxFiles: number;
  readonly timeoutMs: number;
  readonly tsconfig?: string;
};

type ParsedArgs =
  | {
      readonly ok: true;
      readonly args: AnalyzeSourceArgs;
    }
  | {
      readonly ok: false;
      readonly result: CliResult;
    };

export async function runAnalyzeSourceCommand(
  args: readonly string[],
  now: Date,
): Promise<CliResult> {
  const parsed = parseAnalyzeSourceArgs(args);
  if (!parsed.ok) {
    return parsed.result;
  }

  if (!parsed.args.force && (await hasGeneratedArtifacts(parsed.args.outDir))) {
    return failure(
      "ERR_OUTPUT_EXISTS",
      `Output directory already contains generated artifacts: ${parsed.args.outDir}`,
      "Re-run with --force to overwrite generated artifacts.",
    );
  }

  const analysis = await analyzeScreenSource({
    entry: parsed.args.entry,
    maxDepth: parsed.args.maxDepth,
    maxFiles: parsed.args.maxFiles,
    timeoutMs: parsed.args.timeoutMs,
    ...(parsed.args.tsconfig === undefined ? {} : { tsconfig: parsed.args.tsconfig }),
  });

  if (!analysis.ok) {
    return failure(analysis.code, analysis.message);
  }

  const source = await readFile(parsed.args.entry, "utf8");
  const sourceEvidence = createStaticEvidenceSummary({
    files: analysis.graph.files,
    source,
    title: analysis.uiIr.screen.title,
    unresolvedNotes: analysis.unresolvedNotes,
  });
  const manifest = {
    artifacts: artifactNames,
    command: "analyze-source",
    entry: parsed.args.entry,
    generatedAt: now.toISOString(),
    schemaVersion: 1,
    screen: analysis.uiIr.screen,
    unresolvedCount: analysis.unresolvedNotes.length,
  };

  await mkdir(parsed.args.outDir, { recursive: true });
  await writeFile(path.join(parsed.args.outDir, "manifest.json"), json(manifest), "utf8");
  await writeFile(
    path.join(parsed.args.outDir, "ui-ir.json"),
    serializeUiIr(analysis.uiIr),
    "utf8",
  );
  await writeFile(path.join(parsed.args.outDir, "source-graph.json"), json(analysis.graph), "utf8");
  await writeFile(
    path.join(parsed.args.outDir, "source-evidence.json"),
    json(sourceEvidence),
    "utf8",
  );

  return {
    exitCode: ExitCode.Success,
    stderr: "",
    stdout: [
      `Wrote source UI spec artifacts to ${parsed.args.outDir}`,
      ...artifactNames.map((name) => `- ${name}`),
      "",
    ].join("\n"),
  };
}

function parseAnalyzeSourceArgs(args: readonly string[]): ParsedArgs {
  let entry: string | undefined;
  let outDir: string | undefined;
  let force = false;
  let maxDepth = 2;
  let maxFiles = 80;
  let timeoutMs = 30_000;
  let tsconfig: string | undefined;

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (token === undefined) {
      continue;
    }

    if (token === "--force") {
      force = true;
    } else if (token === "--entry") {
      entry = readRequiredValue(args, index, token);
      index += 1;
    } else if (token === "--out") {
      outDir = readRequiredValue(args, index, token);
      index += 1;
    } else if (token === "--tsconfig") {
      tsconfig = readRequiredValue(args, index, token);
      index += 1;
    } else if (token === "--max-depth") {
      const value = parsePositiveInteger(readRequiredValue(args, index, token));
      if (value === undefined) return invalidOption(token);
      maxDepth = value;
      index += 1;
    } else if (token === "--max-files") {
      const value = parsePositiveInteger(readRequiredValue(args, index, token));
      if (value === undefined) return invalidOption(token);
      maxFiles = value;
      index += 1;
    } else if (token === "--timeout-ms") {
      const value = parsePositiveInteger(readRequiredValue(args, index, token));
      if (value === undefined) return invalidOption(token);
      timeoutMs = value;
      index += 1;
    } else if (token.startsWith("-")) {
      return {
        ok: false,
        result: failure("ERR_UNKNOWN_OPTION", `Unknown analyze-source option: ${token}`),
      };
    } else if (entry === undefined) {
      entry = token;
    } else {
      return {
        ok: false,
        result: failure("ERR_UNEXPECTED_ARGUMENT", `Unexpected analyze-source argument: ${token}`),
      };
    }
  }

  if (entry === undefined || outDir === undefined) {
    return {
      ok: false,
      result: failure(
        "ERR_MISSING_REQUIRED_OPTION",
        "analyze-source requires an entry file and --out <spec-dir>.",
        "Usage: ui-pop analyze-source <file.tsx> --out <spec-dir> [--force]",
      ),
    };
  }

  return {
    args: {
      entry,
      force,
      maxDepth,
      maxFiles,
      outDir,
      timeoutMs,
      ...(tsconfig === undefined ? {} : { tsconfig }),
    },
    ok: true,
  };
}

function readRequiredValue(args: readonly string[], index: number, option: string): string {
  const value = args[index + 1];
  if (value === undefined || value.startsWith("-")) {
    throw new Error(`${option} requires a value.`);
  }
  return value;
}

function parsePositiveInteger(value: string): number | undefined {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function invalidOption(option: string): ParsedArgs {
  return {
    ok: false,
    result: failure("ERR_INVALID_OPTION", `${option} must be a positive integer.`),
  };
}

async function hasGeneratedArtifacts(outDir: string): Promise<boolean> {
  for (const artifact of artifactNames) {
    try {
      await readFile(path.join(outDir, artifact), "utf8");
      return true;
    } catch (error) {
      if (error instanceof Error) {
        continue;
      }
      throw error;
    }
  }
  return false;
}

function json(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function failure(code: string, message: string, hint?: string): CliResult {
  return {
    exitCode: ExitCode.InputOrConfig,
    stdout: "",
    stderr: [code, message, ...(hint === undefined ? [] : ["", hint]), ""].join("\n"),
  };
}
