import { mkdir, readFile, writeFile } from "node:fs/promises";
import * as path from "node:path";
import { chromium } from "playwright";
import { ExitCode } from "../exit-codes.js";
import { parseUiIr, serializeUiIr } from "../schema/ui-ir.js";
import type { CliResult } from "../types.js";
import {
  confirmMatchedFacts,
  createRuntimeEvidence,
  type RuntimeEvidence,
  type SourceRef,
} from "./runtime-evidence.js";

type ValidateRuntimeArgs = {
  readonly specDir: string;
  readonly url: string;
};

type ParsedArgs =
  | { readonly ok: true; readonly args: ValidateRuntimeArgs }
  | { readonly ok: false; readonly result: CliResult };

export async function runValidateRuntimeCommand(
  args: readonly string[],
  now: Date,
): Promise<CliResult> {
  const parsed = parseValidateRuntimeArgs(args);
  if (!parsed.ok) {
    return parsed.result;
  }

  const uiIrPath = path.join(parsed.args.specDir, "ui-ir.json");
  const raw = await readUiIrJson(uiIrPath);
  if (!raw.ok) {
    return raw.result;
  }

  const parsedUiIr = parseUiIr(raw.value);
  if (!parsedUiIr.success) {
    return failure(
      ExitCode.InputOrConfig,
      "ERR_INVALID_UI_IR",
      `Invalid UI IR artifact: ${uiIrPath}`,
      parsedUiIr.error.issues.map((issue) => issue.message).join("; "),
    );
  }

  const snapshot = await readRuntimeText(parsed.args.url);
  if (!snapshot.ok) {
    return snapshot.result;
  }

  const runtimeSource = {
    file: parsed.args.url,
    kind: "runtime",
    line: 1,
  } satisfies SourceRef;
  const evidence = createRuntimeEvidence(
    parsedUiIr.data,
    snapshot.text,
    runtimeSource,
    now,
    parsed.args.url,
  );
  const updatedUiIr = confirmMatchedFacts(parsedUiIr.data, evidence.matchedFacts, runtimeSource);

  await mkdir(parsed.args.specDir, { recursive: true });
  await writeFile(uiIrPath, serializeUiIr(updatedUiIr), "utf8");
  await writeFile(path.join(parsed.args.specDir, "runtime-evidence.json"), json(evidence), "utf8");

  if (evidence.unmatchedFacts.length > 0) {
    return {
      exitCode: ExitCode.RuntimeMismatch,
      stderr: [
        "ERR_RUNTIME_MISMATCH",
        `Runtime validation found ${evidence.unmatchedFacts.length.toString()} unmatched UI facts.`,
        "",
      ].join("\n"),
      stdout: renderSummary(parsed.args.specDir, evidence),
    };
  }

  return {
    exitCode: ExitCode.Success,
    stderr: "",
    stdout: renderSummary(parsed.args.specDir, evidence),
  };
}

function parseValidateRuntimeArgs(args: readonly string[]): ParsedArgs {
  let specDir: string | undefined;
  let url: string | undefined;

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (token === undefined) continue;

    if (token === "--url") {
      url = readRequiredValue(args, index, token);
      index += 1;
    } else if (token.startsWith("-")) {
      return {
        ok: false,
        result: failure(ExitCode.InputOrConfig, "ERR_UNKNOWN_OPTION", `Unknown option: ${token}`),
      };
    } else if (specDir === undefined) {
      specDir = token;
    } else {
      return {
        ok: false,
        result: failure(
          ExitCode.InputOrConfig,
          "ERR_UNEXPECTED_ARGUMENT",
          `Unexpected validate-runtime argument: ${token}`,
        ),
      };
    }
  }

  if (specDir === undefined || url === undefined) {
    return {
      ok: false,
      result: failure(
        ExitCode.InputOrConfig,
        "ERR_MISSING_REQUIRED_ARGUMENT",
        "validate-runtime requires <spec-dir> and --url <url>.",
        "Usage: ui-pop validate-runtime <spec-dir> --url <url>",
      ),
    };
  }

  return { args: { specDir, url }, ok: true };
}

async function readRuntimeText(
  url: string,
): Promise<
  { readonly ok: true; readonly text: string } | { readonly ok: false; readonly result: CliResult }
> {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const response = await page.goto(url, { timeout: 5_000, waitUntil: "domcontentloaded" });
    if (response === null || !response.ok()) {
      return {
        ok: false,
        result: failure(
          ExitCode.InputOrConfig,
          "ERR_RUNTIME_UNREACHABLE",
          `Runtime URL did not return an OK response: ${url}`,
        ),
      };
    }
    return { ok: true, text: await page.locator("body").innerText({ timeout: 5_000 }) };
  } catch (error) {
    return {
      ok: false,
      result: failure(
        ExitCode.InputOrConfig,
        "ERR_RUNTIME_UNREACHABLE",
        error instanceof Error ? error.message : `Runtime URL is unreachable: ${url}`,
      ),
    };
  } finally {
    await browser.close();
  }
}

async function readUiIrJson(
  uiIrPath: string,
): Promise<
  | { readonly ok: true; readonly value: unknown }
  | { readonly ok: false; readonly result: CliResult }
> {
  let raw: string;
  try {
    raw = await readFile(uiIrPath, "utf8");
  } catch (error) {
    if (isMissingFileError(error)) {
      return {
        ok: false,
        result: failure(
          ExitCode.InputOrConfig,
          "ERR_MISSING_ARTIFACT",
          `Missing UI IR artifact: ${uiIrPath}`,
        ),
      };
    }
    throw error;
  }

  try {
    return { ok: true, value: JSON.parse(raw) };
  } catch (error) {
    if (error instanceof SyntaxError) {
      return {
        ok: false,
        result: failure(
          ExitCode.InputOrConfig,
          "ERR_INVALID_UI_IR",
          `Invalid UI IR JSON: ${uiIrPath}`,
          error.message,
        ),
      };
    }
    throw error;
  }
}

function readRequiredValue(args: readonly string[], index: number, option: string): string {
  const value = args[index + 1];
  if (value === undefined || value.startsWith("-")) {
    throw new Error(`${option} requires a value.`);
  }
  return value;
}

function renderSummary(specDir: string, evidence: RuntimeEvidence): string {
  return [
    `Wrote runtime validation evidence to ${path.join(specDir, "runtime-evidence.json")}`,
    `matched=${evidence.summary.matched.toString()}`,
    `unresolved=${evidence.summary.unresolved.toString()}`,
    `mismatched=${evidence.summary.mismatched.toString()}`,
    "",
  ].join("\n");
}

function isMissingFileError(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

function json(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function failure(exitCode: ExitCode, code: string, message: string, hint?: string): CliResult {
  return {
    exitCode,
    stdout: "",
    stderr: [code, message, ...(hint === undefined ? [] : ["", hint]), ""].join("\n"),
  };
}
