import { describe, expect, it } from "vitest";
import {
  createStaticEvidenceSummary,
  sanitizeEvidenceValue,
} from "../../src/evidence/evidence-sanitizer.js";

const secretSource = `
export default function OrdersPage() {
  const apiKey = "sk_live_1234567890";
  const password = "plain-password";
  const cookie = "sessionid=abc123";
  const authHeader = "Bearer super-secret-token";
  const fromEnv = process.env.NEXT_PUBLIC_API_TOKEN;
  return <input id="keyword" />;
}
`;

describe("evidence sanitizer", () => {
  it("redacts sensitive static evidence and omits raw source bodies", () => {
    const summary = createStaticEvidenceSummary({
      files: ["app/orders/page.tsx"],
      source: secretSource,
      title: "Orders",
      unresolvedNotes: ["process.env.NEXT_PUBLIC_API_TOKEN could not be resolved"],
    });

    const serialized = JSON.stringify(summary);

    expect(summary.sourceExcerpt).not.toContain("sk_live");
    expect(summary.sourceExcerpt).not.toContain("plain-password");
    expect(summary.sourceExcerpt).not.toContain("sessionid=abc123");
    expect(summary.sourceExcerpt).not.toContain("super-secret-token");
    expect(serialized).not.toContain("NEXT_PUBLIC_API_TOKEN");
    expect(serialized).not.toContain(secretSource.trim());
    expect(serialized).toContain("[REDACTED]");
  });

  it("limits large source dumps and keeps empty input parseable", () => {
    const largeSource = `<div>${"A".repeat(5_000)}</div>`;
    const summary = createStaticEvidenceSummary({
      files: [],
      source: largeSource,
      title: "",
      unresolvedNotes: [],
    });
    const empty = sanitizeEvidenceValue("");

    expect(JSON.stringify(summary).length).toBeLessThan(1_200);
    expect(summary.sourceExcerpt.length).toBeLessThanOrEqual(320);
    expect(summary.sourceExcerpt).toContain("[TRUNCATED]");
    expect(JSON.parse(JSON.stringify(summary))).toMatchObject({
      fileCount: 0,
      title: "",
    });
    expect(empty).toBe("");
  });
});
