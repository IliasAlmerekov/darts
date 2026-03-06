# Research: Move Warmup Import to App.tsx

**Date:** 2026-03-06
**Ticket:** Move `void import("@/pages/GameSummaryPage")` from `useGameLogic.ts` into `App.tsx` warmUpRoutes array
**Feature folder:** docs/move-warmup-import-to-app/

## Current State

Two separate warmup mechanisms exist: `App.tsx` has a centralized `warmUpRoutes()` function that already includes `@/pages/GameSummaryPage` at line 33; `useGameLogic.ts` has a second, redundant warmup for the same page at line 90.

## Architecture and Patterns

**Relevant folder structure:**

```
src/
  app/
    App.tsx          # root component — warmUpRoutes pattern
    App.test.tsx     # routing tests
  pages/
    GamePage/
      useGameLogic.ts          # page hook — duplicate warmup
      useGameLogic.test.ts     # pure-function tests only
      GamePage.test.tsx        # component tests (mocks useGameLogic)
    GameSummaryPage/
      index.tsx
      GameSummaryPage.test.tsx
      useGameSummaryPage.test.ts
```

**Patterns CONFIRMED — must be respected in implementation:**

- Component pattern: functional component with explicit return type — confirmed
- Hooks: `use` prefix, effect cleanup mandatory — confirmed (App.tsx returns cleanup for idle/timeout)
- Effects MUST clean up subscriptions/listeners/timers — confirmed in App.tsx lines 44–46, 52–54
- Dynamic imports: `void import(...)` pattern — confirmed across all warmup calls
- Path aliases: `@/pages/` alias used consistently — confirmed

**Import rules confirmed:**

- `app → pages → shared` direction — App.tsx imports pages; no reverse imports observed

## Warmup Implementation Detail

### App.tsx — `warmUpRoutes` function

**File:** `src/app/App.tsx`
**Location:** lines 28–55
**Pattern:**

```
useEffect(() => {
  const warmUpRoutes = () => {
    void import("@/pages/StartPage");
    void import("@/pages/GamePage");
    void import("@/pages/GameSummaryPage");   ← line 33 — already present
    void import("@/pages/SettingsPage");
    void import("@/pages/StatisticsPage");
    void import("@/pages/JoinedGamePage");
    void import("@/pages/PlayerProfilePage");
  };

  if (windowWithIdleCallback.requestIdleCallback && windowWithIdleCallback.cancelIdleCallback) {
    const idleCallbackId = windowWithIdleCallback.requestIdleCallback(() => warmUpRoutes());
    return () => { windowWithIdleCallback.cancelIdleCallback?.(idleCallbackId); };
  }

  const timeoutId = window.setTimeout(() => warmUpRoutes(), 300);
  return () => { window.clearTimeout(timeoutId); };
}, []);
```

**Notes:**

- `warmUpRoutes` is a local inline function (not exported, not an array)
- `GameSummaryPage` is ALREADY included at line 33
- Strategy: `requestIdleCallback` primary, `setTimeout(300ms)` fallback
- Effect returns cleanup for both timer types
- `WindowWithIdleCallback` ambient type extension at lines 22–25

### useGameLogic.ts — duplicate warmup

**File:** `src/pages/GamePage/useGameLogic.ts`
**Location:** lines 88–91

```
useEffect(() => {
  // Warm up summary route chunk to keep Game -> Summary navigation instant.
  void import("@/pages/GameSummaryPage");
}, []);
```

**Notes:**

