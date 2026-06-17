import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCli, runCliAsync } from "../../src/cli-core.js";
import { ExitCode } from "../../src/exit-codes.js";
import type { UiIr } from "../../src/schema/ui-ir.js";

const uiIrFixture = {
  actions: [
    {
      confidence: "source-static",
      id: "search",
      label: "Search",
      role: "submit",
      sources: [{ file: "src/screens/orders.tsx", kind: "jsx", line: 18 }],
    },
    {
      confidence: "source-static",
      id: "reset",
      label: "Reset",
      role: "reset",
      sources: [{ file: "src/screens/orders.tsx", kind: "jsx", line: 19 }],
    },
  ],
  queryConditions: [
    {
      confidence: "source-static",
      control: "text",
      id: "keyword",
      label: "Keyword",
      sources: [{ file: "src/screens/orders.tsx", kind: "jsx", line: 8 }],
    },
    {
      confidence: "source-static",
      control: "select",
      id: "status",
      label: "Status",
      sources: [{ file: "src/screens/orders.tsx", kind: "jsx", line: 12 }],
    },
  ],
  results: {
    columns: [
      {
        confidence: "source-static",
        id: "order-id",
        label: "Order ID",
        sources: [{ file: "src/screens/orders.tsx", kind: "jsx", line: 26 }],
      },
      {
        confidence: "source-static",
        id: "status",
        label: "Status",
        sources: [{ file: "src/screens/orders.tsx", kind: "jsx", line: 27 }],
      },
      {
        confidence: "source-static",
        id: "total",
        label: "Total",
        sources: [{ file: "src/screens/orders.tsx", kind: "jsx", line: 28 }],
      },
    ],
    kind: "table",
  },
  schemaVersion: 1,
  screen: { id: "orders", route: "/orders", title: "Orders" },
} satisfies UiIr;

let tempRoot: string;

beforeEach(async () => {
  tempRoot = await mkdtemp(path.join(os.tmpdir(), "ui-pop-wireframe-"));
});

afterEach(async () => {
  await rm(tempRoot, { force: true, recursive: true });
});

describe("render-wireframe command", () => {
  it("writes deterministic accessible HTML from UI IR", async () => {
    const specDir = path.join(tempRoot, "orders-spec");
    await writeUiIr(specDir, uiIrFixture);

    const result = await runCliAsync(["render-wireframe", specDir, "--force"]);

    expect(result).toMatchObject({ exitCode: ExitCode.Success, stderr: "" });
    expect(result.stdout).toContain("wireframe.html");

    const outputPath = path.join(specDir, "wireframe.html");
    const firstHtml = await readFile(outputPath, "utf8");

    expect(firstHtml).toContain("<title>Orders wireframe</title>");
    expect(firstHtml).toContain('data-ui-pop="query-condition"');
    expect(firstHtml).toContain('data-ui-pop="action"');
    expect(firstHtml).toContain('data-ui-pop="result-column"');
    expect(firstHtml).toContain('data-ui-pop-state="empty"');
    expect(firstHtml).toContain('data-ui-pop-state="loading"');
    expect(firstHtml).toContain('data-ui-pop-state="error"');
    expect(firstHtml).toContain("<label");
    expect(firstHtml).toContain("Keyword");
    expect(firstHtml).toContain("Status");
    expect(firstHtml).toContain("Search");
    expect(firstHtml).toContain("Reset");
    expect(firstHtml).toContain('<th scope="col" data-ui-pop="result-column">Order ID</th>');
    expect(firstHtml).toContain('<th scope="col" data-ui-pop="result-column">Total</th>');
    expect(firstHtml).toContain("--surface-primary: #F7F8FA;");
    expect(firstHtml).not.toContain("<script");

    const second = await runCliAsync(["render-wireframe", specDir, "--force"]);
    const secondHtml = await readFile(outputPath, "utf8");

    expect(second.exitCode).toBe(ExitCode.Success);
    expect(secondHtml).toBe(firstHtml);
  });

  it("protects existing output and avoids partial output for invalid inputs", async () => {
    const existingSpecDir = path.join(tempRoot, "existing-spec");
    await writeUiIr(existingSpecDir, uiIrFixture);
    await writeFile(path.join(existingSpecDir, "wireframe.html"), "keep me\n", "utf8");

    const blocked = await runCliAsync(["render-wireframe", existingSpecDir]);

    expect(blocked.exitCode).not.toBe(0);
    expect(blocked.stderr).toContain("ERR_OUTPUT_EXISTS");
    expect(await readFile(path.join(existingSpecDir, "wireframe.html"), "utf8")).toBe("keep me\n");

    const missingSpecDir = path.join(tempRoot, "missing-spec");
    const missing = await runCliAsync(["render-wireframe", missingSpecDir, "--force"]);

    expect(missing.exitCode).not.toBe(0);
    expect(missing.stderr).toContain("ERR_MISSING_ARTIFACT");
    await expect(readFile(path.join(missingSpecDir, "wireframe.html"), "utf8")).rejects.toThrow();

    const malformedSpecDir = path.join(tempRoot, "malformed-spec");
    await mkdir(malformedSpecDir, { recursive: true });
    await writeFile(path.join(malformedSpecDir, "ui-ir.json"), '{"schemaVersion":2}\n', "utf8");

    const malformed = await runCliAsync(["render-wireframe", malformedSpecDir, "--force"]);

    expect(malformed.exitCode).not.toBe(0);
    expect(malformed.stderr).toContain("ERR_INVALID_UI_IR");
    await expect(readFile(path.join(malformedSpecDir, "wireframe.html"), "utf8")).rejects.toThrow();
  });

  it("prints command help with usage and force option", () => {
    const result = runCli(["render-wireframe", "--help"]);

    expect(result.exitCode).toBe(ExitCode.Success);
    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("ui-pop render-wireframe");
    expect(result.stdout).toContain("render-wireframe <spec-dir> [--force]");
    expect(result.stdout).toContain("--force");
  });
});

async function writeUiIr(specDir: string, uiIr: UiIr): Promise<void> {
  await mkdir(specDir, { recursive: true });
  await writeFile(path.join(specDir, "ui-ir.json"), `${JSON.stringify(uiIr, null, 2)}\n`, {
    encoding: "utf8",
  });
}
