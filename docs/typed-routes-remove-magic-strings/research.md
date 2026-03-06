# Research: Typed Routes — Remove Magic Strings

**Date:** 2026-03-05
**Ticket:** 2.5 — Create `src/shared/lib/routes.ts` with a `ROUTES` constant and replace all hardcoded route string literals throughout the codebase.
**Feature folder:** docs/typed-routes-remove-magic-strings/

---

## Current State

No centralized route constants exist. All route strings are hardcoded as inline literals across 18 files in `src/`. The `src/shared/lib/` folder exists and contains utility files, but contains no routing utilities.

---

## Domain Types and Stores

### No route types or constants

- No `ROUTES` object, no `AppRoute` type, no `RouteType` enum found anywhere in `src/`.
- Searched: `src/**/*.ts`, `src/**/*.tsx` for `ROUTES`, `routes.ts`, `paths.ts`, `navigation.ts`.

### $currentGameId / $invitation (indirectly relevant)

**File:** `src/shared/store/game-session.ts`
**Kind:** nanostore atoms
**Shape:**

- `$currentGameId: atom<number | null>` — used to build `/start/${currentGameId}` redirect paths
- `$invitation: atom<Invitation | null>` — `Invitation.gameId` used as fallback param in navigation
  **Used by:** `useStartPage.ts`, `useLoginPage.ts`, `NavigationBar.tsx`

---

## Architecture and Patterns

**Folder structure relevant to ticket:**

```
src/
  app/
    App.tsx                          # route definitions (inline JSX)
    ProtectedRoutes.tsx              # pathname checks + Navigate redirects
    routes/
      NotFoundPage.tsx               # hardcoded "/" and "/start"
  pages/
    GamePage/
      index.tsx                      # hardcoded "/start"
      useGameLogic.ts                # hardcoded "/summary/:id", "/start/:id"
    GameSummaryPage/
      useGameSummaryPage.ts          # hardcoded "/game/:id", "/start/:id"
    StartPage/
      useStartPage.ts                # hardcoded "/start", "/start/:id", "/game/:id"
    LoginPage/
      useLoginPage.ts                # hardcoded "/start", "/start/:id"
      useLogin.ts                    # hardcoded "/start"
      LoginForm.tsx                  # hardcoded "/register"
    RegisterPage/
      useRegistration.ts             # hardcoded "/start"
      RegisterForm.tsx               # hardcoded "/"
    GamesOverviewPage/
      GamesOverview.tsx              # hardcoded "/details/:id"
    GameDetailPage/
      GameDetailPage.tsx             # hardcoded "/gamesoverview"
  shared/
    lib/                             # utility files — NO index.ts (direct imports)
      auth-error-handling.ts
      error-to-user-message.ts
      parseThrowValue.ts
      player-mappers.ts
      soundPlayer.ts
      guestUsername.ts
    ui/
      navigation-bar/
        NavigationBar.tsx            # hardcoded "/start", "/start/:id", "/statistics",
                                     # "/settings", "/settings/:id", "/gamesoverview",
                                     # "/details/" (pathname.includes checks)
      button/
        ViewToogleBtn.tsx            # hardcoded "/gamesoverview", "/statistics"
```

**Patterns CONFIRMED — must be respected in implementation:**

- Component pattern: functional component with explicit return type ✓
- CSS: CSS Modules co-located — confirmed across all components
- Hooks: `use` prefix, effect cleanup present ✓
- Stores: `$` prefix, mutations via explicit actions ✓
- Constants: `UPPER_SNAKE_CASE` — confirmed in `API_BASE_URL`, `GAME_ENDPOINT`, `STORAGE_KEY`, etc.
- `shared/lib/` has NO `index.ts` — files are imported directly by consumers
- `shared/store/index.ts` EXISTS — wildcard re-export
- `shared/types/index.ts` EXISTS — wildcard re-export
- `shared/api/index.ts` EXISTS — wildcard re-export
- `any`: FORBIDDEN (strict TypeScript)

