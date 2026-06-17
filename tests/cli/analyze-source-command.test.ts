import { mkdtemp, readFile, rm } from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCliAsync } from "../../src/cli-core.js";
import { parseUiIr } from "../../src/schema/ui-ir.js";

const ordersEntry = "tests/fixtures/next-app/app/orders/page.tsx";
const malformedEntry = "tests/fixtures/malformed/page.tsx";

let tempRoot: string;

beforeEach(async () => {
  tempRoot = await mkdtemp(path.join(os.tmpdir(), "ui-pop-analyze-source-"));
});

afterEach(async () => {
  await rm(tempRoot, { force: true, recursive: true });
});

describe("analyze-source command", () => {
  it("writes manifest, UI IR, source graph, and sanitized evidence artifacts", async () => {
    const outDir = path.join(tempRoot, "orders-spec");

    const result = await runCliAsync(["analyze-source", ordersEntry, "--out", outDir, "--force"]);

    expect(result).toMatchObject({ exitCode: 0, stderr: "" });
    expect(result.stdout).toContain("ui-ir.json");

    const manifest = JSON.parse(await readFile(path.join(outDir, "manifest.json"), "utf8"));
    const uiIr = JSON.parse(await readFile(path.join(outDir, "ui-ir.json"), "utf8"));
    const sourceGraph = JSON.parse(await readFile(path.join(outDir, "source-graph.json"), "utf8"));
    const evidence = JSON.parse(await readFile(path.join(outDir, "source-evidence.json"), "utf8"));

    expect(parseUiIr(uiIr).success).toBe(true);
    expect(uiIr.screen).toEqual({ id: "orders", route: "/orders", title: "Orders" });
    expect(uiIr.queryConditions.map((field: { label: string }) => field.label)).toEqual([
      "Keyword",
      "Status",
    ]);
    expect(uiIr.actions.map((action: { label: string }) => action.label)).toEqual([
      "Search",
      "Reset",
    ]);
    expect(uiIr.results.columns.map((column: { label: string }) => column.label)).toContain(
      "Order ID",
    );
    expect(uiIr.queryConditions[0].confidence).toBe("source-static");
    expect(manifest.artifacts).toEqual([
      "manifest.json",
      "ui-ir.json",
      "source-graph.json",
      "source-evidence.json",
    ]);
    expect(sourceGraph.files).toContain(ordersEntry);
    expect(JSON.stringify(evidence)).not.toContain("process.env");
    expect(JSON.stringify(evidence)).not.toContain("password");
  });

  it("protects existing output without force and avoids partial output for malformed TSX", async () => {
    const outDir = path.join(tempRoot, "orders-spec");
    const first = await runCliAsync(["analyze-source", ordersEntry, "--out", outDir, "--force"]);
    expect(first.exitCode).toBe(0);
    const beforeManifest = await readFile(path.join(outDir, "manifest.json"), "utf8");

    const blocked = await runCliAsync(["analyze-source", ordersEntry, "--out", outDir]);
    expect(blocked.exitCode).not.toBe(0);
    expect(blocked.stderr).toContain("ERR_OUTPUT_EXISTS");
    expect(await readFile(path.join(outDir, "manifest.json"), "utf8")).toBe(beforeManifest);

    const malformedOut = path.join(tempRoot, "malformed-spec");
    const malformed = await runCliAsync([
      "analyze-source",
      malformedEntry,
      "--out",
      malformedOut,
      "--force",
    ]);
    expect(malformed.exitCode).not.toBe(0);
    expect(malformed.stderr).toContain("ERR_MALFORMED_TSX");
    await expect(readFile(path.join(malformedOut, "ui-ir.json"), "utf8")).rejects.toThrow();
  });
});
