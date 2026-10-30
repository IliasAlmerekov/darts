# Architecture

Structural rules for folder layout, module boundaries, imports, and routing. Check them
against `src` before changing.

## Top-level layout (`src/`)

Only these entries are allowed at the root of `src/`:

```
src/
  app/         # bootstrap: router, providers, route guards, error boundaries
  assets/      # static assets imported by code
  pages/       # route-level components, one folder per page
  shared/      # cross-page reusable code
  test/        # test-only helpers: architecture tests, Playwright credential helpers, Vitest setup
  index.tsx    # app entry
  vite-env.d.ts
```

The project is pages-based: there is no `src/features/`, `src/components/`, or
`src/utils/`, and no other top-level folder. [ADR 0005](../adr/0005-pages-based-structure.md)
records why.

## `shared/` sub-layout

```
src/shared/
  api/         # apiClient, typed errors, Valibot schemas, per-domain calls
  hooks/       # cross-page hooks
  lib/         # helpers (guards, router, error mapping, game logic, session cleanup, etc.)
  query/       # the QueryClient and query options per resource (auth, statistics, game, player)
  services/    # browser-side services (logger, sound)
  store/       # Nanostores atoms and actions
  types/       # cross-page type definitions, including `*.test-support.ts`
  ui/          # reusable presentational components (each in its own folder)
```

Adding a new subfolder under `shared/` requires updating this document.

## Dependency rule -- one direction only

```
app -> pages -> shared
```

- `shared/` must not import from `pages/` or `app/`.
- `pages/` must not import from `app/`.
- A page must not import from another page (no cross-page imports).

`no-restricted-imports` in `eslint.config.mjs` enforces these three rules. Keep them at
full scope, with no exclusions.

`app/` may import from `pages/` (lazy route declarations, page loaders) and from `shared/`.

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

- The page entry is either `<PageName>.tsx` or `index.tsx`. Both forms coexist in
  `App.tsx` on purpose: the `lazy(() => import(...))` target follows the file actually
  present.

  ```ts
  const StartPage = lazy(() => import("@/pages/StartPage/StartPage")); // direct file
  const GamePage = lazy(() => import("@/pages/GamePage")); // resolves to index.tsx
  ```

  Use one of these two forms only: no nested entry files, no re-export shims.

- `pages/<PageName>/` has no barrel `index.ts` (only `index.tsx` as entry, if used).
- Code reused by 2+ pages moves to `shared/`.

## Module boundaries -- public surface vs internals

### `shared/ui/<component>/`

- Every component folder exposes a public `index.ts` barrel.
- Production code imports through the barrel: `import { Button } from "@/shared/ui/button"`.
  Deep imports (`@/shared/ui/button/Button`) are forbidden in production.

### `shared/api/`

The API layer has a **two-level public surface**:

- `@/shared/api` (the `index.ts` barrel) exposes cross-cutting symbols:
  `setUnauthorizedHandler`, `clearUnauthorizedHandler`, `ApiError`, `ForbiddenError`,
  `NetworkError`, `UnauthorizedError`, `TimeoutError`, and re-exports every domain module.
  It does not export `apiClient`.
- `@/shared/api/<domain>` (`auth`, `game`, `room`, `statistics`, `player`) is the per-domain
  public surface. Pages and other shared code import resource calls and DTO types from
  these modules: `import { getGameThrows } from "@/shared/api/game"`. `throws.ts` and
  `rematch.ts` are internal files behind `@/shared/api/game`, not domain modules; `game.ts`
  re-exports them.

Internals -- `client.ts`, `errors.ts`, `types.ts`, `endpoints.ts`, `schemas.ts`,
`throws.ts`, `rematch.ts` -- are
imported only inside `shared/api/`. Everything else uses what the barrel or a domain module
exports; `apiClient` stays inside `shared/api/` (see `api.md`). Each domain file owns its
paths (see `api.md`, "Endpoints").

### `shared/types/`

- Production code imports types through the `@/types` barrel
  (`src/shared/types/index.ts`). Deep imports (`@/shared/types/game`,
  etc.) are forbidden in production.
- API request and response types live in `shared/api/<domain>`; `shared/types` holds
  client-only types. Its production files never import from `shared/api`; only
  `*.test-support.ts` factories may.
- Test files import test-support factories by path:
  `import { buildBackendPlayer } from "@/shared/types/game.test-support"`.

### `shared/store/`

`@/shared/store` is a barrel (`index.ts`) that re-exports every store domain. Production
code outside `shared/` imports through it:
`import { $gameData, setGameData } from "@/shared/store"`.