**Import rules confirmed:**

- `app → pages → shared` direction (no reverse imports observed)
- `shared/lib/` is imported directly (no barrel index.ts): e.g. `import { mapPlayerDto } from "@/shared/lib/player-mappers"`
- Path alias `@/shared` maps to `src/shared/` via `vite.config.ts`

---

## Related Components and Pages — All Files With Hardcoded Routes

### App.tsx (directly affected — route definitions)

**File:** `src/app/App.tsx`
**Role:** BrowserRouter root with lazy-loaded pages grouped by `ProtectedRoutes` guards
**Route paths defined (lines 63–83):**

- Public: `/`, `/register`
- ROLE_ADMIN: `/start`, `/start/:id`, `/game/:id`, `/summary/:id`, `/details/:id`, `/gamesoverview`, `/settings`, `/settings/:id`, `/statistics`
- ROLE_PLAYER: `/joined`, `/playerprofile`
- Fallback: `*`

### ProtectedRoutes.tsx (directly affected)

**File:** `src/app/ProtectedRoutes.tsx`
**Route strings used:** `"/start"` (pathname check), `"/joined"` (pathname check), `"/"` (Navigate target)
**Lines:** 15, 18, 25, 32

### NotFoundPage.tsx (directly affected)

**File:** `src/app/routes/NotFoundPage.tsx`
**Route strings used:** `"/"`, `"/start"` (ErrorState action `to` props)
**Lines:** 12–13

### useStartPage.ts (directly affected)

**File:** `src/pages/StartPage/useStartPage.ts`
**Route strings used:** `"/start"`, `` `/start/${currentGameId}` ``, `` `/game/${gameId}` ``, `` `/start/${response.gameId}` ``
**Lines:** 113, 257, 264, 273, 275, 296, 298, 334, 354

### useGameLogic.ts (directly affected)

**File:** `src/pages/GamePage/useGameLogic.ts`
**Route strings used:** `` `/summary/${gameId}` ``, `` `/start/${rematch.gameId}` ``
**Lines:** 155, 252

### GamePage/index.tsx (directly affected)

**File:** `src/pages/GamePage/index.tsx`
**Route strings used:** `"/start"` (ErrorState action `to` props)
**Lines:** 185, 200

### useGameSummaryPage.ts (directly affected)

**File:** `src/pages/GameSummaryPage/useGameSummaryPage.ts`
**Route strings used:** `` `/game/${rematch.gameId}` ``, `` `/start/${rematch.gameId}` ``, `` `/game/${finishedGameIdFromRoute}` ``
**Lines:** 99, 128, 162

### useLoginPage.ts (directly affected)

**File:** `src/pages/LoginPage/useLoginPage.ts`
**Route strings used:** `"/start"`, `` `/start/${activeGameId}` ``
**Lines:** 41, 46–47, 54

### useLogin.ts (directly affected)

**File:** `src/pages/LoginPage/useLogin.ts`
**Route strings used:** `"/start"`
**Line:** 19

### LoginForm.tsx (directly affected)

**File:** `src/pages/LoginPage/LoginForm.tsx`
**Route strings used:** `"/register"`
**Line:** 105

### useRegistration.ts (directly affected)

**File:** `src/pages/RegisterPage/useRegistration.ts`
**Route strings used:** `"/start"`
**Line:** 44

### RegisterForm.tsx (directly affected)

**File:** `src/pages/RegisterPage/RegisterForm.tsx`
**Route strings used:** `"/"`
**Line:** 107

### NavigationBar.tsx (directly affected)

**File:** `src/shared/ui/navigation-bar/NavigationBar.tsx`
**Route strings used:** `"/start"`, `` `/start/${currentGameId}` ``, `"/statistics"`, `"/settings"`, `` `/settings/${currentGameId}` ``, `"/gamesoverview"`, `"/details/"` (via `pathname.includes`)
**Lines:** 26, 31, 41, 65, 67, 68

