import { access, readFile } from "node:fs/promises";
import * as path from "node:path";
import { describe, expect, it } from "vitest";

const fixturesRoot = path.join(process.cwd(), "tests", "fixtures");
const ordersPage = path.join(fixturesRoot, "next-app", "app", "orders", "page.tsx");
const missingPage = path.join(fixturesRoot, "next-app", "app", "missing", "page.tsx");

describe("fixture integrity", () => {
  it("keeps the orders page fixture deterministic and UI-shaped", async () => {
    await expect(access(ordersPage)).resolves.toBeUndefined();

    const source = await readFile(ordersPage, "utf8");

    expect(source).toContain("<h1>Orders</h1>");
    expect(source).toContain('htmlFor="keyword"');
    expect(source).toContain("<table>");
    expect(source).not.toMatch(/password|secret|token|process\\.env/i);
  });

  it("covers a missing fixture route as a negative case", async () => {
    await expect(access(missingPage)).rejects.toThrow();
  });
});
