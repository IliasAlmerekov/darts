# Research: husky-pre-commit

## 1) Current state

- `package.json` defines the `prepare` script as `husky`, which initializes Husky hooks during install. Evidence: `package.json:30`.
- `package.json` also defines a separate `husky` script that runs full-project linters via `npm run stylelint && npm run eslint`. Evidence: `package.json:31`.
- `package.json` includes a `lint-staged` configuration for staged JS/TS, CSS, JSON, and Markdown files. Evidence: `package.json:75`, `package.json:76`, `package.json:80`, `package.json:84`.
- The repository contains `.husky/commit-msg`, but there is no top-level `.husky/pre-commit` file. Evidence: `.husky/commit-msg:1`; `NOT FOUND` for `.husky/pre-commit` when inspected directly.
- Husky internal helper files exist under `.husky/_/`, including `.husky/_/husky.sh` and the generated stub `.husky/_/pre-commit`. Evidence: `.husky/_/husky.sh:1`; `.husky/_/pre-commit:1`.

## 2) Domain types and stores

- NOT FOUND: no domain types, stores, or feature state are involved in this task. Searched by task scope in `package.json` and `.husky/**`.

## 3) Architecture and patterns

- Existing repository hook pattern uses top-level Husky hook files that execute commands directly, for example `.husky/commit-msg` runs `npm run commitlint "$1"`. Evidence: `.husky/commit-msg:1`.
- Husky helper file `.husky/_/husky.sh` is present and currently prints a deprecation message about the legacy header lines, but it is the helper referenced by the requested hook content. Evidence: `.husky/_/husky.sh:1`.

## 4) Related components/pages/routes

- NOT FOUND: no React components, routes, pages, or UI files are involved. Searched by task scope in `.husky/**` and `package.json`.

## 5) API and data mapping

- NOT FOUND: no API clients, DTOs, or mapping layers are involved. Searched by task scope in `.husky/**` and `package.json`.

## 6) Tests and coverage

- Mandatory repository validation commands are documented in `.codex/WORKFLOW.md`: `npm run eslint`, `npm run stylelint`, `npm run test`, `npm run typecheck`, `npx prettier --check .`, and `npm run test:e2e` for critical/final phases. Evidence: `.codex/WORKFLOW.md:76`, `.codex/WORKFLOW.md:77`, `.codex/WORKFLOW.md:78`, `.codex/WORKFLOW.md:79`, `.codex/WORKFLOW.md:80`, `.codex/WORKFLOW.md:81`.
- `package.json` exposes matching scripts for `eslint`, `stylelint`, `typecheck`, `test`, and `test:e2e`. Evidence: `package.json:23`, `package.json:24`, `package.json:26`, `package.json:27`, `package.json:28`.

## 7) Missing items required by ticket

- Missing required hook file: `.husky/pre-commit`. Evidence: `NOT FOUND` during repository inspection.
- Obsolete script to remove: `scripts.husky`. Evidence: `package.json:31`.

## 8) File reference index

- `.codex/WORKFLOW.md:76`
- `.codex/WORKFLOW.md:77`
- `.codex/WORKFLOW.md:78`
- `.codex/WORKFLOW.md:79`
- `.codex/WORKFLOW.md:80`
- `.codex/WORKFLOW.md:81`
- `.husky/commit-msg:1`
- `.husky/_/husky.sh:1`
- `.husky/_/pre-commit:1`
- `package.json:23`
- `package.json:24`
- `package.json:26`
- `package.json:27`
- `package.json:28`
- `package.json:30`
- `package.json:31`
- `package.json:75`
- `package.json:76`
- `package.json:80`
- `package.json:84`

## 9) Constraints observed

- Workflow requires each task to have its own folder under `docs/<task-slug>/`. Evidence: `.codex/WORKFLOW.md:22`, `.codex/WORKFLOW.md:28`.
- Workflow requires research artifacts to be created before implementation. Evidence: `.codex/WORKFLOW.md:36`, `.codex/WORKFLOW.md:39`.
- Task scope is limited to repository tooling files and does not require frontend feature changes. Evidence: `package.json:19`, `.husky/commit-msg:1`.
