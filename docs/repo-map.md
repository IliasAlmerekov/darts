# Repository Map

Fast navigation map for agents. This file is context only; coding rules live in
`docs/convention/coding-standards.md`.

## Source of truth

- Coding standards index: `docs/convention/coding-standards.md`
- Backend API contract: `docs/backend-api-contract.json`
- Frontend API conventions: `docs/convention/api.md`
- Architecture rules: `docs/convention/architecture.md`

Do not use hand-written endpoint inventories as backend API source of truth.

## Project shape

PWA darts game with room creation, SSE room updates, real-time throw flow, settings,
statistics, auth, and responsive/admin layouts.

Tech stack:

- React 18
- TypeScript 5.8
- Vite 7
- React Router 6
- Nanostores
- CSS Modules
- Vitest, Testing Library, Playwright

## Root directories

```text
.claude/            # Claude-specific project context
.codex/             # Codex skills/workflow metadata
.github/            # GitHub automation
.husky/             # Git hooks
docker/             # Docker support files
docs/               # contracts and conventions
public/             # static public assets
scripts/            # repo scripts
specs/              # manual/ticket test plans
src/                # application source
tests/              # Playwright E2E specs and helpers
```

Generated or dependency directories to ignore during navigation:

```text
coverage/
dist/
node_modules/
playwright-report/
test-results/
```

## `src/` layout

```text
src/
  app/         # bootstrap, router, providers, route guards, error boundaries
  assets/      # static assets imported by code
  pages/       # route-level components, one folder per page
  shared/      # cross-page reusable code
  test/        # test-only setup, architecture checks, Playwright helpers
  index.tsx    # app entry
  vite-env.d.ts
```

Dependency direction:

```text
app -> pages -> shared
```

Rules:

- `shared/` must not import from `pages/` or `app/`.
- `pages/` must not import from `app/`.
- A page must not import another page.
- `app/` may import from `pages/` and `shared/`.

## App layer

Key files:

```text
src/index.tsx
src/app/App.tsx
src/app/ErrorBoundary.tsx
src/app/ProtectedRoutes.tsx
src/app/ScrollToTop.tsx
src/app/routeWarmup.ts
src/app/styles/index.css
src/app/routes/AdminLayoutRoute.tsx
src/app/routes/NotFoundPage.tsx
```

Routing:

- Router is created in `src/app/App.tsx`.
- Page components are lazy-loaded.
- Route path builders live in `src/shared/lib/router/routes.ts`.
- Page-level loaders are used for route data fetching.

## Pages

Route-level folders:

```text
src/pages/GameDetailPage/
src/pages/GamePage/
src/pages/GamesOverviewPage/
src/pages/GameSummaryPage/
src/pages/JoinedGamePage/
src/pages/LoginPage/
src/pages/PlayerProfilePage/
src/pages/RegisterPage/
src/pages/SettingsPage/
src/pages/StartPage/
src/pages/StatisticsPage/
```

Typical page shape:

```text
src/pages/<PageName>/
  <PageName>.tsx or index.tsx
  <PageName>.module.css
  components/
  lib/
  use*.ts
  *.test.ts / *.test.tsx
```

Use page-local `components/`, `lib/`, and hooks until code is reused by 2+ pages. Move
cross-page code to `src/shared/`.

## Shared layer

```text
src/shared/
  api/         # apiClient, domain API modules, typed errors, endpoint helpers
  hooks/       # cross-page hooks
  lib/         # pure helpers: error, game, guards, router
  services/    # browser-side services
  store/       # Nanostores atoms and actions
  types/       # shared types and test-support builders
  ui/          # reusable presentational components
```

### `src/shared/api/`

Public surfaces:

- `@/shared/api` exposes cross-cutting API symbols.
- `@/shared/api/auth`
- `@/shared/api/game`
- `@/shared/api/room`
- `@/shared/api/statistics`

Important files:

