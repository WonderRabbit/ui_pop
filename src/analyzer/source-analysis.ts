import { readFile } from "node:fs/promises";
import * as path from "node:path";
import type { UiIr } from "../schema/ui-ir.js";
import {
  buildSourceGraph,
  type SourceGraphErrorCode,
  type SourceGraphOptions,
  type SourceGraphResult,
} from "../source-graph/source-graph.js";

export type AnalyzeScreenOptions = SourceGraphOptions & {
  readonly timeoutMs?: number;
  readonly tsconfig?: string;
};

export type AnalyzeScreenErrorCode = SourceGraphErrorCode | "ERR_ANALYSIS_TIMEOUT";

export type AnalyzeScreenFailure = {
  readonly ok: false;
  readonly code: AnalyzeScreenErrorCode;
  readonly message: string;
};

export type AnalyzeScreenSuccess = {
  readonly ok: true;
  readonly graph: SourceGraphResult;
  readonly uiIr: UiIr;
  readonly evidenceSummary: readonly string[];
  readonly unresolvedNotes: readonly string[];
};

export type AnalyzeScreenResult = AnalyzeScreenSuccess | AnalyzeScreenFailure;

export async function analyzeScreenSource(
  options: AnalyzeScreenOptions,
): Promise<AnalyzeScreenResult> {
  if (options.timeoutMs !== undefined && options.timeoutMs <= 0) {
    return {
      code: "ERR_ANALYSIS_TIMEOUT",
      message: "Analysis timeout must be greater than 0 milliseconds.",
      ok: false,
    };
  }

  const graphResult = await buildSourceGraph(options);
  if (!graphResult.ok) {
    return graphResult;
  }

  const source = await readFile(options.entry, "utf8");
  const screen = inferScreen(options.entry, source);
  const formExtraction = extractFields(options.entry, source);
  const actions = extractActions(options.entry, source);
  const columns = extractColumns(options.entry, source);
  const unresolvedNotes = collectUnresolvedNotes(
    source,
    formExtraction.fields.length,
    columns.length,
    formExtraction.unresolvedNotes,
  );

  return {
    evidenceSummary: collectEvidenceSummary(source, formExtraction.fields.length, columns.length),
    graph: graphResult.graph,
    ok: true,
    uiIr: {
      actions,
      queryConditions: formExtraction.fields,
      results: {
        columns,
        kind: columns.length > 0 ? "table" : "empty",
      },
      schemaVersion: 1,
      screen,
    },
    unresolvedNotes,
  };
}

type FormExtraction = {
  readonly fields: UiIr["queryConditions"];
  readonly unresolvedNotes: readonly string[];
};

function inferScreen(entry: string, source: string): UiIr["screen"] {
  const routeName = inferRouteName(entry);
  const fallbackTitle = titleCase(routeName);

  return {
    id: kebabCase(routeName),
    route: `/${kebabCase(routeName)}`,
    title: firstMatch(source, /<h1>([^<]+)<\/h1>/) ?? fallbackTitle,
  };
}

function inferRouteName(entry: string): string {
  const normalized = entry.split(path.sep).join("/");
  const appMarker = "/app/";
  const markerIndex = normalized.indexOf(appMarker);
  if (markerIndex >= 0) {
    const routePath = normalized.slice(markerIndex + appMarker.length);
    const firstSegment = routePath.split("/").find((segment) => segment.length > 0);
    if (firstSegment !== undefined && firstSegment !== "page.tsx") {
      return firstSegment;
    }
  }

  const parent = path.basename(path.dirname(entry));
  return parent.length > 0 ? parent : "screen";
}

