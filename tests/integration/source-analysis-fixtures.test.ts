import { describe, expect, it } from "vitest";
import { analyzeScreenSource } from "../../src/analyzer/source-analysis.js";
import { parseUiIr } from "../../src/schema/ui-ir.js";

const ordersEntry = "tests/fixtures/next-app/app/orders/page.tsx";
const emptyEntry = "tests/fixtures/next-app/app/empty/page.tsx";

describe("source analysis fixtures", () => {
  it("extracts source-graph, Next route, form, table, and data facts when orders fixture is analyzed", async () => {
    // Given
    const options = { entry: ordersEntry, maxDepth: 2, maxFiles: 80 };

    // When
    const result = await analyzeScreenSource(options);

    // Then
    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error(result.message);
    }

    expect(result.graph.files).toContain(ordersEntry);
    expect(result.uiIr.screen).toEqual({
      id: "orders",
      route: "/orders",
      title: "Orders",
    });
    expect(result.uiIr.queryConditions.map((field) => field.label)).toEqual(["Keyword", "Status"]);
    expect(result.uiIr.actions.map((action) => action.label)).toEqual(["Search", "Reset"]);
    expect(result.uiIr.results).toMatchObject({
      kind: "table",
      columns: [{ label: "Order ID" }, { label: "Status" }, { label: "Total" }],
    });
    expect(result.evidenceSummary).toContain("source-graph-fixture");
    expect(result.evidenceSummary).toContain("analyze-data-fixture");
    expect(result.uiIr.queryConditions.every((field) => field.confidence === "source-static")).toBe(
      true,
    );
    expect(parseUiIr(result.uiIr).success).toBe(true);
  });

  it("returns unresolved notes instead of invented fields when sparse fixture is analyzed", async () => {
    // Given
    const options = { entry: emptyEntry, maxDepth: 2, maxFiles: 80 };

    // When
    const result = await analyzeScreenSource(options);

    // Then
    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error(result.message);
    }

    expect(result.uiIr.screen).toEqual({
      id: "empty",
      route: "/empty",
      title: "Empty",
    });
    expect(result.uiIr.queryConditions).toEqual([]);
    expect(result.uiIr.actions).toEqual([]);
    expect(result.uiIr.results).toEqual({ columns: [], kind: "empty" });
    expect(result.unresolvedNotes).toContain("No form controls detected.");
    expect(result.unresolvedNotes).toContain("No result table detected.");
    expect(parseUiIr(result.uiIr).success).toBe(true);
  });
});