```text
client.ts
endpoints.ts
errors.ts
types.ts
test-utils.ts
auth.ts
game.ts
room.ts
statistics.ts
```

Do not import `client.ts`, `errors.ts`, `types.ts`, or `endpoints.ts` directly from
outside `src/shared/api/`; use the public surfaces.

### `src/shared/store/`

Main store files:

```text
auth.ts
auth.state.ts
game-session.ts
game-state.ts
index.ts
```

Use exported actions and atoms. See `docs/convention/state.md` before changing stores.

### `src/shared/lib/`

Domains:

```text
error/
game/
guards/
router/
```

Use `@/lib/*` for shared lib imports when available.

### `src/shared/services/`

```text
browser/
```

Browser services include logging, sound, and storage-like boundaries. See
`docs/convention/errors.md` for error/logging interaction until `logging.md` exists.

### `src/shared/ui/`

Reusable UI folders:

```text
admin-layout/
auth-form/
back-button/
button/
dialog/
error-state/
link-button/
navigation-bar/
overlay/
overview-player-item/
pagination/
podium/
skeletons/
sort-tabs/
statistics-header-controls/
```

Production code imports shared UI through each component barrel, for example
`@/shared/ui/button`.

## Tests

Vitest:

```text
src/**/*.test.ts
src/**/*.test.tsx
src/test/vitest.setup.tsx
src/test/routerFutureFlags.tsx
src/test/architecture/*.test.ts
```

Playwright:

```text
tests/accessibility/
tests/auth/
tests/game/
tests/joined-game/
tests/responsive/
tests/start/
tests/shared/
```

Rules:

- Vitest tests are co-located with source.
- Playwright specs live under `tests/<domain>/*.spec.ts`.
- Playwright helpers live under `tests/shared/`.
- DTO builders live in `src/shared/types/*.test-support.ts`.

## Docs

```text
docs/backend-api-contract.json
docs/convention/coding-standards.md
docs/convention/architecture.md
docs/convention/typescript.md
docs/convention/state.md
docs/convention/api.md
docs/convention/react.md
docs/convention/styling.md
docs/convention/errors.md
docs/convention/testing.md
specs/*.md
```

Load only the convention files relevant to the task. Start from
`docs/convention/coding-standards.md` to choose them.

## Config and tooling

```text
package.json
vite.config.ts
tsconfig.json
tsconfig.eslint.json
eslint.config.mjs
playwright.config.ts
.stylelintrc.json
.prettierrc
commitlint.config.mjs
knip.config.json
Dockerfile
docker-compose.frontend.yml
vercel.json
```

Common validation commands:

```bash
npm run build
npm run eslint
npm run stylelint
npm run prettier:check
npm run test
npm run typecheck
npm run secrets:check
npm run test:e2e
```

## Where to look first

- Changing imports or moving files: `docs/convention/architecture.md`
- Changing TypeScript types or guards: `docs/convention/typescript.md`
- Changing stores or Nanostores usage: `docs/convention/state.md`
- Changing API calls or DTO validation: `docs/convention/api.md`
- Checking backend endpoint shapes: `docs/backend-api-contract.json`
- Changing React components or hooks: `docs/convention/react.md`
- Changing CSS Modules or global styles: `docs/convention/styling.md`
- Changing error handling or user messages: `docs/convention/errors.md`
- Changing tests, mocks, or fixtures: `docs/convention/testing.md`
- Changing route paths: `src/shared/lib/router/routes.ts` and `src/app/App.tsx`
- Changing app shell or route guards: `src/app/`
- Changing page behavior: matching folder under `src/pages/`
- Changing reusable UI: matching folder under `src/shared/ui/`
- Changing browser services: `src/shared/services/browser/`

## Update policy

Update this map when:

- a top-level folder is added, removed, or repurposed;
- a new `src/shared/` domain is added;
- a page folder is added or removed;
- a new convention file becomes active;
- the backend contract file moves;
- major test layout or tooling changes.
