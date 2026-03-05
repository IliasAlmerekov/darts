# Research: Fix `window.location` in `ProtectedRoutes`

## Current Implementation

**File**: `src/app/ProtectedRoutes.tsx`

```tsx
// Line 1
import { Navigate, Outlet } from "react-router-dom";
// Line 2
import React from "react";
// Line 3
import { StartPageSkeleton, LoginSuccessSkeleton, UniversalSkeleton } from "@/shared/ui/skeletons";
// Line 4
import { useAuthenticatedUser } from "@/shared/hooks/useAuthenticatedUser";

// Lines 6-8
type ProtectedRoutesProps = {
  allowedRoles?: string[];
};

// Line 10
const ProtectedRoutes: React.FC<ProtectedRoutesProps> = ({ allowedRoles = ["ROLE_ADMIN"] }) => {
  // Line 11
  const { user: loggedInUser, loading: checking } = useAuthenticatedUser();

  // Lines 13-21
  if (checking) {
    if (location.pathname.includes("/start")) {
      // line 14: bare `location` — refers to window.location
      return <StartPageSkeleton />;
    }
    if (location.pathname.includes("/joined")) {
      // line 17: bare `location` — refers to window.location
      return <LoginSuccessSkeleton />;
    }
    return <UniversalSkeleton />;
  }

  // Lines 23-25
  if (!loggedInUser) {
    return <Navigate to="/" />;
  }

  // Lines 27-28
  const roles = loggedInUser.roles;
  const isAuthorized = Array.isArray(roles) && roles.some((r: string) => allowedRoles.includes(r));

  // Lines 30-32
  if (!isAuthorized) {
    return <Navigate to="/" />;
  }

  // Line 34
  return <Outlet />;
};

// Line 37
export default ProtectedRoutes;
```

### Key facts about the bug

- Line 14: `location.pathname.includes("/start")` — `location` is not imported from react-router-dom; it resolves to the browser global `window.location`.
- Line 17: `location.pathname.includes("/joined")` — same issue.
- `useLocation` from `react-router-dom` is **not imported** in this file.
- There is no local variable named `location` declared anywhere in the component.
- In a `jsdom`/`MemoryRouter` test environment, `window.location.pathname` is always `/` (the jsdom default), so both branch conditions (`/start`, `/joined`) will never match. The component always falls through to `<UniversalSkeleton />` during the `checking` phase in tests.
- `allowedRoles` default value is `["ROLE_ADMIN"]`.

---

## Usages

`ProtectedRoutes` is imported and used in exactly **two** files:

### 1. `src/app/App.tsx` (lines 7, 66, 78)

```tsx
import ProtectedRoutes from "@/app/ProtectedRoutes";
```

Two separate `<Route element={<ProtectedRoutes ... />}>` wrapper routes:

```tsx
// Lines 66-76 — ROLE_ADMIN group
<Route element={<ProtectedRoutes allowedRoles={["ROLE_ADMIN"]} />}>
  <Route path="/start" element={<StartPage />} />
  <Route path="/start/:id" element={<StartPage />} />
  <Route path="/game/:id" element={<GamePage />} />
  <Route path="/summary/:id" element={<GameSummaryPage />} />
  <Route path="/details/:id" element={<GameDetailPage />} />
  <Route path="/gamesoverview" element={<GamesOverview />} />
  <Route path="/settings" element={<SettingsPage />} />
  <Route path="/settings/:id" element={<SettingsPage />} />
  <Route path="/statistics" element={<Statistics />} />
</Route>

// Lines 78-81 — ROLE_PLAYER group
<Route element={<ProtectedRoutes allowedRoles={["ROLE_PLAYER"]} />}>
  <Route path="/joined" element={<JoinedGamePage />} />
  <Route path="/playerprofile" element={<PlayerProfile />} />
</Route>
```

### 2. `src/app/App.test.tsx` (line 26)

`ProtectedRoutes` is **mocked entirely** in this test file — it is not exercised:

```tsx
vi.mock("@/features/auth", () => ({
  ProtectedRoutes: () => <Outlet />,
  ...
}));
```

