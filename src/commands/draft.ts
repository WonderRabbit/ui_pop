import { mkdir, readFile, writeFile } from "node:fs/promises";
import * as path from "node:path";
import { ExitCode } from "../exit-codes.js";
import type { UiIr } from "../schema/ui-ir.js";
import { parseUiIr } from "../schema/ui-ir.js";
import type { CliResult } from "../types.js";

type DraftArgs = {
  readonly force: boolean;
  readonly specDir: string;
};

type ParsedArgs =
  | {
      readonly ok: true;
      readonly args: DraftArgs;
    }
  | {
      readonly ok: false;
      readonly result: CliResult;
    };

type MarkdownRow = {
  readonly label: string;
  readonly typeRoleKind: string;
  readonly confidence: string;
  readonly source: string;
};

export async function runDraftCommand(args: readonly string[]): Promise<CliResult> {
  const parsed = parseDraftArgs(args);
  if (!parsed.ok) {
    return parsed.result;
  }

  const outputPath = path.join(parsed.args.specDir, "ui.md");
  if (!parsed.args.force && (await fileExists(outputPath))) {
    return failure(
      "ERR_OUTPUT_EXISTS",
      `Output artifact already exists: ${outputPath}`,
      "Re-run with --force to overwrite ui.md.",
    );
  }

  const uiIrPath = path.join(parsed.args.specDir, "ui-ir.json");
  const raw = await readUiIrJson(uiIrPath);
  if (!raw.ok) {
    return raw.result;
  }

  const parsedUiIr = parseUiIr(raw.value);
  if (!parsedUiIr.success) {
    return failure(
      "ERR_INVALID_UI_IR",
      `Invalid UI IR artifact: ${uiIrPath}`,
      parsedUiIr.error.issues.map((issue) => issue.message).join("; "),
    );
  }

  await mkdir(parsed.args.specDir, { recursive: true });
  await writeFile(outputPath, renderUiMarkdown(parsedUiIr.data), "utf8");

  return {
    exitCode: ExitCode.Success,
    stderr: "",
    stdout: [`Wrote UI markdown draft to ${outputPath}`, "- ui.md", ""].join("\n"),
  };
}

function parseDraftArgs(args: readonly string[]): ParsedArgs {
  let force = false;
  let specDir: string | undefined;

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (token === undefined) {
      continue;
    }

    if (token === "--force") {
      force = true;
    } else if (token.startsWith("-")) {
      return {
        ok: false,
        result: failure("ERR_UNKNOWN_OPTION", `Unknown draft option: ${token}`),
      };
    } else if (specDir === undefined) {
      specDir = token;
    } else {
      return {
        ok: false,
        result: failure("ERR_UNEXPECTED_ARGUMENT", `Unexpected draft argument: ${token}`),
      };
    }
  }

  if (specDir === undefined) {
    return {
      ok: false,
      result: failure(
        "ERR_MISSING_REQUIRED_ARGUMENT",
        "draft requires <spec-dir>.",
        "Usage: ui-pop draft <spec-dir> [--force]",
      ),
    };
  }

  return { args: { force, specDir }, ok: true };
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
        result: failure("ERR_MISSING_ARTIFACT", `Missing UI IR artifact: ${uiIrPath}`),
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
        result: failure("ERR_INVALID_UI_IR", `Invalid UI IR JSON: ${uiIrPath}`, error.message),
      };
    }
    throw error;
  }
}

function renderUiMarkdown(uiIr: UiIr): string {
  return [
    "# UI Definition",
    "",
    "## Screen",
    renderTable([
      {
        confidence: "",
        label: `${uiIr.screen.title} (${uiIr.screen.route})`,
        source: "",
        typeRoleKind: "screen",
      },
    ]),
    "## Query Conditions",
    renderTable(
      uiIr.queryConditions.map((field) => ({
        confidence: field.confidence,
        label: field.label,
        source: renderSources(field.sources),
        typeRoleKind: field.control,
      })),
    ),
    "## Actions",
    renderTable(
      uiIr.actions.map((action) => ({
        confidence: action.confidence,
        label: action.label,
        source: renderSources(action.sources),
        typeRoleKind: action.role,
      })),
    ),
    "## Results",
    renderTable(
      uiIr.results.columns.map((column) => ({
        confidence: column.confidence,
        label: column.label,
        source: renderSources(column.sources),
        typeRoleKind: uiIr.results.kind,
      })),
    ),
  ].join("\n");
}

function renderTable(rows: readonly MarkdownRow[]): string {
  const renderedRows =
    rows.length === 0
      ? ["| No entries recorded |  |  |  |"]
      : rows.map(
          (row) =>
            `| ${escapeCell(row.label)} | ${escapeCell(row.typeRoleKind)} | ${escapeCell(
              row.confidence,
            )} | ${escapeCell(row.source)} |`,
        );

  return [
    "| Label | Type/Role/Kind | Confidence | Source |",
    "| --- | --- | --- | --- |",
    ...renderedRows,
    "",
  ].join("\n");
}

function renderSources(sources: UiIr["queryConditions"][number]["sources"]): string {
  return sources
    .map((source) => `${source.file}:${source.line.toString()} (${source.kind})`)
    .join(", ");
}

function escapeCell(value: string): string {
  return value.replaceAll("\n", " ").replaceAll("|", "\\|");
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await readFile(filePath, "utf8");
    return true;
  } catch (error) {
    if (isMissingFileError(error)) {
      return false;
    }
    throw error;
  }
}

function isMissingFileError(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

function failure(code: string, message: string, hint?: string): CliResult {
  return {
    exitCode: ExitCode.InputOrConfig,
    stdout: "",
    stderr: [code, message, ...(hint === undefined ? [] : ["", hint]), ""].join("\n"),
  };
}
