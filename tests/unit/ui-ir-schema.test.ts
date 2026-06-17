import { describe, expect, it } from "vitest";
import { parseUiIr, serializeUiIr, type UiIr } from "../../src/schema/ui-ir.js";

const validUiIr: UiIr = {
  actions: [
    {
      confidence: "source-static",
      id: "search",
      label: "Search",
      role: "submit",
      sources: [{ file: "tests/fixtures/next-app/app/orders/page.tsx", kind: "jsx", line: 16 }],
    },
  ],
  queryConditions: [
    {
      confidence: "source-static",
      control: "text",
      id: "keyword",
      label: "Keyword",
      sources: [{ file: "tests/fixtures/next-app/app/orders/page.tsx", kind: "jsx", line: 8 }],
    },
  ],
  results: {
    columns: [
      {
        confidence: "source-static",
        id: "order-id",
        label: "Order ID",
        sources: [{ file: "tests/fixtures/next-app/app/orders/page.tsx", kind: "jsx", line: 22 }],
      },
    ],
    kind: "table",
  },
  schemaVersion: 1,
  screen: {
    id: "orders",
    route: "/orders",
    title: "Orders",
  },
};

describe("UI IR schema", () => {
  it("accepts a minimal source-backed screen contract", () => {
    const result = parseUiIr(validUiIr);

    expect(result.success).toBe(true);
  });

  it("serializes deterministically", () => {
    const first = serializeUiIr(validUiIr);
    const second = serializeUiIr({
      ...validUiIr,
      screen: {
        title: "Orders",
        route: "/orders",
        id: "orders",
      },
    });

    expect(first).toBe(second);
    expect(first.endsWith("\n")).toBe(true);
  });

  it("rejects invalid schema versions and missing source evidence", () => {
    const invalid = {
      ...validUiIr,
      queryConditions: [
        {
          confidence: "source-static",
          control: "text",
          id: "keyword",
          label: "Keyword",
          sources: [],
        },
      ],
      schemaVersion: 2,
    };

    const result = parseUiIr(invalid);

    expect(result.success).toBe(false);
  });
});