### `shared/{hooks,services,lib}/`

These layers have no barrels. Consumers deep-import by file name:
`@/shared/hooks/useAuthenticatedUser`, `@/shared/services/browser/clientLogger`,
`@/lib/guards/guards`. This is the convention, not a violation.

### Test-only files

Test-only factories live in `src/shared/types/` as `*.test-support.ts`
(`src/shared/types/game.test-support.ts`). They build client types and API types from
`shared/api`. Only test files (`*.test.ts`, `*.test.tsx`) import them; an import from
production code would pull fixtures into the runtime bundle.

## Path aliases

Defined in `tsconfig.json` and mirrored in `vite.config.ts`:

| Alias        | Resolves to                 | Use for                                     |
| ------------ | --------------------------- | ------------------------------------------- |
| `@/*`        | `src/*`                     | generic absolute import                     |
| `@/app/*`    | `src/app/*`                 | only inside `app/`                          |
| `@/pages/*`  | `src/pages/*`               | only inside `app/`                          |
| `@/shared/*` | `src/shared/*`              | shared modules (api, store, hooks, ui, ...) |
| `@/lib/*`    | `src/shared/lib/*`          | shorthand for shared lib                    |
| `@/types`    | `src/shared/types/index.ts` | shared types barrel (production)            |
| `@/assets/*` | `src/assets/*`              | static assets                               |

Import shared lib through `@/lib/...`, not `@/shared/lib/...`. ESLint enforces this in production code.

## Routing (`src/app/App.tsx`)

The router is built once in `createAppRouter` using `createBrowserRouter` +
`createRoutesFromElements`.

Rules:

- All page components are `lazy(() => import(...))` and wrapped via the local
  `withSuspense(...)` helper. There is no single top-level `<Suspense>` for all routes.
- Every `<Route>` carries an explicit `errorElement={<ErrorBoundary />}`. There is no
  single global error boundary outside the router.
- React Router 7 loaders fetch route data (`startPageLoader`, `tabletGameLoader`,
  `gameDetailLoader`, `gameSummaryLoader`, `gamesOverviewLoader`). New page-level data fetches go through a
  loader, not `useEffect` after mount. The loader fills the query cache with
  `queryClient.ensureQueryData(...)` and the page reads the same key with `useQuery`
  ([ADR 0001](../adr/0001-tanstack-query-for-server-reads.md)). The tablet game is the
  exception: its loaders call `fetchQuery` to read it fresh
  ([ADR 0004](../adr/0004-tablet-game-from-server.md)). Data whose key changes
  inside the page, such as pagination, uses `useQuery` alone. So does data that
  depends on no route param and must show its own loading state before the first answer,
  such as the Waiting room's polled current game and the Player profile: ADR 0001 keeps
  loaders for data that depends on route params, and a loader would hold the navigation
  instead.
- A page's route loader lives in `<loaderName>.ts` next to the page hook (`startPageLoader.ts`,
  `gameSummaryLoader.ts`); hooks never export loaders.
- Optional URL parameters use `:id?` (e.g. `/start/:id?`, `/settings/:id?`). Declare one
  route per page, not two parallel ones.
- Role-restricted routes are nested inside a `<ProtectedRoutes allowedRoles={[...]}>`
  wrapper. Roles are a typed `Role[]` (from `@/shared/api/auth`), not `string[]`.
- All paths come from the central `ROUTES` table in `src/shared/lib/router/routes.ts`.
  `ROUTES` exports both static patterns (`gamePattern: "/game/:id"`) and builders
  (`game: (id) => /game/${id}`). Pages use `ROUTES`, never inline route literals.

## Verification

ESLint enforces the dependency rule. The checks below cover what ESLint does not.

**1. Structural integrity** -- only the documented top-level entries exist:

```bash
ls src/
# expected: app  assets  index.tsx  pages  shared  test  vite-env.d.ts
```

**2. Forbidden deep imports** -- API internals, `shared/ui` component files, and
`shared/types` files reached from production code:

```bash
rg -n -g '!**/*.test.{ts,tsx}' -g '!src/shared/api/**' \
  -e 'from "@/shared/api/(client|errors|types|endpoints|schemas|throws|rematch)"' \
  -e 'from "@/shared/ui/[^/"]+/' \
  -e 'from "@/(shared/)?types/' \
  src
```

**3. Test-support imports outside test files:**

```bash
rg -n 'from "[^"]*\.test-support"' src -g '!**/*.test.{ts,tsx}'
```

A clean run of (2) and (3) prints nothing.
