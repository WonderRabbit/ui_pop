import { describe, expect, it } from "vitest";
import { analyzeScreenSource } from "../../src/analyzer/source-analysis.js";
import { buildSourceGraph } from "../../src/source-graph/source-graph.js";

const ordersEntry = "tests/fixtures/next-app/app/orders/page.tsx";
const malformedEntry = "tests/fixtures/malformed/page.tsx";
const unsupportedEntry = "tests/fixtures/plain-helper.ts";
const cycleEntry = "tests/fixtures/failures/cycle/a/page.tsx";
const dynamicEntry = "tests/fixtures/failures/dynamic/page.tsx";

describe("source analysis failure fixtures", () => {
  it("reports structural typed failures and bounded traversal when structural fixtures are analyzed", async () => {
    // Given
    const graphBounds = { entry: ordersEntry, maxDepth: 0, maxFiles: 80 };

    // When
    const malformed = await analyzeScreenSource({
      entry: malformedEntry,
      maxDepth: 2,
      maxFiles: 80,
    });
    const unsupported = await analyzeScreenSource({
      entry: unsupportedEntry,
      maxDepth: 2,
      maxFiles: 80,
    });
    const bounded = await buildSourceGraph(graphBounds);
    const timeout = await analyzeScreenSource({
      entry: ordersEntry,
      maxDepth: 2,
      maxFiles: 80,
      timeoutMs: 0,
    });
    const missingTsconfig = await analyzeScreenSource({
      entry: ordersEntry,
      maxDepth: 2,
      maxFiles: 80,
      tsconfig: "tests/fixtures/missing-tsconfig.json",
    });
    const cycle = await buildSourceGraph({ entry: cycleEntry, maxDepth: 4, maxFiles: 8 });

    // Then
    expect(malformed).toMatchObject({ code: "ERR_MALFORMED_TSX", ok: false });
    expect(unsupported).toMatchObject({ code: "ERR_UNSUPPORTED_ENTRY", ok: false });
    expect(bounded).toMatchObject({ code: "ERR_GRAPH_DEPTH_EXCEEDED", ok: false });
    expect(timeout).toMatchObject({ code: "ERR_ANALYSIS_TIMEOUT", ok: false });
    expect(missingTsconfig.ok).toBe(true);
    expect(cycle.ok).toBe(true);
    if (!cycle.ok) {
      throw new Error(cycle.message);
    }
    expect(cycle.graph.files).toContain(cycleEntry);
    expect(cycle.graph.files.length).toBeLessThanOrEqual(2);
  });

  it("keeps dynamic and wrapper-driven facts unresolved when unresolved fixtures are analyzed", async () => {
    // Given
    const options = { entry: dynamicEntry, maxDepth: 2, maxFiles: 80 };

    // When
    const result = await analyzeScreenSource(options);

    // Then
    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error(result.message);
    }
    expect(result.uiIr.queryConditions).toEqual([]);
    expect(result.uiIr.results).toEqual({ columns: [], kind: "empty" });
    expect(result.unresolvedNotes).toContain(
      "Invalid form control wiring: label keyword has no matching static control.",
    );
    expect(result.unresolvedNotes).toContain("Nonliteral query key detected.");
    expect(result.unresolvedNotes).toContain("No static table headers detected.");
    expect(result.unresolvedNotes).toContain("Ambiguous fetch wrapper detected.");
    expect(result.unresolvedNotes).toContain("Unresolved data wrapper detected.");
  });
});
