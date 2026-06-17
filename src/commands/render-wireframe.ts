import { mkdir, readFile, writeFile } from "node:fs/promises";
import * as path from "node:path";
import { ExitCode } from "../exit-codes.js";
import { parseUiIr, type UiIr } from "../schema/ui-ir.js";
import type { CliResult } from "../types.js";

type RenderWireframeArgs = { readonly force: boolean; readonly specDir: string };
type ParsedArgs =
  | { readonly ok: true; readonly args: RenderWireframeArgs }
  | { readonly ok: false; readonly result: CliResult };

export async function runRenderWireframeCommand(args: readonly string[]): Promise<CliResult> {
  const parsed = parseRenderWireframeArgs(args);
  if (!parsed.ok) return parsed.result;

  const outputPath = path.join(parsed.args.specDir, "wireframe.html");
  if (!parsed.args.force && (await fileExists(outputPath))) {
    return failure(
      "ERR_OUTPUT_EXISTS",
      `Output artifact already exists: ${outputPath}`,
      "Re-run with --force to overwrite wireframe.html.",
    );
  }

  const uiIrPath = path.join(parsed.args.specDir, "ui-ir.json");
  const raw = await readUiIrJson(uiIrPath);
  if (!raw.ok) return raw.result;

  const parsedUiIr = parseUiIr(raw.value);
  if (!parsedUiIr.success) {
    return failure(
      "ERR_INVALID_UI_IR",
      `Invalid UI IR artifact: ${uiIrPath}`,
      parsedUiIr.error.issues.map((issue) => issue.message).join("; "),
    );
  }

  await mkdir(parsed.args.specDir, { recursive: true });
  await writeFile(outputPath, renderWireframeHtml(parsedUiIr.data), "utf8");

  return {
    exitCode: ExitCode.Success,
    stderr: "",
    stdout: [`Wrote HTML wireframe to ${outputPath}`, "- wireframe.html", ""].join("\n"),
  };
}

