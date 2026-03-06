# Research: ESLint Config Global Ignores

## Scope

- This research covers the current repository state for the ESLint flat config `ignores` issue described in task 4.5. Evidence: `eslint.config.mjs:1`, `.codex/workflow.md:47`, `.codex/workflow.md:55`.

## Facts

- R1. The workflow requires Research to produce exactly one file at `docs/<task-slug>/research/research.md`, and the lead agent must stop after producing it. Evidence: `.codex/workflow.md:55`, `.codex/workflow.md:63`, `.codex/workflow.md:66`.
- R2. The workflow requires task artifacts to stay under a dedicated English task folder inside `docs/`. Evidence: `.codex/workflow.md:22`, `.codex/workflow.md:23`, `.codex/workflow.md:29`, `.codex/workflow.md:38`.
- R3. The exported ESLint flat config array starts with a standalone object whose only property is `ignores`. Evidence: `eslint.config.mjs:8`, `eslint.config.mjs:9`, `eslint.config.mjs:10`.
- R4. The ignore patterns in that standalone object are `**/*.config.ts`, `**/*.config.js`, `**/*.config.mjs`, and `dist/**`. Evidence: `eslint.config.mjs:10`.
- R5. The main TypeScript/TSX config block begins after the standalone ignore object and contains `files` and `languageOptions`. Evidence: `eslint.config.mjs:14`, `eslint.config.mjs:15`, `eslint.config.mjs:16`.
- R6. The main TypeScript/TSX config block shown in `eslint.config.mjs` does not contain an `ignores` property in the visible block content. Evidence: `eslint.config.mjs:14`, `eslint.config.mjs:80`.
- R7. A separate later override for `src/shared/**/*.{ts,tsx}` contains its own scoped `ignores` list for `src/shared/types/game.ts` and `src/shared/types/player.ts`. Evidence: `eslint.config.mjs:81`, `eslint.config.mjs:82`, `eslint.config.mjs:83`.
- R8. The repository ESLint script runs `eslint ./src`. Evidence: `package.json:23`.
- R9. The repository also runs `eslint --fix` through `lint-staged` for staged `*.{js,ts,jsx,tsx}` files. Evidence: `package.json:74`, `package.json:75`, `package.json:77`.
- R10. Mandatory validation commands documented in the local workflow include `npm run eslint`, `npm run stylelint`, `npm run test`, `npm run typecheck`, `npx prettier --check .`, and `npm run test:e2e`. Evidence: `.codex/workflow.md:151`, `.codex/workflow.md:154`, `.codex/workflow.md:155`, `.codex/workflow.md:156`, `.codex/workflow.md:157`, `.codex/workflow.md:158`, `.codex/workflow.md:159`.

## Unknowns / NOT FOUND

- U1. A repository file that still shows the task 4.5 problem state with global config ignore patterns nested inside the main TypeScript `files`/`languageOptions` block: NOT FOUND.
- U2. A repository file that references `eslint.config.mjs` outside the config file itself: NOT FOUND.
- U3. A repository `.eslintignore` file: NOT FOUND.
- U4. Repository tests that explicitly verify ESLint flat-config ignore behavior for `*.config.*` files or `dist/**`: NOT FOUND.
