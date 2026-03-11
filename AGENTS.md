# AGENTS.md — Frontend (React 18 + TypeScript + Vite – pages‑based architecture)

## 0) Quality bar (non-negotiable)

- Deliver production-ready frontend code: correctness, type-safety, accessibility, maintainability.
- Follow Feature-Sliced Design strictly.
- Keep diffs small, focused, and reviewable.
- Do not break public feature APIs unless explicitly requested.
- Every behavior change must be covered by tests.

## 1) Tech stack (source of truth)

- React 18 (functional components only).
- TypeScript (no `any` unless explicitly justified).
- Vite (no custom webpack/bundler additions).
- React Router 6.
- State management: Nanostores.
- Styling: CSS Modules.
- Tests:
  - Vitest (unit/integration)
  - Playwright (E2E)
- Quality tooling:
  - ESLint (JS/TS)
  - Prettier (formatting)
  - Stylelint (CSS)
  - Husky (git hooks)
  - Commitlint (conventional commits)
- Libraries:
  - `@dnd-kit` (drag & drop)
  - `qrcode.react`
  - `clsx`

## 2) Project structure (pages-based)

The codebase is organised around three primary folders under `src/`:

- `app/` — application bootstrap, providers, router and global guards
- `pages/` — route‑level components; each file or directory represents a page
- `shared/` — reusable utilities, API client, hooks, types and UI components

All shared logic lives in `shared/`; pages import from `shared` or other pages via
their public `index.ts` exports. Deep or reverse imports are forbidden.

### Dependency rule (strict)

- `app` → `pages` → `shared`
- reverse imports are **FORBIDDEN**
- sibling pages may only interact through exported APIs (no internal imports)

<!-- feature‑specific structure removed; we lean on pages and shared packages -->

## 4) React & TypeScript rules

- Functional components only.
- Use `memo`, `useCallback`, `useMemo` **only when justified**.
- Prefer explicit return types for exported functions/components.
- No implicit `any`.
- Avoid enums; prefer union types or const assertions.
- Props:
  - small, explicit interfaces
  - no “god-props”
- Effects:
  - no hidden side-effects
  - dependencies must be complete

## 5) State management (Nanostores)

- Global state only when truly global.
- Feature-local state lives inside the feature.
- Do not mutate store state directly.
- Prefer derived stores for computed values.
- Avoid tight coupling between stores and UI components.

## 6) Routing (React Router 6)

- Routes live in `features/<feature>/routes`.
- Lazy-load routes where possible.
- Route components must be thin:
  - read params
  - connect to feature logic
  - render UI
- Navigation logic must not leak into shared components.

## 7) Styling (CSS Modules)

- CSS Modules only (`*.module.css`).
- No global styles except in `app/styles`.
- Class composition via `clsx`.
- No inline styles unless absolutely necessary.
- Keep styles colocated with components.

## 8) Accessibility (WCAG 2.2 — mandatory)

- Semantic HTML elements (`button`, `nav`, `main`, `section`, etc.).
- All interactive elements must be keyboard accessible.
- Visible focus styles must be preserved.
- Forms:
  - labels bound to inputs
  - error messages linked via `aria-describedby`
- Drag & drop (`@dnd-kit`):
  - keyboard interaction supported
  - aria attributes properly set
- Color is never the sole indicator of state.

## 9) Testing rules

### Unit / Integration (Vitest)

- Test business logic, hooks, and components.
- Prefer testing behavior over implementation details.
- Use data-testids only when semantic selectors are not viable.
- Mock API calls at the boundary (do not mock internal logic).

### E2E (Playwright)

- Tests live in `tests/`.
- Cover critical user flows:
  - auth
  - game flow
  - join/start/finish flows
- Tests must be deterministic:
  - no reliance on real time
  - no reliance on external services

## 10) Quality gates (Definition of Done)

The repository-level validation suite is enforced by the `pre-push` hook. Agents should keep changes compatible with these commands, but should not automatically run the full suite after every edit unless the user explicitly asks or troubleshooting requires it.

```bash
npm run build
npm run eslint
npm run stylelint
npm run prettier:check
npm run test
npm run typecheck
npm run secrets:check
npm run test:e2e

If scripts differ, infer correct commands from `package.json`.

## 11) Git & commits

- Commits must follow Conventional Commits:
  - `feat:`, `fix:`, `refactor:`, `test:`, `chore:`
- Husky hooks must not be bypassed.
- If commitlint fails, fix the commit message.
- Before every `git push`, let the `pre-push` hook complete successfully; do not bypass it.

## 12) Response format (how you report work)

Always include:

- Summary of changes
- Why the change is needed
- Tests executed (exact commands + results)
- Accessibility considerations
- Risks / edge cases

## 13) Disallowed shortcuts

- Do not disable ESLint/TypeScript errors to make builds pass.
- Do not use `any` to silence type errors.
- Do not bypass Husky or Commitlint.
- Do not break FSD boundaries.
- Do not skip tests.
```
