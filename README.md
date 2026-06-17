# ui-pop

`ui-pop` is a Node/TypeScript CLI for turning a React or Next.js TSX screen into
source-backed UI definition artifacts and a simple editable HTML wireframe.

The current MVP is intentionally narrow: it extracts static facts from TSX,
creates Markdown and HTML artifacts, and can validate those facts against a
local Playwright runtime page.

## Requirements

- Node.js 22 or newer.
- npm.
- Playwright Chromium installed for runtime validation.

Install dependencies:

```bash
npm install
npx playwright install chromium
```

## Supported Workflow

Build the CLI:

```bash
npm run build
```

Create a source-backed spec directory:

```bash
node dist/cli.js analyze-source \
  --entry tests/fixtures/next-app/app/orders/page.tsx \
  --out .omo/evidence/task-11-spec \
  --force
```

Generate the Markdown UI definition:

```bash
node dist/cli.js draft .omo/evidence/task-11-spec --force
```

Generate the HTML wireframe:

```bash
node dist/cli.js render-wireframe .omo/evidence/task-11-spec --force
```

Start the local runtime fixture:

```bash
npm run fixture:runtime -- --port 4173
```

Validate runtime facts against the fixture:

```bash
node dist/cli.js validate-runtime \
  .omo/evidence/task-11-spec \
  --url http://127.0.0.1:4173/orders
```

Run the end-to-end smoke flow:

```bash
npm run smoke
```

Run the full project gate:

```bash
npm run check
```

## Output Artifacts

`analyze-source` writes these files to the spec directory:

- `manifest.json`: generation metadata and source entry summary.
- `ui-ir.json`: structured screen, query condition, action, and result facts.
- `source-graph.json`: bounded source graph used for extraction.
- `source-evidence.json`: sanitized source evidence summary.

`draft` adds:

- `ui.md`: editable Markdown UI definition table.

`render-wireframe` adds:

- `wireframe.html`: deterministic editable HTML wireframe.

`validate-runtime` adds:

- `runtime-evidence.json`: matched, unresolved, and mismatched runtime fact
  evidence for the validated URL.

## Runtime Fixture

The fixture server is for local validation and smoke tests:

```bash
npm run fixture:runtime -- --port 4173
```

It serves:

- `http://127.0.0.1:4173/orders`: matching runtime page.
- `http://127.0.0.1:4173/missing-label`: one missing label for unresolved
  evidence.
- `http://127.0.0.1:4173/mismatch`: intentionally mismatched screen and facts.

## Validation Behavior

`validate-runtime` reads `ui-ir.json`, opens the supplied URL with Playwright,
and compares visible body text with the static UI facts.

- Matching query, action, and result facts are upgraded to
  `runtime-confirmed` and receive a runtime source entry.
- Missing non-screen facts are recorded as `unresolved`.
- A missing screen title is recorded as `mismatched`.
- Missing or malformed `ui-ir.json` fails without writing
  `runtime-evidence.json`.
- Runtime mismatch exits with code `3` and still writes
  `runtime-evidence.json`.

## Current Limitations

This MVP currently supports React or Next.js `.tsx` screen entries and local
Playwright validation only.

It does not currently provide:

- PPTX or slide deck export.
- Figma export or import.
- AI-assisted extraction.
- Vue, Svelte, or Angular source extraction.
- Production website crawling.

The generated `wireframe.html` is an editable HTML artifact, not a full design
tool document.

## Future Direction

The intended next path is browser capture and editable deck export:

- capture richer runtime layout and screenshots from a real app route;
- merge source facts, runtime evidence, and screenshots into a UI definition;
- export an editable deck or document format from that verified evidence.

Those items are future work, not current functionality.
