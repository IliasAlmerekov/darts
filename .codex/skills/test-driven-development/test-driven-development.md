# Darts App TDD Quick Reference

Use `SKILL.md` in this folder for the full TDD workflow.

Before changing code, read:

1. `docs/convention/coding-standards.md` - the source of truth for project rules.
2. The relevant `docs/convention/{domain}.md` file listed in `coding-standards.md`.
3. `docs/repo-map.md` when you need fast navigation through the repository.

Project files are organized as:

- `src/app/` - bootstrap, providers, routes, guards, error boundaries.
- `src/pages/` - route-level screens and page-specific hooks/components.
- `src/shared/` - API client, stores, hooks, utilities, types, shared UI.
- `src/test/` - Vitest setup, architecture tests, test-only shims.
- `tests/` - Playwright E2E specs and shared E2E helpers.

Test placement:

- Put Vitest tests next to source files as `*.test.ts` or `*.test.tsx`.
- Put Playwright specs under `tests/<domain>/*.spec.ts`.
- Do not create `__tests__` folders.

When library behavior is uncertain, use Context7 before writing code or tests.