Note: The mock path is `@/features/auth` — this is a stale path from before the `refactor/game` branch reorganization. The real component now lives at `src/app/ProtectedRoutes.tsx` imported as `@/app/ProtectedRoutes`. The mock in `App.test.tsx` therefore does **not** mock the actual `ProtectedRoutes` component used by `App.tsx`.

---

## Router Setup

**File**: `src/app/App.tsx`

- The router is a `<BrowserRouter>` (not `MemoryRouter`) with future flags `v7_startTransition: true` and `v7_relativeSplatPath: true`.
- `ProtectedRoutes` is rendered as a layout route wrapping child routes — it receives no path, only an `element` prop.
- The `<Routes>` tree contains: `/` (LoginPage), `/register` (RegisterPage), two `ProtectedRoutes` layout groups, and `*` (NotFoundPage).
- The `BrowserRouter` is declared inside `App`. There is no separate `router.tsx` file.

---

## Existing Tests

### Tests for `ProtectedRoutes`

A search across all test files (`src/**/*.test.tsx`, `src/**/*.test.ts`) found **no test file named `ProtectedRoutes.test.tsx` or `ProtectedRoutes.spec.tsx`**.

There are zero direct tests for `ProtectedRoutes` behavior:

- No test verifies that `StartPageSkeleton` is rendered during loading on `/start` routes.
- No test verifies that `LoginSuccessSkeleton` is rendered during loading on `/joined` routes.
- No test verifies that `UniversalSkeleton` is rendered during loading on other routes.
- No test verifies that unauthorized users are redirected to `/`.
- No test verifies that users with incorrect roles are redirected to `/`.

### `App.test.tsx` (indirect test, `src/app/App.test.tsx`)

```tsx
// @vitest-environment jsdom
```

- Uses `render(<App />)` which internally mounts a `BrowserRouter`.
- Mocks `@/features/auth` to expose `ProtectedRoutes: () => <Outlet />` — this mock path does **not** correspond to the current import path `@/app/ProtectedRoutes`, so the actual component is used (not the mock) when running this test.
- Only one test case: `"renders 404 page for unknown routes"` — navigates to `/unknown-route` and checks for "Page not found" text.
- Uses `window.history.pushState` to control routes, not `MemoryRouter`.

### `ScrollToTop.test.tsx` (`src/app/ScrollToTop.test.tsx`)

- Uses `MemoryRouter` with `initialEntries={["/statistics"]}`.
- Pattern reference: wraps the component under test in `<MemoryRouter>` with `<Routes>` for route-aware rendering.

---

## Test Infrastructure

### Vitest config (in `vite.config.ts`, lines 37-42)

```ts
test: {
  environment: "node",        // default is "node", not jsdom
  globals: true,
  include: ["src/**/*.test.{ts,tsx}", "src/**/*.spec.{ts,tsx}"],
  exclude: ["specs/**"],
},
```

The default test environment is **`node`**. Individual test files override to `jsdom` with the `// @vitest-environment jsdom` comment directive at the top of the file.

### Setup file

No `setupTests` or `test-setup` file was found in `src/`. No global `setupFilesAfterEach` or `setupFiles` entry in `vite.config.ts`.

### `window.location` in tests

- No global mock of `window.location` was found in any setup file.
- In jsdom, `window.location.pathname` defaults to `/`.
- In the `node` environment, `window` is not defined. Any test that exercises `ProtectedRoutes` without `// @vitest-environment jsdom` would throw a ReferenceError on `location.pathname`.

---

## Reference Patterns

The following files use `useLocation` from `react-router-dom` correctly:

### `src/app/ScrollToTop.tsx`

```tsx
import { useLocation } from "react-router-dom";

export default function ScrollToTop(): null {
  const location = useLocation();
  useEffect(() => { ... }, [location.pathname]);
  return null;
}
```

Pattern: `import { useLocation }` → `const location = useLocation()` → use `location.pathname`.

### `src/shared/ui/navigation-bar/NavigationBar.tsx`

