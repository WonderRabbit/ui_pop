import { runAnalyzeSourceCommand } from "./commands/analyze-source.js";
import { runDoctorCommand } from "./commands/doctor.js";
import { runDraftCommand } from "./commands/draft.js";
import { runRenderWireframeCommand } from "./commands/render-wireframe.js";
import { runValidateRuntimeCommand } from "./commands/validate-runtime.js";
import { ExitCode } from "./exit-codes.js";
import {
  commandSpecs,
  renderAnalyzeSourceHelp,
  renderDraftHelp,
  renderGlobalHelp,
  renderRenderWireframeHelp,
  renderSkeletonCommandHelp,
  renderValidateRuntimeHelp,
} from "./help.js";
import type { CliResult, CommandSpec } from "./types.js";

export function runCli(args: readonly string[], now: Date = new Date()): CliResult {
  const command = args[0];

  if (command === undefined || command === "--help" || command === "-h") {
    return success(renderGlobalHelp());
  }

  if (command === "doctor") {
    return runDoctorCommand(args.slice(1), now);
  }

  if (command === "analyze-source") {
    return runAnalyzeSource(args.slice(1));
  }

  if (command === "draft") {
    return runDraft(args.slice(1));
  }

  if (command === "render-wireframe") {
    return runRenderWireframe(args.slice(1));
  }

  if (command === "validate-runtime") {
    return runValidateRuntime(args.slice(1));
  }

  const skeleton = findSkeletonCommand(command);
  if (skeleton !== undefined) {
    return runSkeletonCommand(skeleton, args.slice(1));
  }

  return {
    exitCode: ExitCode.InputOrConfig,
    stdout: "",
    stderr: [
      "ERR_UNKNOWN_COMMAND",
      `Unknown command: ${command}`,
      "",
      "Run `ui-pop --help` for available commands.",
      "",
    ].join("\n"),
  };
}

export async function runCliAsync(
  args: readonly string[],
  now: Date = new Date(),
): Promise<CliResult> {
  const command = args[0];
  const commandArgs = args.slice(1);

  if (command === "analyze-source" && !hasHelpFlag(commandArgs)) {
    try {
      return await runAnalyzeSourceCommand(commandArgs, now);
    } catch (error) {
      return {
        exitCode: ExitCode.InputOrConfig,
        stdout: "",
        stderr: [
          "ERR_ANALYZE_SOURCE_FAILED",
          error instanceof Error ? error.message : "Unknown analyze-source failure.",
          "",
        ].join("\n"),
      };
    }
  }

  if (command === "draft" && !hasHelpFlag(commandArgs)) {
    try {
      return await runDraftCommand(commandArgs);
    } catch (error) {
      return {
        exitCode: ExitCode.InputOrConfig,
        stdout: "",
        stderr: [
          "ERR_DRAFT_FAILED",
          error instanceof Error ? error.message : "Unknown draft failure.",
          "",
        ].join("\n"),
      };
    }
  }

  if (command === "render-wireframe" && !hasHelpFlag(commandArgs)) {
    try {
      return await runRenderWireframeCommand(commandArgs);
    } catch (error) {
      return {
        exitCode: ExitCode.InputOrConfig,
        stdout: "",
        stderr: [
          "ERR_RENDER_WIREFRAME_FAILED",
          error instanceof Error ? error.message : "Unknown render-wireframe failure.",
          "",
        ].join("\n"),
      };
    }
  }

  if (command === "validate-runtime" && !hasHelpFlag(commandArgs)) {
    try {
      return await runValidateRuntimeCommand(commandArgs, now);
    } catch (error) {
      return {
        exitCode: ExitCode.InputOrConfig,
        stdout: "",
        stderr: [
          "ERR_RUNTIME_VALIDATION_FAILED",
          error instanceof Error ? error.message : "Unknown runtime validation failure.",
          "",
        ].join("\n"),
      };
    }
  }

  return runCli(args, now);
}

function runAnalyzeSource(args: readonly string[]): CliResult {
  if (hasHelpFlag(args)) {
    return success(renderAnalyzeSourceHelp());
  }

  return {
    exitCode: ExitCode.InputOrConfig,
    stdout: "",
    stderr: [
      "ERR_MISSING_REQUIRED_OPTION",
      "analyze-source requires --entry <file.tsx> and --out <spec-dir>.",
      "",
      "Run `ui-pop analyze-source --help` for usage.",
      "",
    ].join("\n"),
  };
}

function runValidateRuntime(args: readonly string[]): CliResult {
  if (hasHelpFlag(args)) {
    return success(renderValidateRuntimeHelp());
  }

  return {
    exitCode: ExitCode.InputOrConfig,
    stdout: "",
    stderr: [
      "ERR_MISSING_REQUIRED_ARGUMENT",
      "validate-runtime requires <spec-dir> and --url <url>.",
      "",
      "Run `ui-pop validate-runtime --help` for usage.",
      "",
    ].join("\n"),
  };
}

function runDraft(args: readonly string[]): CliResult {
  if (hasHelpFlag(args)) {
    return success(renderDraftHelp());
  }

  return {
    exitCode: ExitCode.InputOrConfig,
    stdout: "",
    stderr: [
      "ERR_MISSING_REQUIRED_ARGUMENT",
      "draft requires <spec-dir>.",
      "",
      "Run `ui-pop draft --help` for usage.",
      "",
    ].join("\n"),
  };
}

function runRenderWireframe(args: readonly string[]): CliResult {
  if (hasHelpFlag(args)) {
    return success(renderRenderWireframeHelp());
  }

  return {
    exitCode: ExitCode.InputOrConfig,
    stdout: "",
    stderr: [
      "ERR_MISSING_REQUIRED_ARGUMENT",
      "render-wireframe requires <spec-dir>.",
      "",
      "Run `ui-pop render-wireframe --help` for usage.",
      "",
    ].join("\n"),
  };
}

function runSkeletonCommand(command: CommandSpec, args: readonly string[]): CliResult {
  if (hasHelpFlag(args)) {
    return success(renderSkeletonCommandHelp(command.name, command.summary));
  }

  return {
    exitCode: ExitCode.UnsupportedOrUnresolved,
    stdout: "",
    stderr: [
      "ERR_COMMAND_NOT_IMPLEMENTED",
      `${command.name} is listed in the MVP CLI surface but is not implemented in Wave 0.`,
      "",
      `Run \`ui-pop ${command.name} --help\` for the planned command surface.`,
      "",
    ].join("\n"),
  };
}

function findSkeletonCommand(command: string): CommandSpec | undefined {
  return commandSpecs.find(
    (candidate) =>
      candidate.name === command &&
      candidate.name !== "doctor" &&
      candidate.name !== "analyze-source" &&
      candidate.name !== "draft" &&
      candidate.name !== "render-wireframe" &&
      candidate.name !== "validate-runtime",
  );
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
