# Research: Fix Vitest Environment

**Date:** 2026-03-05
**Ticket:** 3.1 Fix Vitest environment — change default from `node` to `jsdom`; add `// @vitest-environment node` docblocks to pure function tests.
**Feature folder:** docs/fix-vitest-environment/

## Current State

The current setup already works correctly: `vite.config.ts` sets default `environment: "node"`, but all 30 component/hook tests already override this with `// @vitest-environment jsdom` docblocks at line 1. The 15 pure-function/API tests have no docblock and run under the `node` default.

## Domain Types and Stores

Not applicable — this ticket involves only test configuration and test file annotations.

## Architecture and Patterns

**Test file split (total: 45 files):**

```
src/
  app/                     # 5 test files — all jsdom
  shared/lib/              # 5 test files — all node (pure functions)
  shared/api/              # 4 test files — all node (mocked fetch/apiClient)
  shared/hooks/            # 1 test file  — node (parser logic)
  shared/store/            # 2 test files — game-session: jsdom, game-state: node
  shared/ui/               # 7 test files — all jsdom (RTL components)
  pages/StartPage/         # 6 test files — 4 jsdom, 2 node
  pages/GamePage/          # 5 test files — 3 jsdom, 2 node
  pages/GameDetailPage/    # 2 test files — both jsdom
  pages/GameSummaryPage/   # 2 test files — both jsdom
  pages/LoginPage/         # 1 test file  — jsdom
  pages/RegisterPage/      # 1 test file  — jsdom
  pages/SettingsPage/      # 1 test file  — jsdom
  pages/StatisticsPage/lib/# 1 test file  — node
```

**Patterns CONFIRMED — must be respected in implementation:**

- All DOM-dependent tests already use `// @vitest-environment jsdom` at line 1
- Pure function tests have no docblock (rely on default `node`)
- Test globals: `globals: true` — `describe/it/expect` available without imports (files still import from `vitest` explicitly)
- No `setupFiles` or `globalSetup` configured
- No separate `vitest.config.ts` — config embedded in `vite.config.ts`

## Related Components and Pages

Not applicable — no React components modified by this ticket.

## API Layer and Data Mapping

Not applicable.

## Tests and Coverage

### Current vite.config.ts test block (lines 37–42)

**File:** `vite.config.ts`

```ts
test: {
  environment: "node",
  globals: true,
  include: ["src/**/*.test.{ts,tsx}", "src/**/*.spec.{ts,tsx}"],
  exclude: ["specs/**"],
},
```

### Files with `// @vitest-environment jsdom` (30 files — all component/hook tests)

| Test file                                                                            | Kind        | RTL imports                                 |
| ------------------------------------------------------------------------------------ | ----------- | ------------------------------------------- |
| `src/app/App.test.tsx`                                                               | integration | render, screen                              |
| `src/app/ErrorBoundary.test.tsx`                                                     | integration | render, screen                              |
| `src/app/ScrollToTop.test.tsx`                                                       | integration | render, screen, fireEvent, document, window |
| `src/app/ProtectedRoutes.test.tsx`                                                   | integration | render, screen                              |
| `src/app/routes/NotFoundPage.test.tsx`                                               | integration | render, screen                              |
| `src/shared/ui/button/Button.test.tsx`                                               | unit        | render, screen, fireEvent                   |
| `src/shared/ui/link-button/LinkButton.test.tsx`                                      | unit        | render, screen, fireEvent                   |
| `src/shared/ui/pagination/Pagination.test.tsx`                                       | unit        | render, screen, fireEvent                   |
| `src/shared/ui/error-state/ErrorState.test.tsx`                                      | unit        | render, screen                              |
| `src/shared/ui/navigation-bar/NavigationBar.test.tsx`                                | unit        | render, screen                              |
| `src/shared/ui/podium/Podium.test.tsx`                                               | unit        | render, screen                              |
| `src/shared/ui/sort-tabs/SortTabs.test.tsx`                                          | unit        | render, screen, fireEvent                   |
| `src/shared/store/game-session.test.ts`                                              | unit        | window.sessionStorage                       |
| `src/pages/LoginPage/useLogin.test.ts`                                               | unit        | act, renderHook                             |
| `src/pages/RegisterPage/useRegistration.test.ts`                                     | unit        | act, renderHook                             |
| `src/pages/StartPage/StartPage.test.tsx`                                             | integration | render, screen                              |
| `src/pages/StartPage/useStartPage.actions.test.ts`                                   | unit        | act, renderHook, window.sessionStorage      |
| `src/pages/StartPage/useGamePlayers.test.tsx`                                        | unit        | act, render, screen, waitFor, renderHook    |
| `src/pages/StartPage/components/qr-code/QRCode.test.tsx`                             | unit        | render, screen, fireEvent, waitFor          |
| `src/pages/StartPage/components/guest-player-overlay/GuestPlayerOverlay.test.tsx`    | unit        | render, screen, fireEvent                   |
| `src/pages/GamePage/GamePage.test.tsx`                                               | integration | render, screen                              |
| `src/pages/GamePage/useThrowHandler.test.ts`                                         | unit        | act, renderHook, waitFor                    |
| `src/pages/GamePage/usePlayerThrowsDisplay.test.tsx`                                 | unit        | renderHook                                  |
| `src/pages/GamePage/components/game-player-item/GamePlayerItemList.test.tsx`         | unit        | render, vi.useFakeTimers                    |
| `src/pages/GamePage/components/game-player-item/FinishedGamePlayerItemList.test.tsx` | unit        | render, screen                              |
| `src/pages/GameSummaryPage/GameSummaryPage.test.tsx`                                 | integration | render, screen                              |
| `src/pages/GameSummaryPage/useGameSummaryPage.test.ts`                               | unit        | act, renderHook                             |
| `src/pages/GameDetailPage/GameDetailPage.test.tsx`                                   | integration | render, screen                              |
| `src/pages/GameDetailPage/useGameDetailPage.test.ts`                                 | unit        | renderHook, waitFor                         |
| `src/pages/SettingsPage/components/SettingsTabs.test.tsx`                            | unit        | render, screen, fireEvent                   |

