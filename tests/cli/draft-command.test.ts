import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCliAsync } from "../../src/cli-core.js";
import type { UiIr } from "../../src/schema/ui-ir.js";

const uiIrFixture = {
  actions: [
    {
      confidence: "source-static",
      id: "search",
      label: "Search",
      role: "submit",
      sources: [{ file: "src/screens/orders.tsx", kind: "jsx", line: 16 }],
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
  ],
  results: {
    columns: [
      {
        confidence: "source-static",
        id: "order-id",
        label: "Order ID",
        sources: [{ file: "src/screens/orders.tsx", kind: "jsx", line: 22 }],
      },
    ],
    kind: "table",
  },
  schemaVersion: 1,
  screen: { id: "orders", route: "/orders", title: "Orders" },
} satisfies UiIr;

let tempRoot: string;

beforeEach(async () => {
  tempRoot = await mkdtemp(path.join(os.tmpdir(), "ui-pop-draft-"));
});

afterEach(async () => {
  await rm(tempRoot, { force: true, recursive: true });
});

describe("draft command", () => {
  it("writes a deterministic markdown UI definition from UI IR", async () => {
    const specDir = path.join(tempRoot, "orders-spec");
    await writeUiIr(specDir, uiIrFixture);

    const result = await runCliAsync(["draft", specDir, "--force"]);

    expect(result).toMatchObject({ exitCode: 0, stderr: "" });
    expect(result.stdout).toContain("ui.md");

    const markdown = await readFile(path.join(specDir, "ui.md"), "utf8");
    expect(markdown).toContain("# UI Definition");
    expect(markdown).toContain("## Screen");
    expect(markdown).toContain("## Query Conditions");
    expect(markdown).toContain("## Actions");
    expect(markdown).toContain("## Results");
    expect(markdown).toContain("| Label | Type/Role/Kind | Confidence | Source |");
    expect(markdown).toContain("| Orders (/orders) | screen |  |  |");
    expect(markdown).toContain(
      "| Keyword | text | source-static | src/screens/orders.tsx:8 (jsx) |",
    );
    expect(markdown).toContain(
      "| Search | submit | source-static | src/screens/orders.tsx:16 (jsx) |",
    );
    expect(markdown).toContain(
      "| Order ID | table | source-static | src/screens/orders.tsx:22 (jsx) |",
    );
  });

  it("protects existing output and avoids partial output for missing or malformed UI IR", async () => {
    const existingSpecDir = path.join(tempRoot, "existing-spec");
    await writeUiIr(existingSpecDir, uiIrFixture);
    await writeFile(path.join(existingSpecDir, "ui.md"), "keep me\n", "utf8");

    const blocked = await runCliAsync(["draft", existingSpecDir]);

    expect(blocked.exitCode).not.toBe(0);
    expect(blocked.stderr).toContain("ERR_OUTPUT_EXISTS");
    expect(await readFile(path.join(existingSpecDir, "ui.md"), "utf8")).toBe("keep me\n");

    const missingSpecDir = path.join(tempRoot, "missing-spec");
    const missing = await runCliAsync(["draft", missingSpecDir, "--force"]);

    expect(missing.exitCode).not.toBe(0);
    expect(missing.stderr).toContain("ERR_MISSING_ARTIFACT");
    await expect(readFile(path.join(missingSpecDir, "ui.md"), "utf8")).rejects.toThrow();

    const malformedSpecDir = path.join(tempRoot, "malformed-spec");
    await mkdir(malformedSpecDir, { recursive: true });
    await writeFile(path.join(malformedSpecDir, "ui-ir.json"), "{", "utf8");

    const malformed = await runCliAsync(["draft", malformedSpecDir, "--force"]);

    expect(malformed.exitCode).not.toBe(0);
    expect(malformed.stderr).toContain("ERR_INVALID_UI_IR");
    await expect(readFile(path.join(malformedSpecDir, "ui.md"), "utf8")).rejects.toThrow();
  });
});

async function writeUiIr(specDir: string, uiIr: UiIr): Promise<void> {
  await mkdir(specDir, { recursive: true });
  await writeFile(path.join(specDir, "ui-ir.json"), `${JSON.stringify(uiIr, null, 2)}\n`, {
    encoding: "utf8",
  });
}
