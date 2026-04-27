# Architecture

Structural rules for this project. Source-of-truth for folder layout, module boundaries,
imports, and routing. Must be checked against `src` before changing.

## Top-level layout (`src/`)

Only these entries are allowed at the root of `src/`:

```
src/
  app/         # bootstrap: router, providers, route guards, error boundaries
  assets/      # static assets imported by code
  pages/       # route-level components, one folder per page
  shared/      # cross-page reusable code (api, hooks, lib, services, store, types, ui)
  test/        # test-only helpers (architecture tests, Playwright config, Vitest setup)
  index.tsx    # app entry
  vite-env.d.ts
```

Forbidden:

- `src/features/` (the project is pages-based)
- `src/components/` at root
- `src/utils/` at root
- Any other top-level folder not listed above

## `shared/` sub-layout

```
src/shared/
  api/         # apiClient, endpoints, typed errors, mappers
  hooks/       # cross-page hooks
  lib/         # pure helpers (guards, router, error mapping, game logic, etc.)
  services/    # browser-side services (logger, sound, storage)
  store/       # Nanostores atoms and actions
  types/       # cross-page type definitions, including `*.test-support.ts`
  ui/          # reusable presentational components (each in its own folder)
```

Adding a new top-level subfolder under `shared/` requires updating this document.

## Dependency rule -- one direction only

```
app -> pages -> shared
```

- `shared/` must not import from `pages/` or `app/`.
- `pages/` must not import from `app/`.
- A page must not import from another page (no cross-page imports).

These four rules are enforced by `no-restricted-imports` in `eslint.config.mjs`. Do not
weaken or scope-exclude them.

`app/` may import from `pages/` (e.g. lazy route declarations, page loaders) and from
`shared/`. This is the only legal direction.

## Page structure

Each page lives in its own folder under `src/pages/<PageName>/`:

```
src/pages/StartPage/
  StartPage.tsx              # entry component (or `index.tsx`)
  StartPage.module.css
  components/                # page-private UI
  lib/                       # page-private helpers
  use<XYZ>.ts                # page-private hooks
  *.test.ts / *.test.tsx     # co-located unit tests
```

Rules:

- The page entry is either `<PageName>.tsx` or `index.tsx`. Both forms coexist in the
  current `App.tsx` and that is intentional: the `lazy(() => import(...))` target is
  chosen per page based on the file actually present. For example:

  ```ts
  const StartPage = lazy(() => import("@/pages/StartPage/StartPage")); // direct file
  const GamePage = lazy(() => import("@/pages/GamePage")); // resolves to index.tsx
  ```

  Do not invent a third form (no nested entry files, no re-export shims).

- `pages/<PageName>/` must not contain a barrel `index.ts` (only `index.tsx` as entry, if
  used).
- Page-local hooks, components, and helpers stay inside the page folder.
- Code reused by 2+ pages moves to `shared/`.

## Module boundaries -- public surface vs internals

### `shared/ui/<component>/`

- Every component folder must expose a public `index.ts` barrel.
- Production code imports through the barrel: `import { Button } from "@/shared/ui/button"`.
- Deep imports of component files (`@/shared/ui/button/Button` or `Button.tsx`) are
  forbidden in production.

### `shared/api/`

The API layer has a **two-level public surface**:

- `@/shared/api` (the `index.ts` barrel) exposes cross-cutting symbols: `apiClient`,
  `setUnauthorizedHandler`, `ApiError`, `NetworkError`, `UnauthorizedError`,
  `TimeoutError`, endpoint constants.
- `@/shared/api/<domain>` (`auth`, `game`, `room`, `statistics`) is the per-domain public
  surface. Pages and other shared code import resource calls and DTO types directly from
  these modules: `import { getGameThrows } from "@/shared/api/game"`.

Internals -- `client.ts`, `errors.ts`, `types.ts`, `endpoints.ts` -- must **not** be
imported directly outside `shared/api/`. They are reachable only via the `@/shared/api`
barrel.

### `shared/types/`

Two aliases exist for `src/shared/types/`:

- `@/types` -- the barrel (`src/shared/types/index.ts`). **Production code** must use this
  alias for every type import.
