---
name: "test-driven-development"
description: "Use for small or medium darts-app feature work, bug fixes, refactors, and behavior changes where the multi-agent Research/Design/Implement workflow would be excessive. Enforce test-first development in this React/Vite/TypeScript project: understand the relevant project structure and conventions, write a failing Vitest/Testing Library/Playwright test first, implement the minimum production change, then run targeted and required verification."
---

# Test-Driven Development

Use this skill when the user asks for a small code change, bug fix, UI behavior tweak,
store/API adjustment, or refactor in `darts-app` and there is no approved multi-phase
plan to follow.

Do not use this skill to bypass the complex-task workflow. If the task is broad,
architectural, cross-cutting, risky, or needs research/design approval, use the
project skills for `research-codebase`, `design-feature`, and `implement-feature`
instead.

## Inputs

Accept any of these input modes:

- A concrete ticket/spec.
- A short task from the user.
- A bug or behavior description.

Before editing code, read:

1. `docs/convention/coding-standards.md`.
2. `docs/repo-map.md` when navigation is not obvious.
3. The relevant `docs/convention/{domain}.md` files from the standards table.
4. Current library docs through Context7 when API behavior is uncertain.

For a compact repository map and coding-standards pointer, read
`test-driven-development.md`.

## Project Shape

This project is a React 18, TypeScript, Vite PWA using React Router 6,
Nanostores, CSS Modules, Vitest, Testing Library, and Playwright.

Use these boundaries:

- `src/app/`: bootstrap, providers, router, guards, error boundaries.
- `src/pages/`: route-level components.
- `src/shared/`: API client, utilities, hooks, types, shared UI.
- `src/test/`: test-only setup and runtime shims.
- `tests/`: Playwright specs and E2E helpers.

Respect `docs/convention/architecture.md` before adding or moving source files or
changing imports, routes, or module boundaries.

## TDD Rule

No production behavior change without a failing test first.

Cycle:

1. RED: write one minimal failing test for the next behavior.
2. Verify RED: run the targeted test and confirm it fails for the expected reason.
3. GREEN: write the smallest production code change that passes.
4. Verify GREEN: run the targeted test again.
5. REFACTOR: clean names, duplication, and structure only while tests stay green.
6. Repeat for the next behavior or edge case.

If a test passes immediately, it did not prove the new behavior. Change the test
until it fails for the missing behavior, or explain why the behavior already exists.

If code was written before the test, discard that implementation path and restart
from the failing test unless the user explicitly approves a non-TDD exception.

## Test Selection

Choose the narrowest test surface that proves the behavior:

- Pure logic, mappers, API wrappers, store actions, non-JSX hooks:
  co-located `*.test.ts` with `// @vitest-environment node`.
- React components, DOM-visible hooks, routing behavior, browser APIs:
  co-located `*.test.tsx` with `// @vitest-environment jsdom`.
- Cross-route flows, auth, game start/join/gameplay, responsive-critical UI, or
  browser-only regressions:
  Playwright spec under `tests/<domain>/*.spec.ts`.

Follow `docs/convention/testing.md`:

- Use `describe()` and `it()` in Vitest files; do not use `test()`.
- Prefer Testing Library `screen` queries by role, label, text, and accessible name.
- Mock API domain modules for pages/components; mock `apiClient` for API functions.
- Do not mock pure business logic from the same domain under test.
- Do not spy on Nanostore atom `.set()` methods.
- Put shared DTO builders in `src/shared/types/*.test-support.ts` only when reused.
- Do not create `__tests__` folders.

## Small-Task Workflow

1. Restate the behavior in one sentence and identify the public boundary to test.
2. Read only the source and convention files needed for that boundary.
3. Check overlapping worktree changes before editing files.
4. Write the RED test.
5. Run the targeted command, usually:

   ```bash
   npm run test -- path/to/file.test.ts
   ```

6. Confirm the failure is expected: missing behavior, not syntax, import, setup, or
   fixture error.
7. Implement the smallest change within the existing project pattern.
8. Run the targeted test until it passes.
9. Run required broader checks from the relevant convention files.
10. Report `plan -> patch -> commands to verify -> brief rationale`.

Do not spawn subagents for this workflow unless the user explicitly asks for
parallel agent work.

## Verification

Always run the targeted test that was written first.

Then run commands required by touched domains. Typical minimum for code changes:

```bash
npm run typecheck
npm run eslint
npm run test
```

Add as relevant:

```bash
npm run build
npm run stylelint
npm run prettier:check
npm run secrets:check
npm run test:e2e
```

`npm run test:e2e` is required when touching auth, routing, game start, join flow,
game flow, responsive-critical UI, or Playwright-covered user journeys.

If a command cannot run, report the exact blocker and the safest command for the
user to run locally.

## Done Criteria

- The relevant convention files were read before edits.
- Each behavior change has a test.
- The new or changed test failed before production code changed.
- The failure reason was verified as the intended missing behavior.
- The smallest production change made the test pass.
- Required formatter, linter, typecheck, tests, and domain checks were run or a
  concrete blocker was reported.
- Final response includes plan, patch, commands to verify, and brief rationale.
