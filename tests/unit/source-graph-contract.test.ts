import { describe, expect, it } from "vitest";
import { buildSourceGraph } from "../../src/source-graph/source-graph.js";

const ordersEntry = "tests/fixtures/next-app/app/orders/page.tsx";
const malformedEntry = "tests/fixtures/malformed/page.tsx";
const unsupportedEntry = "tests/fixtures/plain-helper.ts";

describe("source graph contract", () => {
  it("accepts a TSX screen entry", async () => {
    const result = await buildSourceGraph({
      entry: ordersEntry,
      maxDepth: 2,
      maxFiles: 80,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.graph.files).toEqual([ordersEntry]);
      expect(result.graph.truncated).toBe(false);
    }
  });

  it("rejects unsupported direct .ts entries", async () => {
    const result = await buildSourceGraph({
      entry: unsupportedEntry,
      maxDepth: 2,
      maxFiles: 80,
    });

    expect(result).toMatchObject({
      code: "ERR_UNSUPPORTED_ENTRY",
      ok: false,
    });
  });

  it("rejects malformed TSX screen entries", async () => {
    const result = await buildSourceGraph({
      entry: malformedEntry,
      maxDepth: 2,
      maxFiles: 80,
    });

    expect(result).toMatchObject({
      code: "ERR_MALFORMED_TSX",
      ok: false,
    });
  });

  it("rejects graph bounds that cannot be honored", async () => {
    await expect(
      buildSourceGraph({
        entry: ordersEntry,
        maxDepth: 0,
        maxFiles: 80,
      }),
    ).resolves.toMatchObject({
      code: "ERR_GRAPH_DEPTH_EXCEEDED",
      ok: false,
    });

    await expect(
      buildSourceGraph({
        entry: ordersEntry,
        maxDepth: 2,
        maxFiles: 0,
      }),
    ).resolves.toMatchObject({
      code: "ERR_GRAPH_FILE_LIMIT_EXCEEDED",
      ok: false,
    });
  });
});