- `@/types/*` -- direct path into `src/shared/types/*`. Allowed **only** for
  `*.test-support` files imported from test code
  (`import { buildBackendPlayer } from "@/shared/types/game.test-support"`).

Any other deep import (`@/shared/types/game`, `@/shared/types/api`, etc.) from production
code is forbidden -- use `@/types` instead.

### `shared/{store,hooks,services,lib}/`

These layers do **not** have barrels. Consumers deep-import by file name:
`@/shared/store/auth`, `@/shared/store/game-state`,
`@/shared/services/browser/clientLogger`, `@/lib/guards/guards`. This is the convention,
not a violation.

### Test-only files

`*.test-support.ts` files are imported only from test files. Production code must not
import them.

## Path aliases

Defined in `tsconfig.json`:

| Alias        | Resolves to                 | Use for                                     |
| ------------ | --------------------------- | ------------------------------------------- |
| `@/*`        | `src/*`                     | generic absolute import                     |
| `@/app/*`    | `src/app/*`                 | only inside `app/`                          |
| `@/pages/*`  | `src/pages/*`               | only inside `app/`                          |
| `@/shared/*` | `src/shared/*`              | shared internals (store/hooks/services/lib) |
| `@/lib/*`    | `src/shared/lib/*`          | shorthand for shared lib                    |
| `@/types`    | `src/shared/types/index.ts` | shared types barrel (production)            |
| `@/types/*`  | `src/shared/types/*`        | reserved for `*.test-support` (tests only)  |
| `@/assets/*` | `src/assets/*`              | static assets                               |

Use the most specific alias available. Prefer `@/lib/...` over `@/shared/lib/...`.

## Routing (`src/app/App.tsx`)

The router is built once in `createAppRouter` using `createBrowserRouter` +
`createRoutesFromElements`.

Rules:

- All page components are `lazy(() => import(...))` and wrapped via the local
  `withSuspense(...)` helper. There is no single top-level `<Suspense>` for all routes.
- Every `<Route>` carries an explicit `errorElement={<ErrorBoundary />}`. There is no
  single global error boundary placed outside the router.
- React Router 6 loaders are used for route data fetching (`startPageLoader`,
  `gameDetailLoader`, `gamesOverviewLoader`). New page-level data fetches go through a
  loader, not `useEffect` after mount.
- Optional URL parameters use `:id?` (e.g. `/start/:id?`, `/settings/:id?`). Do not
  declare two parallel routes for the same page.
- Role-restricted routes are nested inside a `<ProtectedRoutes allowedRoles={[...]}>`
  wrapper. Roles are passed as a typed `Role[]` array, not `string[]`.
- All paths are constructed via the central `ROUTES` table in
  `src/shared/lib/router/routes.ts`. `ROUTES` exports both static patterns
  (`gamePattern: "/game/:id"`) and builders (`game: (id) => /game/${id}`). Do not inline
  route literals in pages.

## Test infrastructure

- `src/test/` holds cross-cutting test helpers: `vitest.setup.tsx`, router future-flag
  shims, architecture tests, Playwright fixtures.
- `*.test.ts` / `*.test.tsx` files are co-located with the source they test. No
  `__tests__/` folders.
- Test-only factories live next to types as `*.test-support.ts`
  (`src/shared/types/game.test-support.ts`). They are imported only from test files.

## Verification

ESLint already enforces the dependency rule (`shared/` not from `pages/`/`app/`, `pages/`
not from `app/` or sibling pages). The two checks below cover what ESLint does not.

**1. Structural integrity** -- only the documented top-level entries exist:

```bash
ls src/
# expected: app  assets  index.tsx  pages  shared  test  vite-env.d.ts
```

**2. Forbidden deep imports** -- internals reached from outside `shared/`:

```bash
rg -nF \
  -e 'from "@/shared/api/client"' \
  -e 'from "@/shared/api/errors"' \
  -e 'from "@/shared/api/types"' \
  -e 'from "@/shared/api/endpoints"' \
  src --glob '!src/shared/**' --glob '!**/*.test.{ts,tsx}'
```

A clean run of (2) prints nothing.

For the rarer `shared/ui/<X>/<File>` and non-test-support `@/shared/types/<file>` cases,
add component or file names to the same `-e` list when needed; both patterns are
otherwise picked up at code review.
