import type { UiIr } from "../schema/ui-ir.js";

export type FactKind = "screen" | "query" | "action" | "result";
export type RuntimeStatus = "matched" | "unresolved" | "mismatched";
export type SourceRef = UiIr["queryConditions"][number]["sources"][number];

export type RuntimeFact = {
  readonly id: string;
  readonly kind: FactKind;
  readonly label: string;
  readonly source: SourceRef;
  readonly status: RuntimeStatus;
};

export type RuntimeEvidence = {
  readonly checkedAt: string;
  readonly matchedFacts: readonly RuntimeFact[];
  readonly schemaVersion: 1;
  readonly summary: {
    readonly matched: number;
    readonly mismatched: number;
    readonly unresolved: number;
  };
  readonly unmatchedFacts: readonly RuntimeFact[];
  readonly url: string;
};

export function createRuntimeEvidence(
  uiIr: UiIr,
  text: string,
  source: SourceRef,
  now: Date,
  url: string,
): RuntimeEvidence {
  const facts = [
    makeFact("screen", uiIr.screen.id, uiIr.screen.title, text, source),
    ...uiIr.queryConditions.map((field) => makeFact("query", field.id, field.label, text, source)),
    ...uiIr.actions.map((action) => makeFact("action", action.id, action.label, text, source)),
    ...uiIr.results.columns.map((column) =>
      makeFact("result", column.id, column.label, text, source),
    ),
  ];
  const matchedFacts = facts.filter((fact) => fact.status === "matched");
  const unmatchedFacts = facts.filter((fact) => fact.status !== "matched");

  return {
    checkedAt: now.toISOString(),
    matchedFacts,
    schemaVersion: 1,
    summary: {
      matched: matchedFacts.length,
      mismatched: unmatchedFacts.filter((fact) => fact.status === "mismatched").length,
      unresolved: unmatchedFacts.filter((fact) => fact.status === "unresolved").length,
    },
    unmatchedFacts,
    url,
  };
}

export function confirmMatchedFacts(
  uiIr: UiIr,
  matchedFacts: readonly RuntimeFact[],
  runtimeSource: SourceRef,
): UiIr {
  return {
    ...uiIr,
    actions: uiIr.actions.map((action) =>
      hasMatchedFact(matchedFacts, "action", action.id)
        ? {
            ...action,
            confidence: "runtime-confirmed",
            sources: appendSource(action.sources, runtimeSource),
          }
        : action,
    ),
    queryConditions: uiIr.queryConditions.map((field) =>
      hasMatchedFact(matchedFacts, "query", field.id)
        ? {
            ...field,
            confidence: "runtime-confirmed",
            sources: appendSource(field.sources, runtimeSource),
          }
        : field,
    ),
    results: {
      ...uiIr.results,
      columns: uiIr.results.columns.map((column) =>
        hasMatchedFact(matchedFacts, "result", column.id)
          ? {
              ...column,
              confidence: "runtime-confirmed",
              sources: appendSource(column.sources, runtimeSource),
            }
          : column,
      ),
    },
  };
}

function makeFact(
  kind: FactKind,
  id: string,
  label: string,
  text: string,
  source: SourceRef,
): RuntimeFact {
  if (text.includes(label)) {
    return { id, kind, label, source, status: "matched" };
  }

  return {
    id,
    kind,
    label,
    source,
    status: kind === "screen" ? "mismatched" : "unresolved",
  };
}

function hasMatchedFact(facts: readonly RuntimeFact[], kind: FactKind, id: string): boolean {
  return facts.some((fact) => fact.kind === kind && fact.id === id);
}

function appendSource(sources: readonly SourceRef[], runtimeSource: SourceRef): SourceRef[] {
  if (sources.some((source) => source.kind === "runtime" && source.file === runtimeSource.file)) {
    return [...sources];
  }
  return [...sources, runtimeSource];
}
