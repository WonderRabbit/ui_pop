# Repository Guidelines

## Project Structure & Module Organization

This repository is currently a minimal project scaffold with `README.md` and `LICENSE` at the root. Add implementation code under `src/` when the project grows, keep tests under `tests/` or next to the source as `*.test.*`, and place static assets in `assets/` or `public/` depending on the runtime. Keep top-level files limited to project metadata, documentation, configuration, and lockfiles.

## Build, Test, and Development Commands

No build system is configured yet. Until one is added, use these repository-level checks:

- `git status --short`: confirm the working tree before and after changes.
- `git diff -- AGENTS.md`: review documentation edits before committing.
- `git log --oneline -n 5`: inspect the recent commit style.

When a package manager or build tool is introduced, document the exact commands here, such as `npm run dev`, `npm test`, or `make build`, and commit the relevant lockfile.

## Coding Style & Naming Conventions

Use concise, descriptive names for files and directories. Prefer lowercase kebab-case for documentation and asset filenames, for example `design-notes.md` or `button-icons.svg`. Match the formatter and linter configured by the future language stack; do not introduce competing style tools without a clear reason. Markdown files should use ATX headings, short paragraphs, and fenced code blocks with language tags when showing commands or snippets.

## Testing Guidelines

There is no test framework configured yet. Add tests with the first meaningful source code and keep them easy to run from a single command. Use names that make the tested behavior obvious, such as `popover-position.test.ts` or `test_popover_position.py`. Update this section with the framework, command, and any coverage expectations when tests are added.

## Commit & Pull Request Guidelines

The current history contains only `Initial commit`, so no detailed convention has been established. Use short, imperative commit messages, for example `Add popover positioning docs` or `Create base UI module`. Pull requests should include a brief summary, verification steps, linked issues when applicable, and screenshots or recordings for UI-visible changes.

## Agent-Specific Instructions

Before editing, inspect the repository state and avoid overwriting unrelated local changes. Keep this guide current whenever project structure, tooling, or workflows change.
