# Contributing

Thanks for contributing! This guide summarizes how we work on the frontend and how to validate changes.

## Prerequisites

- Node.js 20 + npm, pinned in `.nvmrc`. CI uses Node.js 20, except the GitLab `e2e_tests` job, which runs in the Playwright Docker image.
- Install dependencies and the Playwright browser:

```bash
nvm use
npm install
npx playwright install chromium
```

On a fresh Linux machine, use `npx playwright install --with-deps chromium` to also install the system libraries Chromium needs.

## Project Structure

The project is pages-based. Main entries in `src/`:

- `app/` — bootstrap: router, providers, route guards, error boundaries
- `assets/` — static assets imported by code
- `pages/` — route-level components, one folder per page
- `shared/` — cross-page reusable code (api, hooks, lib, services, store, types, ui)
- `test/` — test-only helpers

Dependencies point one way: `app -> pages -> shared`. A page must not import from another page.

[`docs/convention/architecture.md`](docs/convention/architecture.md) is the source of truth for folder layout and import rules.

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

### Barrel files (`index.ts`)

Every folder under `src/shared/ui/` **must** have an `index.ts` that re-exports the public API as named exports. Consumers always import from the folder path, never from a specific file:

```ts
// ✅ correct
import { Button } from "@/shared/ui/button";
import { Overlay } from "@/shared/ui/overlay";

// ❌ wrong — deep import bypasses the barrel
import Button from "@/shared/ui/button/Button";
```

Other directories (`shared/hooks/`, `shared/lib/`, `app/`) use **direct file imports** without barrels.

## Testing

- Add/extend tests for every behavior change (unit/integration with Vitest, E2E with Playwright).
- Prefer behavioral tests over implementation details.
- Tests must be deterministic (no real time, no external services).

## Accessibility

- Use semantic HTML.
- All interactive elements must be keyboard accessible.
- Preserve visible focus styles.

## Commits & PRs

- Use [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/) (`feat:`, `fix:`, `refactor:`, `test:`, `chore:`).
- Do not bypass Husky or Commitlint.
- Fill in `.github/pull_request_template.md` as the PR body. The rules for each part are in `AGENTS.md` under "Commits and pull requests".

## Security

- Never commit secrets.
- Validate external input; prefer allowlists where possible.
- Avoid insecure defaults; use least privilege.
