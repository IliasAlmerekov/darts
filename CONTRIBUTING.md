# Contributing

Thanks for contributing! This guide summarizes how we work on the frontend and how to validate changes.

## Prerequisites

- Node.js + npm
- Install dependencies:

```bash
npm install
```

## Project Structure (FSD)

We follow Feature-Sliced Design. Main layers live in `src/`:

- `app/` — app bootstrap and global styles
- `assets/` — static assets
- `entities/` — domain entities
- `features/` — business features (main development unit)
- `shared/` — shared UI, hooks, libs, types, stores

Do not import feature internals from other features. Only import from `features/<feature>/index.ts`.

## Development

Start the app:

```bash
npm run dev
```

## Quality Gates (must pass before PR)

Run the exact scripts defined in `package.json`:

```bash
npm run eslint
npm run stylelint
npm run test
npm run test:e2e
npm run typecheck
```

If any scripts change, update this list and `AGENTS.md`.

## Coding Standards

- TypeScript only, no `any` unless justified.
- Public functions/hooks should have explicit return types.
- Public APIs (hooks, API methods, stores, shared lib utilities) should include concise JSDoc.
- Handle errors explicitly; no silent failures.
- Keep changes small and reviewable.

## Testing

- Add/extend tests for every behavior change (unit/integration with Vitest, E2E with Playwright).
- Prefer behavioral tests over implementation details.
- Tests must be deterministic (no real time, no external services).

## Accessibility

- Use semantic HTML.
- All interactive elements must be keyboard accessible.
- Preserve visible focus styles.

## Commits & PRs

- Use Conventional Commits (`feat:`, `fix:`, `refactor:`, `test:`, `chore:`).
- Do not bypass Husky or Commitlint.
- Describe user impact and test results in the PR.

## Security

- Never commit secrets.
- Validate external input; prefer allowlists where possible.
- Avoid insecure defaults; use least privilege.