```tsx
import { useNavigate, useLocation } from "react-router-dom";

function NavigationBar(...): React.JSX.Element {
  const location = useLocation();
  // location.pathname used in getIsActive() and useEffect dependency
}
```

### `src/shared/ui/button/ViewToogleBtn.tsx`

```tsx
import { useLocation, useNavigate } from "react-router-dom";

function ViewToogleButton() {
  const location = useLocation();
  const activeView = location.pathname === "/gamesoverview" ? "games" : "players";
  useEffect(() => {
    setPreviewView(null);
  }, [location.pathname]);
}
```

### `src/pages/LoginPage/index.tsx`

```tsx
import { useLocation } from "react-router-dom";

function LoginPage(): React.JSX.Element {
  const location = useLocation();
  const successMessage = new URLSearchParams(location.search).get("left") === "1" ? ... : null;
}
```

### `src/pages/GameSummaryPage/useGameSummaryPage.ts`

```tsx
import { useLocation, useNavigate, useParams } from "react-router-dom";

export function useGameSummaryPage() {
  const location = useLocation();
  // location.state used to read passed navigation state
}
```

### `src/pages/GamePage/useGameLogic.ts`

```tsx
import { useLocation, useNavigate, useParams } from "react-router-dom";
```

(Only the import is confirmed; file not read in full for this research.)

All of these use the same pattern: import `useLocation` from `react-router-dom`, call it as a hook inside the function body, and access `.pathname` or `.state` or `.search` on the returned value.

---

## Package Versions

From `package.json`:

| Package                  | Version spec | Type          |
| ------------------------ | ------------ | ------------- |
| `react-router-dom`       | `^6.26.1`    | dependency    |
| `react`                  | `^18.3.1`    | dependency    |
| `react-dom`              | `^18.3.1`    | dependency    |
| `typescript`             | `5.8`        | devDependency |
| `vitest`                 | `^4.0.16`    | devDependency |
| `@testing-library/react` | `^16.3.0`    | devDependency |
| `jsdom`                  | `^26.0.0`    | devDependency |
| `vite`                   | `^7.2.2`     | devDependency |

`useLocation` has been part of react-router-dom since v6.0.0 and is available in `^6.26.1`.

---

## Gaps & Unknowns

1. **No test file for `ProtectedRoutes`**: There is no dedicated test covering any behavior of `ProtectedRoutes`. The full behavioral coverage (skeleton selection, redirect on unauthenticated, redirect on unauthorized role) is entirely untested.

2. **Stale mock path in `App.test.tsx`**: `App.test.tsx` mocks `@/features/auth` which no longer exists. The alias `@/features` is not defined in `vite.config.ts`. The actual `ProtectedRoutes` (at `@/app/ProtectedRoutes`) is not mocked. It is unknown whether `App.test.tsx` currently passes given this stale mock.

3. **TypeScript strictness vs. bare `location`**: With TypeScript strict mode and `noUncheckedIndexedAccess`, using a bare global `location` does not produce a type error because `window.location` is typed as `Location` in the DOM lib, and `location` is a globally available name. TypeScript does not flag this as a bug.

4. **`useGameLogic.ts` usage**: `useLocation` is imported in `src/pages/GamePage/useGameLogic.ts` but the full usage was not read. It is confirmed to be a proper `useLocation` hook import, not a bare global access.

5. **Test environment for a future `ProtectedRoutes.test.tsx`**: Any new test file for `ProtectedRoutes` must include `// @vitest-environment jsdom` because the default Vitest environment is `node` (per `vite.config.ts`). It must wrap the component in `MemoryRouter` (or `createMemoryRouter` + `RouterProvider`) to provide a router context for both `useLocation` (after the fix) and `<Navigate>` / `<Outlet>`.

6. **`useAuthenticatedUser` mock requirements**: Any test for `ProtectedRoutes` must mock `useAuthenticatedUser` (from `@/shared/hooks/useAuthenticatedUser`) to control `user` and `loading` return values. The hook internally calls `getAuthenticatedUser()` (a network call) and `setCurrentGameId` from `@/store`.
