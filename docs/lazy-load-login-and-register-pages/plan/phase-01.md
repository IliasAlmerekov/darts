# Phase 01: App Routing Update and Unit Regression Coverage

**Layer:** app
**Depends on:** none
**Can be tested in isolation:** Yes

## Goal

Update `App.tsx` so that `LoginPage` and `RegisterPage` are lazy-loaded like the other pages, and add `App`-level regression tests proving that the `/`, `/register`, and `*` routes still render correctly.

## Files to MODIFY

### `src/app/App.tsx`

**Current state confirmed by research**

- Direct auth-page imports exist at `src/app/App.tsx:8-9`.
- The current `lazy()` declarations for other pages are at `src/app/App.tsx:12-20`.
- The shared `Suspense` boundary already wraps all routes at `src/app/App.tsx:62-86`.

**Planned change**

- Remove the eager imports of `LoginPage` and `RegisterPage`.
- Add two module-level declarations matching the existing page-loading pattern:
  - `const LoginPage = lazy(() => import("@/pages/LoginPage"));`
  - `const RegisterPage = lazy(() => import("@/pages/RegisterPage"));`
- Keep the route definitions at `ROUTES.login` and `ROUTES.register` unchanged.
- Keep the shared `Suspense` wrapper unchanged.

**Do not change**

- `warmUpRoutes()` behavior in this phase.
- `ROUTES` values.
- Protected route grouping.
- `NotFoundPage` wiring.

### `src/app/App.test.tsx`

**Current state confirmed by local context**

- The file currently contains only one `404` route test.
- The file currently mocks `@/features/*` modules, while `App.tsx` imports `@/app/*` and `@/pages/*`.

**Planned change**

- Replace stale mocks with mocks that match the real `App.tsx` import graph where isolation is needed.
- Keep tests focused on route behavior, not page implementation details.
- Add or update tests so the file covers:
  - `/` renders the lazy-loaded login page.
  - `/register` renders the lazy-loaded register page.
  - Unknown routes still render the `404` page.
- Use async Testing Library queries for lazy-loaded route content.

## Verification Commands

```bash
npm run typecheck
npm run eslint
npm run test -- src/app/App.test.tsx
npx prettier --check src/app/App.tsx src/app/App.test.tsx
```

## Accessibility Notes

- Auth route tests should continue to assert user-visible content that reflects what the page exposes to assistive technology, such as headings or other semantic text.
- No keyboard or focus behavior changes are planned in this phase.

## Rollback Notes

- Revert `src/app/App.tsx` to the previous eager imports.
- Revert `src/app/App.test.tsx` to the previous route test state if the lazy-loading test strategy proves unstable.
- If Phase 01 is rolled back, Phase 02 must not proceed because bundle verification would no longer match the ticket objective.