### ViewToogleBtn.tsx (directly affected)

**File:** `src/shared/ui/button/ViewToogleBtn.tsx`
**Route strings used:** `"/gamesoverview"`, `"/statistics"`
**Lines:** 10, 40

### GamesOverview.tsx (directly affected)

**File:** `src/pages/GamesOverviewPage/GamesOverview.tsx`
**Route strings used:** `` `/details/${game.id}` ``
**Line:** 115

### GameDetailPage.tsx (directly affected)

**File:** `src/pages/GameDetailPage/GameDetailPage.tsx`
**Route strings used:** `"/gamesoverview"`
**Line:** 20

---

## API Layer and Data Mapping

### URL building in API layer (reference pattern — do NOT confuse with router routes)

**File:** `src/shared/api/game.ts`
**Pattern:** Private arrow-function constants like `const GAME_ENDPOINT = (id: number) => \`/game/${id}\``— these are **API endpoints**, not router paths. They live in the API layer and are a separate concern from`ROUTES`.

### buildUrl utility

**File:** `src/shared/api/client.ts`
**Signature:** `buildUrl(endpoint: string, query?: Record<string, string>): string`
**Purpose:** Constructs absolute API URLs from the `API_BASE_URL` base. Not related to router paths.

---

## Tests and Coverage

### Tests asserting hardcoded route strings (will require updates when ROUTES is introduced)

| Test file                                              | Kind        | Route strings asserted                       |
| ------------------------------------------------------ | ----------- | -------------------------------------------- |
| `src/pages/GameSummaryPage/useGameSummaryPage.test.ts` | integration | `"/game/42"`, `"/game/77"`                   |
| `src/pages/LoginPage/useLogin.test.ts`                 | integration | `"/start"`                                   |
| `src/pages/RegisterPage/useRegistration.test.ts`       | integration | `"/start"`                                   |
| `src/pages/StartPage/useStartPage.actions.test.ts`     | integration | `"/game/10"`, `"/start/55"`                  |
| `src/app/ProtectedRoutes.test.tsx`                     | integration | `"/start"`, `"/joined"`, `"/game/42"`, `"/"` |
| `src/app/ScrollToTop.test.tsx`                         | integration | `"/statistics"`, `"/start"`                  |
| `src/app/routes/NotFoundPage.test.tsx`                 | component   | `"/"`, `"/start"`                            |
| `src/pages/GamePage/GamePage.test.tsx`                 | integration | `"/start"`                                   |
| `src/shared/ui/navigation-bar/NavigationBar.test.tsx`  | component   | `"/details/551"`                             |

### Tests NOT asserting route strings (no update needed)

| Test file                                            | Kind        | Notes                               |
| ---------------------------------------------------- | ----------- | ----------------------------------- |
| `src/pages/GamePage/useGameLogic.test.ts`            | unit        | Tests pure functions, no navigation |
| `src/pages/StartPage/useStartPage.test.ts`           | unit        | Tests pure functions, no navigation |
| `src/pages/GameDetailPage/useGameDetailPage.test.ts` | integration | Tests data loading, no nav strings  |
| `src/pages/GameSummaryPage/GameSummaryPage.test.tsx` | integration | Navigation via hook mock            |
| `src/pages/StartPage/StartPage.test.tsx`             | integration | Component structure only            |
| `src/app/App.test.tsx`                               | integration | Unknown route → 404                 |
| `tests/joined-game/simple.spec.ts`                   | e2e         | Navigates to `"/"`                  |
| `tests/joined-game/unauthenticated-access.spec.ts`   | e2e         | `"/joined"` → `"/"` redirect        |

### New test required by ticket

- Unit test for `ROUTES` constant: verify each route builder returns the correct string (e.g., `ROUTES.game(42) === "/game/42"`)

---