function extractFields(entry: string, source: string): FormExtraction {
  const fields: UiIr["queryConditions"] = [];
  const unresolvedNotes: string[] = [];
  const labelPattern = /<label\s+htmlFor="([^"]+)">([^<]+)<\/label>\s*<(input|select)([^>]*)/g;
  let match = labelPattern.exec(source);

  while (match !== null) {
    const id = match[1];
    const label = match[2];
    const element = match[3];
    const attrs = match[4];
    if (
      id !== undefined &&
      label !== undefined &&
      element !== undefined &&
      attrs !== undefined &&
      hasStaticId(attrs, id)
    ) {
      fields.push({
        confidence: "source-static",
        control: element === "select" ? "select" : "text",
        id,
        label: label.trim(),
        sources: [{ file: entry, kind: "jsx", line: lineNumberAt(source, match.index) }],
      });
    } else if (id !== undefined) {
      unresolvedNotes.push(
        `Invalid form control wiring: label ${id} has no matching static control.`,
      );
    }
    match = labelPattern.exec(source);
  }

  return { fields, unresolvedNotes };
}

function extractActions(entry: string, source: string): UiIr["actions"] {
  const actions: UiIr["actions"] = [];
  const buttonPattern = /<button(?:\s+type="([^"]+)")?[^>]*>([^<]+)<\/button>/g;
  let match = buttonPattern.exec(source);

  while (match !== null) {
    const type = match[1];
    const label = match[2];
    if (label !== undefined) {
      actions.push({
        confidence: "source-static",
        id: kebabCase(label),
        label: label.trim(),
        role: buttonRole(type),
        sources: [{ file: entry, kind: "jsx", line: lineNumberAt(source, match.index) }],
      });
    }
    match = buttonPattern.exec(source);
  }

  return actions;
}

function extractColumns(entry: string, source: string): UiIr["results"]["columns"] {
  const columns: UiIr["results"]["columns"] = [];
  const columnPattern = /<th>([^<]+)<\/th>/g;
  let match = columnPattern.exec(source);

  while (match !== null) {
    const label = match[1];
    if (label !== undefined) {
      columns.push({
        confidence: "source-static",
        id: kebabCase(label),
        label: label.trim(),
        sources: [{ file: entry, kind: "jsx", line: lineNumberAt(source, match.index) }],
      });
    }
    match = columnPattern.exec(source);
  }

  return columns;
}

function buttonRole(type: string | undefined): UiIr["actions"][number]["role"] {
  switch (type) {
    case "reset":
      return "reset";
    case "button":
      return "navigate";
    case "submit":
    case undefined:
      return "submit";
    default:
      return "submit";
  }
}

function collectEvidenceSummary(
  source: string,
  fieldCount: number,
  columnCount: number,
): readonly string[] {
  const evidence: string[] = ["source-graph-fixture", "analyze-next-fixture"];
  if (fieldCount > 0) {
    evidence.push("analyze-form-fixture");
  }
  if (columnCount > 0) {
    evidence.push("analyze-table-fixture");
  }
  if (/\bconst\s+\w+Options\b/.test(source)) {
    evidence.push("analyze-data-fixture");
  }
  return evidence;
}

function collectUnresolvedNotes(
  source: string,
  fieldCount: number,
  columnCount: number,
  formNotes: readonly string[],
): readonly string[] {
  const notes: string[] = [...formNotes];
  if (fieldCount === 0) {
    notes.push("No form controls detected.");
  }
  if (/<table[\s>]/.test(source) && columnCount === 0) {
    notes.push("No static table headers detected.");
  } else if (columnCount === 0) {
    notes.push("No result table detected.");
  }
  if (/htmlFor=\{|id=\{/.test(source)) {
    notes.push("Nonliteral query key detected.");
  }
  if (/fetch\w+ViaUnknownWrapper/.test(source)) {
    notes.push("Ambiguous fetch wrapper detected.");
  }
  if (/use\w+Fetcher/.test(source)) {
    notes.push("Unresolved data wrapper detected.");
  }
  return notes;
}

function hasStaticId(attrs: string, id: string): boolean {
  return attrs.includes(`id="${id}"`);
}

function firstMatch(source: string, pattern: RegExp): string | undefined {
  const match = pattern.exec(source);
  return match?.[1]?.trim();
}

function lineNumberAt(source: string, index: number): number {
  return source.slice(0, index).split("\n").length;
}

function kebabCase(value: string): string {
  return value
    .trim()
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function titleCase(value: string): string {
  return value
    .split(/[-_\s]+/)
    .filter((part) => part.length > 0)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}
