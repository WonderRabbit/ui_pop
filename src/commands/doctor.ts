import { ExitCode } from "../exit-codes.js";
import type { CliResult, DoctorReport } from "../types.js";

export function runDoctorCommand(args: readonly string[], now: Date): CliResult {
  if (hasHelpFlag(args)) {
    return success(
      [
        "ui-pop doctor",
        "",
        "Print local runtime and shell support diagnostics.",
        "",
        "Usage:",
        "  ui-pop doctor [--json]",
        "",
        "Options:",
        "  --json                  Emit diagnostics as JSON.",
        "  -h, --help              Show this help message.",
        "",
      ].join("\n"),
    );
  }

  const unsupportedOption = args.find((arg) => arg !== "--json");
  if (unsupportedOption !== undefined) {
    return {
      exitCode: ExitCode.InputOrConfig,
      stdout: "",
      stderr: [
        "ERR_UNKNOWN_OPTION",
        `Unknown doctor option: ${unsupportedOption}`,
        "",
        "Run `ui-pop doctor --help` for usage.",
        "",
      ].join("\n"),
    };
  }

  const report = createDoctorReport(now);
  if (args.includes("--json")) {
    return success(`${JSON.stringify(report, null, 2)}\n`);
  }

  return success(renderDoctorText(report));
}

export function createDoctorReport(now: Date): DoctorReport {
  return {
    arch: process.arch,
    generatedAt: now.toISOString(),
    nodeVersion: process.version,
    packageManager: "npm",
    platform: process.platform,
    shellSupport: ["PowerShell", "bash", "zsh"],
  };
}

export function renderDoctorText(report: DoctorReport): string {
  return [
    "ui-pop doctor",
    "",
    `nodeVersion: ${report.nodeVersion}`,
    `platform: ${report.platform}`,
    `arch: ${report.arch}`,
    `packageManager: ${report.packageManager}`,
    `shellSupport: ${report.shellSupport.join(", ")}`,
    `generatedAt: ${report.generatedAt}`,
    "",
  ].join("\n");
}

function hasHelpFlag(args: readonly string[]): boolean {
  return args.includes("--help") || args.includes("-h");
}

function success(stdout: string): CliResult {
  return {
    exitCode: ExitCode.Success,
    stdout,
    stderr: "",
  };
}
