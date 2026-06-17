import type { CommandSpec } from "./types.js";

export const commandSpecs: readonly CommandSpec[] = [
  {
    name: "doctor",
    summary: "Print local runtime and shell support diagnostics.",
  },
  {
    name: "analyze-source",
    summary: "Analyze a React or Next.js TSX screen entry and create source evidence.",
  },
  {
    name: "draft",
    summary: "Create ui.md from ui-ir.json.",
  },
  {
    name: "render-wireframe",
    summary: "Render an editable HTML wireframe from ui-ir.json.",
  },
  {
    name: "validate-runtime",
    summary: "Compare static source evidence with a Playwright runtime snapshot.",
  },
];

export function renderGlobalHelp(): string {
  const commandLines = commandSpecs.map(
    (command) => `  ${command.name.padEnd(18)} ${command.summary}`,
  );

  return [
    "ui-pop",
    "",
    "Source-first UI wireframe and design-spec generator.",
    "",
    "Usage:",
    "  ui-pop <command> [options]",
    "",
    "Commands:",
    ...commandLines,
    "",
    "Options:",
    "  -h, --help          Show this help message.",
    "",
  ].join("\n");
}

export function renderAnalyzeSourceHelp(): string {
  return [
    "ui-pop analyze-source",
    "",
    "Analyze a React or Next.js TSX screen entry and create source evidence.",
    "",
    "Usage:",
    "  ui-pop analyze-source --entry <file.tsx> --out <spec-dir> [options]",
    "",
    "Options:",
    "  --entry <file.tsx>       React or Next.js TSX screen entry file.",
    "  --out <spec-dir>         Output spec directory.",
    "  --tsconfig <path>        Optional tsconfig path.",
    "  --max-depth <number>     Import graph depth limit. Default: 2.",
    "  --max-files <number>     Import graph file limit. Default: 80.",
    "  --timeout-ms <number>    Analysis timeout. Default: 30000.",
    "  --force                  Overwrite existing generated artifacts.",
    "  -h, --help               Show this help message.",
    "",
  ].join("\n");
}

export function renderDraftHelp(): string {
  return [
    "ui-pop draft",
    "",
    "Create an editable Markdown UI definition from a UI IR artifact.",
    "",
    "Usage:",
    "  ui-pop draft <spec-dir> [--force]",
    "",
    "Options:",
    "  --force                  Overwrite an existing ui.md.",
    "  -h, --help               Show this help message.",
    "",
  ].join("\n");
}

export function renderRenderWireframeHelp(): string {
  return [
    "ui-pop render-wireframe",
    "",
    "Render a deterministic HTML wireframe from a UI IR artifact.",
    "",
    "Usage:",
    "  ui-pop render-wireframe <spec-dir> [--force]",
    "",
    "Options:",
    "  --force                  Overwrite an existing wireframe.html.",
    "  -h, --help               Show this help message.",
    "",
  ].join("\n");
}

export function renderValidateRuntimeHelp(): string {
  return [
    "ui-pop validate-runtime",
    "",
    "Compare static UI IR facts with a Playwright runtime snapshot.",
    "",
    "Usage:",
    "  ui-pop validate-runtime <spec-dir> --url <url>",
    "",
    "Options:",
    "  --url <url>              Runtime page URL to validate.",
    "  -h, --help               Show this help message.",
    "",
  ].join("\n");
}

export function renderSkeletonCommandHelp(name: string, summary: string): string {
  return [
    `ui-pop ${name}`,
    "",
    summary,
    "",
    "This command is part of the MVP surface and will be implemented in a later wave.",
    "",
    "Options:",
    "  -h, --help               Show this help message.",
    "",
  ].join("\n");
}