function parseRenderWireframeArgs(args: readonly string[]): ParsedArgs {
  let force = false;
  let specDir: string | undefined;

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (token === undefined) continue;

    if (token === "--force") {
      force = true;
    } else if (token.startsWith("-")) {
      return {
        ok: false,
        result: failure("ERR_UNKNOWN_OPTION", `Unknown render-wireframe option: ${token}`),
      };
    } else if (specDir === undefined) {
      specDir = token;
    } else {
      return {
        ok: false,
        result: failure(
          "ERR_UNEXPECTED_ARGUMENT",
          `Unexpected render-wireframe argument: ${token}`,
        ),
      };
    }
  }

  if (specDir === undefined) {
    return {
      ok: false,
      result: failure(
        "ERR_MISSING_REQUIRED_ARGUMENT",
        "render-wireframe requires <spec-dir>.",
        "Usage: ui-pop render-wireframe <spec-dir> [--force]",
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

function renderWireframeHtml(uiIr: UiIr): string {
  return [
    '<!doctype html><html lang="en"><head><meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${escapeHtml(uiIr.screen.title)} wireframe</title>`,
    `<style>${renderStyles()}</style></head><body>`,
    '<main class="shell" aria-labelledby="screen-title">',
    '<header class="screen-header">',
    `<p class="route">${escapeHtml(uiIr.screen.route)}</p>`,
    `<h1 id="screen-title">${escapeHtml(uiIr.screen.title)}</h1>`,
    "</header>",
    renderQuerySection(uiIr),
    renderActionsSection(uiIr),
    renderResultsSection(uiIr),
    renderStatesSection(),
    "</main></body></html>",
    "",
  ].join("\n");
}

function renderQuerySection(uiIr: UiIr): string {
  const controls = uiIr.queryConditions.map((field) =>
    [
      `<div class="field" data-ui-pop="query-condition"><label for="field-${escapeHtml(
        field.id,
      )}">${escapeHtml(field.label)}</label>`,
      renderControl(field.control, field.id, field.label),
      `${renderMeta(field.confidence, field.sources)}</div>`,
    ].join("\n"),
  );

  return panel("query-title", "Query Conditions", controls);
}

function renderActionsSection(uiIr: UiIr): string {
  const actions = uiIr.actions.map((action) =>
    [
      `<div class="action-row"><button type="${action.role === "submit" || action.role === "reset" ? action.role : "button"}" data-ui-pop="action">${escapeHtml(action.label)}</button>`,
      `${renderMeta(action.confidence, action.sources)}</div>`,
    ].join("\n"),
  );

  return panel("actions-title", "Actions", actions);
}

function renderResultsSection(uiIr: UiIr): string {
  const columns = uiIr.results.columns.map(
    (column) => `<th scope="col" data-ui-pop="result-column">${escapeHtml(column.label)}</th>`,
  );
  const cells = uiIr.results.columns.map((column) => `<td>${escapeHtml(column.label)} sample</td>`);
  const table = [
    '<div class="table-wrap"><table aria-describedby="results-helper"><thead><tr>',
    ...columns,
    "</tr></thead><tbody><tr>",
    ...cells,
    "</tr></tbody></table></div>",
    '<p id="results-helper" class="helper">Result kind: table layout inferred from UI IR.</p>',
  ];

  return panel("results-title", "Results", table);
}

function renderStatesSection(): string {
  const states = [
    '<section class="state" data-ui-pop-state="empty" aria-label="Empty state">No results yet.</section>',
    '<section class="state" data-ui-pop-state="loading" aria-label="Loading state" aria-live="polite">Loading results.</section>',
    '<section class="state error" data-ui-pop-state="error" aria-label="Error state" role="alert">Unable to load results.</section>',
  ];
  return panel("states-title", "States", states);
}

function panel(titleId: string, title: string, children: readonly string[]): string {
  const content = children.length === 0 ? ['<p class="helper">No entries recorded.</p>'] : children;
  return [
    `<section class="panel" aria-labelledby="${titleId}"><h2 id="${titleId}">${title}</h2>`,
    ...content,
    "</section>",
  ].join("\n");
}

function renderControl(
  control: UiIr["queryConditions"][number]["control"],
  id: string,
  label: string,
): string {
  const fieldId = `field-${escapeHtml(id)}`;
  const fieldLabel = escapeHtml(label);
  switch (control) {
    case "text":
      return `<input id="${fieldId}" name="${escapeHtml(id)}" type="text" placeholder="${fieldLabel}">`;
    case "select":
      return `<select id="${fieldId}" name="${escapeHtml(id)}"><option>${fieldLabel}</option></select>`;
    case "date":
      return `<input id="${fieldId}" name="${escapeHtml(id)}" type="date">`;
    case "checkbox":
      return `<input id="${fieldId}" name="${escapeHtml(id)}" type="checkbox">`;
    case "number":
      return `<input id="${fieldId}" name="${escapeHtml(id)}" type="number" inputmode="numeric">`;
    default:
      return assertNever(control);
  }
}

function renderMeta(
  confidence: string,
  sources: UiIr["queryConditions"][number]["sources"],
): string {
  return `<p class="meta">${escapeHtml(confidence)} · ${escapeHtml(renderSources(sources))}</p>`;
}

function renderSources(sources: UiIr["queryConditions"][number]["sources"]): string {
  return sources
    .map((source) => `${source.file}:${source.line.toString()} (${source.kind})`)
    .join(", ");
}

function renderStyles(): string {
  return [
    ':root{--surface-primary: #F7F8FA;--surface-secondary: #FFFFFF;--surface-elevated: #F1F4F7;--text-primary: #17202A;--text-secondary: #536170;--text-tertiary: #7B8794;--border-default: #D9E0E7;--border-subtle: #E8EDF2;--accent-primary: #256F7E;--accent-hover: #1F5D69;--status-error: #B84A4A;--space-1: 4px;--space-2: 8px;--space-3: 12px;--space-4: 16px;--space-5: 20px;--space-6: 24px;--space-8: 32px;--font-primary: system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;--font-mono: "SFMono-Regular",Consolas,"Liberation Mono",monospace;}',
    "@media (prefers-color-scheme:dark){:root{--surface-primary: #111318;--surface-secondary: #171A21;--surface-elevated: #20242D;--text-primary: #F4F7FA;--text-secondary: #A8B3C0;--text-tertiary: #768291;--border-default: #303846;--border-subtle: #252B35;--accent-primary: #4CA6B5;--accent-hover: #6AB7C3;--status-error: #E06C6C;}}",
    "*{box-sizing:border-box;}body{margin:0;background:var(--surface-primary);color:var(--text-primary);font-family:var(--font-primary);font-size:14px;line-height:1.55;}.shell{max-width:1180px;margin:0 auto;padding:var(--space-8) var(--space-6);}.screen-header,.panel{margin-block-end:var(--space-6);}.route,.meta,.helper{color:var(--text-secondary);}.route,.meta{font-family:var(--font-mono);font-size:12px;}h1,h2{margin:0 0 var(--space-4);letter-spacing:0;}h1{font-size:28px;line-height:1.2;}h2{font-size:20px;line-height:1.3;}",
    ".panel{background:var(--surface-secondary);border:1px solid var(--border-default);padding:var(--space-4);}.field,.action-row,.state{display:grid;gap:var(--space-2);padding:var(--space-3) 0;border-top:1px solid var(--border-subtle);}label{font-weight:650;}input,select,button{width:100%;border:1px solid var(--border-default);background:var(--surface-primary);color:var(--text-primary);font:inherit;padding:var(--space-2) var(--space-3);}button{background:var(--accent-primary);color:var(--surface-secondary);cursor:pointer;}button:hover{background:var(--accent-hover);}",
    ".table-wrap{overflow-x:auto;border:1px solid var(--border-subtle);}table{width:100%;border-collapse:collapse;}th,td{padding:var(--space-3);border-bottom:1px solid var(--border-subtle);text-align:left;}th{background:var(--surface-elevated);}.state{background:var(--surface-elevated);padding:var(--space-4);}.state.error{border-color:var(--status-error);}input:focus-visible,select:focus-visible,button:focus-visible{outline:2px solid var(--accent-primary);outline-offset:2px;}",
    "@media (min-width:768px){.field,.action-row{grid-template-columns:180px minmax(0,1fr);align-items:start;}.meta{grid-column:2;}}@media (prefers-reduced-motion:no-preference){button{transition:background 120ms ease-out,border-color 120ms ease-out;}}",
  ].join("\n");
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

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function assertNever(value: never): never {
  throw new Error(`Unhandled control: ${value}`);
}

function failure(code: string, message: string, hint?: string): CliResult {
  const stderr = [code, message, ...(hint === undefined ? [] : ["", hint]), ""].join("\n");
  return { exitCode: ExitCode.InputOrConfig, stdout: "", stderr };
}