### Files WITHOUT docblock (15 files — pure node tests)

| Test file                                                | Kind | Why node is sufficient   |
| -------------------------------------------------------- | ---- | ------------------------ |
| `src/shared/lib/parseThrowValue.test.ts`                 | unit | pure function, no DOM    |
| `src/shared/lib/player-mappers.test.ts`                  | unit | pure mapper functions    |
| `src/shared/lib/error-to-user-message.test.ts`           | unit | pure error mapping       |
| `src/shared/lib/auth-error-handling.test.ts`             | unit | pure error handling      |
| `src/shared/lib/routes.test.ts`                          | unit | pure route constants     |
| `src/shared/api/rematch.test.ts`                         | unit | mocked apiClient, no DOM |
| `src/shared/api/reopen-game.test.ts`                     | unit | mocked apiClient, no DOM |
| `src/shared/api/room.test.ts`                            | unit | mocked apiClient, no DOM |
| `src/shared/api/get-game.test.ts`                        | unit | mocked globalThis.fetch  |
| `src/shared/hooks/useRoomStream.test.ts`                 | unit | tests JSON parser only   |
| `src/shared/store/game-state.test.ts`                    | unit | store mutation, no DOM   |
| `src/pages/StartPage/useStartPage.test.ts`               | unit | pure exported functions  |
| `src/pages/StartPage/lib/guestUsername.test.ts`          | unit | pure function            |
| `src/pages/GamePage/useGameLogic.test.ts`                | unit | pure exported utilities  |
| `src/pages/StatisticsPage/lib/sort-player-stats.test.ts` | unit | pure sort function       |

### Coverage Gaps (relevant to this ticket)

- None of the 15 node-environment test files have a `// @vitest-environment node` docblock
- Searched: `src/**/*.test.{ts,tsx}` for `@vitest-environment node` — NOT FOUND in any file

## Missing — Required for This Ticket

1. **`vite.config.ts` line 38**: `environment: "node"` must change to `"jsdom"` (default becomes jsdom)
2. **`// @vitest-environment node` docblock**: must be added to all 15 pure function/node test files listed above (to prevent unnecessary jsdom loading after default changes)

## File Reference Index

**MUST READ before implementation:**

- `vite.config.ts` (lines 37–42) — test configuration block
- All 15 node test files listed above — need docblock addition

**NOT FOUND (confirmed absent):**

- `vitest.config.ts` — searched repo root and src/, NOT FOUND
- `vitest.setup.ts` / `setupTests.ts` — NOT FOUND
- `// @vitest-environment node` — NOT FOUND in any file (searched `src/**/*.test.*`)

## Constraints Observed

- All 30 component/hook tests already have `// @vitest-environment jsdom` — no changes needed there
- The 15 node test files currently rely on default `node` environment; after changing the default to `jsdom`, they will silently run in jsdom unless annotated
- `globals: true` is set; all test globals available without import
- `include` pattern covers both `.test.ts` and `.test.tsx`; `exclude` covers `specs/`
- No `setupFiles` configured — no setup file to modify
- `npm run test` = `vitest run` (single pass, no watch)