## Missing — Required for This Ticket

- `src/shared/lib/routes.ts`: NOT FOUND — must be created
- `ROUTES` constant: NOT FOUND — must be created with shape from ticket
- Unit test for `ROUTES`: NOT FOUND — must be written
- All 16 files listed in "Related Components" section must be updated to replace literal strings with `ROUTES.*` calls

---

## File Reference Index

**MUST READ before implementation:**

- `src/app/App.tsx` — route definitions to replace
- `src/app/ProtectedRoutes.tsx` — pathname guards and Navigate redirects
- `src/app/routes/NotFoundPage.tsx`
- `src/pages/StartPage/useStartPage.ts`
- `src/pages/GamePage/useGameLogic.ts`
- `src/pages/GamePage/index.tsx`
- `src/pages/GameSummaryPage/useGameSummaryPage.ts`
- `src/pages/LoginPage/useLoginPage.ts`
- `src/pages/LoginPage/useLogin.ts`
- `src/pages/LoginPage/LoginForm.tsx`
- `src/pages/RegisterPage/useRegistration.ts`
- `src/pages/RegisterPage/RegisterForm.tsx`
- `src/shared/ui/navigation-bar/NavigationBar.tsx`
- `src/shared/ui/button/ViewToogleBtn.tsx`
- `src/pages/GamesOverviewPage/GamesOverview.tsx`
- `src/pages/GameDetailPage/GameDetailPage.tsx`
- `vite.config.ts` — confirms `@/shared` alias

**Tests that will require update (assert raw string paths):**

- `src/pages/GameSummaryPage/useGameSummaryPage.test.ts`
- `src/pages/LoginPage/useLogin.test.ts`
- `src/pages/RegisterPage/useRegistration.test.ts`
- `src/pages/StartPage/useStartPage.actions.test.ts`
- `src/app/ProtectedRoutes.test.tsx`
- `src/app/ScrollToTop.test.tsx`
- `src/app/routes/NotFoundPage.test.tsx`
- `src/pages/GamePage/GamePage.test.tsx`
- `src/shared/ui/navigation-bar/NavigationBar.test.tsx`

**NOT FOUND (confirmed absent):**

- `src/shared/lib/routes.ts` — searched `src/shared/lib/`, no routing file
- `src/shared/lib/index.ts` — barrel file does not exist; consumers import directly
- Any `ROUTES` constant — searched `src/**/*.ts`, `src/**/*.tsx` for `ROUTES`, `const ROUTES`, `export const ROUTES`

---

## Constraints Observed

Facts the implementation MUST respect:

- **Functional components only** — confirmed across all `src/pages/` and `src/shared/`
- **`shared/lib/` has no `index.ts`** — confirmed; `routes.ts` will be imported directly as `import { ROUTES } from "@/shared/lib/routes"`
- **UPPER_SNAKE_CASE for exported constants** — confirmed; the new object must be named `ROUTES`
- **`any` is FORBIDDEN** — strict TypeScript mode confirmed
- **No reverse imports** — `src/shared/` must not import from `src/pages/` or `src/app/`; `ROUTES` in `shared/lib/` is safe (imported by both `pages/` and `app/`)
- **CSS Modules** — not relevant to this ticket; no style changes needed
- **`pathname.includes("/details/")` pattern** — `NavigationBar.tsx` uses prefix-matching on the details route; the ROUTES constant must expose a way to derive the base prefix (e.g., `ROUTES.details()` without an id returning `"/details/"`)
- **Navigation state** — some `navigate()` calls carry state objects `{ finishedGameId, skipFinishOverlay }`; replacing only the path string, state arg remains unchanged
- **`App.tsx` Route `path` props** — these use `:id` param syntax (e.g., `"/game/:id"`) which is different from the builder calls (e.g., `ROUTES.game(42)`); the `ROUTES` object shape from the ticket handles this: static strings for pattern definitions, functions for concrete URLs