- Standalone `useEffect` with empty dependency array
- No cleanup needed (dynamic imports don't require cleanup)
- Comment explains intent: keep Game→Summary navigation instant
- This is a **duplicate** of `App.tsx:33` — both preload the same chunk

## Related Components and Pages

### App (root component)

**File:** `src/app/App.tsx`
**Signature:** `function App(): React.JSX.Element`
**Local state:** none
**Hooks called:** `useEffect` (one instance — warmup on mount)
**Routes:** defines all 11 route entries via React Router `<Routes>`

### useGameLogic (page hook — directly affected)

**File:** `src/pages/GamePage/useGameLogic.ts`
**Signature:** `export const useGameLogic = () => { ... }`
**Return:** 29-property object (gameId, gameData, isLoading, error, activePlayers, finishedPlayers, activePlayer, shouldShowFinishOverlay, isInteractionDisabled, isUndoDisabled, isSettingsOpen, isSavingSettings, settingsError, pageError, isExitOverlayOpen, handleThrow, handleUndo, handleContinueGame, handleUndoFromOverlay, handleOpenSettings, handleCloseSettings, handleSaveSettings, handleOpenExitOverlay, handleCloseExitOverlay, clearPageError, handleExitGame, refetch)
**Warmup effect:** lines 88–91 (the target for removal)

## Lazy-loaded Pages (App.tsx lines 10–20)

All 11 pages are `React.lazy()` wrapped:

- `LoginPage`, `RegisterPage` — auth entry points, NOT in warmup list
- `StartPage`, `GamePage`, `GameSummaryPage`, `GameDetailPage`, `GamesOverview`, `SettingsPage`, `Statistics`, `JoinedGamePage`, `PlayerProfile` — route components

## Tests and Coverage

### Existing Tests

| Test file                                              | Kind        | What it covers                                                                                              |
| ------------------------------------------------------ | ----------- | ----------------------------------------------------------------------------------------------------------- |
| `src/app/App.test.tsx`                                 | integration | routing (login, register, 404); mocks all pages including GameSummaryPage                                   |
| `src/pages/GamePage/useGameLogic.test.ts`              | unit        | pure helper functions only (`areAllPlayersAtStartScore`, `shouldAutoFinishGame`, `shouldNavigateToSummary`) |
| `src/pages/GamePage/GamePage.test.tsx`                 | integration | error states; mocks `useGameLogic` entirely                                                                 |
| `src/pages/GamePage/useGameState.test.ts`              | unit        | AbortController + race condition handling                                                                   |
| `src/pages/GamePage/useThrowHandler.test.ts`           | unit        | throw queueing, optimistic updates, undo, conflict resolution                                               |
| `src/pages/GameSummaryPage/GameSummaryPage.test.tsx`   | integration | GameSummaryPage component                                                                                   |
| `src/pages/GameSummaryPage/useGameSummaryPage.test.ts` | unit        | summary page hook                                                                                           |

### Coverage Gaps (confirmed absences)

- Warmup effect in `useGameLogic.ts:88–91`: no test found (no mock of `import()` call)
- Warmup effect in `App.tsx:28–55`: no test found for `requestIdleCallback`/`setTimeout` warmup behavior
  - Searched: `**/*.test.ts`, `**/*.test.tsx`
- No E2E test covering Game→Summary navigation performance / chunk preload behavior

## Missing — Required for This Ticket

- The duplicate `useEffect` block at `useGameLogic.ts:88–91` must be removed
- `GameSummaryPage` is ALREADY present at `App.tsx:33` — no addition needed
- The ticket description says "add GameSummaryPage to warmUpRoutes array" but the `warmUpRoutes` in `App.tsx` is a local function, not an array; `GameSummaryPage` is already a `void import(...)` call inside it

## File Reference Index

**MUST READ before implementation:**

- `src/app/App.tsx` — lines 28–55 (warmUpRoutes pattern, already contains GameSummaryPage)
- `src/pages/GamePage/useGameLogic.ts` — lines 88–91 (the duplicate to remove)

**NOT FOUND (confirmed absent):**

- Any test covering warmup side effects — searched `**/*.test.ts`, `**/*.test.tsx`
- Any third warmup location beyond App.tsx and useGameLogic.ts — searched pattern `void import` across all src/

## Constraints Observed

- Functional components only — confirmed across all src/pages/ and src/app/
- Effects MUST clean up timers — confirmed in App.tsx warmup useEffect
- No cleanup needed for bare dynamic `import()` — confirmed by pattern: no return in useGameLogic warmup effect
- `void import()` syntax used consistently — confirmed in all 8 warmup call sites
- `@/` path alias used consistently — confirmed in all dynamic imports
- `app → pages → shared` import direction — confirmed; no reverse imports observed
- `GameSummaryPage` already present in `App.tsx:33` — confirmed by direct file read
