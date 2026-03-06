# Research: Lazy Load Login and Register Pages

**Date:** 2026-03-06
**Ticket:** Add `lazy()` for `LoginPage` and `RegisterPage` in `App.tsx`.
**Feature folder:** `docs/lazy-load-login-and-register-pages/`

## Facts

### F1. `App.tsx` already uses `React.lazy` for most routed pages, but not for the auth pages.

- `App.tsx` imports `Suspense` and `lazy` from React. Evidence: `src/app/App.tsx:1`.
- `LoginPage` and `RegisterPage` are imported directly. Evidence: `src/app/App.tsx:8`, `src/app/App.tsx:9`.
- `StartPage`, `GamePage`, `GameSummaryPage`, `GameDetailPage`, `GamesOverview`, `SettingsPage`, `Statistics`, `JoinedGamePage`, and `PlayerProfile` are declared with `lazy(() => import(...))`. Evidence: `src/app/App.tsx:12-20`.

### F2. The login and register routes are rendered inside an existing shared `Suspense` boundary.

- The route tree is wrapped in `<Suspense fallback={<div className="page-loader" aria-hidden="true" />}>`. Evidence: `src/app/App.tsx:62-86`.
- The login route renders `<LoginPage />` at `ROUTES.login`. Evidence: `src/app/App.tsx:64`.
- The register route renders `<RegisterPage />` at `ROUTES.register`. Evidence: `src/app/App.tsx:65`.

### F3. Route warm-up preloading currently excludes the auth pages.

- `warmUpRoutes()` dynamically imports `StartPage`, `GamePage`, `GameSummaryPage`, `SettingsPage`, `StatisticsPage`, `JoinedGamePage`, and `PlayerProfilePage`. Evidence: `src/app/App.tsx:30-38`.
- No `import("@/pages/LoginPage")` or `import("@/pages/RegisterPage")` appears in that warm-up block. Evidence: `src/app/App.tsx:30-38`.

### F4. Both auth pages expose default exports compatible with `React.lazy`.

- `LoginPage` is the default export of `src/pages/LoginPage/index.tsx`. Evidence: `src/pages/LoginPage/index.tsx:8-39`.
- `RegisterPage` is the default export of `src/pages/RegisterPage/index.tsx`. Evidence: `src/pages/RegisterPage/index.tsx:7-28`.

### F5. The auth routes resolve to `/` and `/register`.

- `ROUTES.login` is `"/"`. Evidence: `src/shared/lib/routes.ts:1-3`.
- `ROUTES.register` is `"/register"`. Evidence: `src/shared/lib/routes.ts:1-3`.

### F6. The path aliases used by `App.tsx` support dynamic imports from `@/pages/*`.

- TypeScript maps `@/pages/*` to `./src/pages/*`. Evidence: `tsconfig.json:31-41`.
- Vite maps `@/pages` to `./src/pages`. Evidence: `vite.config.ts:12-22`.

### F7. Current automated coverage around `App` does not verify login/register lazy loading.

- `src/app/App.test.tsx` contains a single route test for the `404` page on `"/unknown-route"`. Evidence: `src/app/App.test.tsx:43-54`.
- `ProtectedRoutes` tests cover redirect-to-home and outlet rendering behavior, but they do not exercise `App.tsx` login/register route module loading. Evidence: `src/app/ProtectedRoutes.test.tsx:66-109`.
- One Playwright test verifies unauthenticated navigation to `/joined` redirects to `/` and shows login form fields. Evidence: `tests/joined-game/unauthenticated-access.spec.ts:31-46`.

### F8. The build pipeline is Vite-based with no custom chunking rules in the repository configuration.

- The build script is `tsc && vite build`. Evidence: `package.json:19-28`.
- `vite.config.ts` configures the React plugin, aliases, dev proxy, and Vitest settings; no manual chunk configuration is defined there. Evidence: `vite.config.ts:6-43`.

### F9. A local production build generated one main application chunk that already contains login/register page code.

- Running `npm run build` on 2026-03-06 completed successfully and emitted `dist/assets/index-BuxquPYx.js` as the main application bundle together with multiple other JS chunks. Evidence: build output from `npm run build`, artifact path `dist/assets/index-BuxquPYx.js`.
- The generated `dist/assets/index-BuxquPYx.js` contains login/register page implementation details including the success message `"You have successfully left the game"`, the registration heading `"Create an account"`, and the auth route elements bound to the main chunk. Evidence: `dist/assets/index-BuxquPYx.js:10`.

## Unknowns

- Existing bundle size budget or performance target for auth-route code splitting: `NOT FOUND`.
- Existing automated assertion that specifically checks `Suspense` fallback rendering for login/register route module loading: `NOT FOUND`.
