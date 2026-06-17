import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCliAsync } from "../../src/cli-core.js";
import { ExitCode } from "../../src/exit-codes.js";
import { parseUiIr, type UiIr } from "../../src/schema/ui-ir.js";

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
  tempRoot = await mkdtemp(path.join(os.tmpdir(), "ui-pop-validate-runtime-"));
});

afterEach(async () => {
  await rm(tempRoot, { force: true, recursive: true });
});

describe("validate-runtime command", () => {
  it("confirms matching runtime facts and writes runtime evidence", async () => {
    const server = await startRuntimeServer(
      "<main><h1>Orders</h1><label>Keyword</label><button>Search</button><table><th>Order ID</th></table></main>",
    );
    const specDir = path.join(tempRoot, "orders-spec");
    await writeUiIr(specDir, uiIrFixture);

    try {
      const result = await runCliAsync([
        "validate-runtime",
        specDir,
        "--url",
        `${server.url}/orders`,
      ]);

      expect(result).toMatchObject({ exitCode: ExitCode.Success, stderr: "" });
      expect(result.stdout).toContain("runtime-evidence.json");

      const parsed = parseUiIr(
        JSON.parse(await readFile(path.join(specDir, "ui-ir.json"), "utf8")),
      );
      expect(parsed.success).toBe(true);
      if (!parsed.success) {
        throw new Error("Expected updated UI IR to remain valid.");
      }
      expect(parsed.data.queryConditions[0]?.confidence).toBe("runtime-confirmed");
      expect(parsed.data.actions[0]?.confidence).toBe("runtime-confirmed");
      expect(parsed.data.results.columns[0]?.confidence).toBe("runtime-confirmed");
      expect(parsed.data.queryConditions[0]?.sources.map((source) => source.kind)).toContain(
        "runtime",
      );

      const evidence = await readFile(path.join(specDir, "runtime-evidence.json"), "utf8");
      expect(evidence).toContain('"label": "Orders"');
      expect(evidence).toContain('"matched": 4');
      expect(evidence).toContain('"unresolved": 0');
    } finally {
      await server.close();
    }
  });

  it("reports missing, malformed, and runtime mismatch cases without inventing matches", async () => {
    const server = await startRuntimeServer(
      "<main><h1>Orders</h1><button>Search</button><table><th>Order ID</th></table></main>",
    );
    const missingSpecDir = path.join(tempRoot, "missing-spec");
    const malformedSpecDir = path.join(tempRoot, "malformed-spec");
    const mismatchSpecDir = path.join(tempRoot, "mismatch-spec");
    await mkdir(malformedSpecDir, { recursive: true });
    await mkdir(mismatchSpecDir, { recursive: true });
    await writeFile(path.join(malformedSpecDir, "ui-ir.json"), "{", "utf8");
    await writeUiIr(mismatchSpecDir, uiIrFixture);

    try {
      const missing = await runCliAsync([
        "validate-runtime",
        missingSpecDir,
        "--url",
        `${server.url}/orders`,
      ]);
      expect(missing.exitCode).toBe(ExitCode.InputOrConfig);
      expect(missing.stderr).toContain("ERR_MISSING_ARTIFACT");
      await expect(readRuntimeEvidence(missingSpecDir)).rejects.toThrow();

      const malformed = await runCliAsync([
        "validate-runtime",
        malformedSpecDir,
        "--url",
        `${server.url}/orders`,
      ]);
      expect(malformed.exitCode).toBe(ExitCode.InputOrConfig);
      expect(malformed.stderr).toContain("ERR_INVALID_UI_IR");
      await expect(readRuntimeEvidence(malformedSpecDir)).rejects.toThrow();

      const mismatch = await runCliAsync([
        "validate-runtime",
        mismatchSpecDir,
        "--url",
        `${server.url}/orders`,
      ]);
      expect(mismatch.exitCode).toBe(ExitCode.RuntimeMismatch);
      expect(mismatch.stderr).toContain("ERR_RUNTIME_MISMATCH");
      const evidence = await readRuntimeEvidence(mismatchSpecDir);
      expect(evidence).toContain('"unresolved": 1');
      expect(evidence).toContain('"label": "Keyword"');
    } finally {
      await server.close();
    }
  });
});

async function writeUiIr(specDir: string, uiIr: UiIr): Promise<void> {
  await mkdir(specDir, { recursive: true });
  await writeFile(path.join(specDir, "ui-ir.json"), `${JSON.stringify(uiIr, null, 2)}\n`, {
    encoding: "utf8",
  });
}

async function readRuntimeEvidence(specDir: string): Promise<string> {
  return readFile(path.join(specDir, "runtime-evidence.json"), "utf8");
}

async function startRuntimeServer(html: string): Promise<{
  readonly close: () => Promise<void>;
  readonly url: string;
}> {
  const server = createServer((_request, response) => {
    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.end(html);
  });

  await listen(server);
  const address = server.address();
  if (!isAddressInfo(address)) {
    throw new Error("Runtime test server did not expose a TCP address.");
  }

  return {
    close: () => close(server),
    url: `http://127.0.0.1:${address.port.toString()}`,
  };
}

function listen(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
}

function close(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error === undefined) {
        resolve();
      } else {
        reject(error);
      }
    });
  });
}

function isAddressInfo(value: string | AddressInfo | null): value is AddressInfo {
  return typeof value === "object" && value !== null;
}
