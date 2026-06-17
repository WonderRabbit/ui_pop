import type { ExitCode } from "./exit-codes.js";

export type CliResult = {
  readonly exitCode: ExitCode;
  readonly stdout: string;
  readonly stderr: string;
};

export type CommandSpec = {
  readonly name: string;
  readonly summary: string;
};

export type DoctorReport = {
  readonly nodeVersion: string;
  readonly platform: string;
  readonly arch: string;
  readonly packageManager: "npm";
  readonly shellSupport: readonly string[];
  readonly generatedAt: string;
};
