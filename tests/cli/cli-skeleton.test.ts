import { describe, expect, it } from "vitest";
import { runCli } from "../../src/cli-core.js";
import { ExitCode } from "../../src/exit-codes.js";

const fixedNow = new Date("2026-06-17T00:00:00.000Z");

describe("CLI skeleton", () => {
  it("prints global help with all MVP commands", () => {
    const result = runCli(["--help"], fixedNow);

    expect(result.exitCode).toBe(ExitCode.Success);
    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("doctor");
    expect(result.stdout).toContain("analyze-source");
    expect(result.stdout).toContain("draft");
    expect(result.stdout).toContain("render-wireframe");
    expect(result.stdout).toContain("validate-runtime");
  });

  it("prints doctor diagnostics as text", () => {
    const result = runCli(["doctor"], fixedNow);

    expect(result.exitCode).toBe(ExitCode.Success);
    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("nodeVersion:");
    expect(result.stdout).toContain("platform:");
    expect(result.stdout).toContain("packageManager: npm");
    expect(result.stdout).toContain("shellSupport: PowerShell, bash, zsh");
  });

  it("prints doctor diagnostics as JSON", () => {
    const result = runCli(["doctor", "--json"], fixedNow);

    expect(result.exitCode).toBe(ExitCode.Success);
    expect(result.stderr).toBe("");
    expect(() => JSON.parse(result.stdout)).not.toThrow();
    expect(result.stdout).toContain('"packageManager": "npm"');
  });

  it("rejects unsupported doctor options", () => {
    const result = runCli(["doctor", "--bogus"], fixedNow);

    expect(result.exitCode).toBe(ExitCode.InputOrConfig);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("ERR_UNKNOWN_OPTION");
    expect(result.stderr).toContain("Unknown doctor option: --bogus");
  });

  it("prints analyze-source help with planned options", () => {
    const result = runCli(["analyze-source", "--help"], fixedNow);

    expect(result.exitCode).toBe(ExitCode.Success);
    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("--entry <file.tsx>");
    expect(result.stdout).toContain("--out <spec-dir>");
    expect(result.stdout).toContain("--max-depth <number>");
  });

  it("returns planned unknown-command error without a stack trace", () => {
    const result = runCli(["unknown-command"], fixedNow);

    expect(result.exitCode).toBe(ExitCode.InputOrConfig);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("ERR_UNKNOWN_COMMAND");
    expect(result.stderr).toContain("Unknown command: unknown-command");
    expect(result.stderr).not.toContain("at ");
    expect(result.stderr).not.toContain("Error:");
  });
});
