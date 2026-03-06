# Design Summary: Fix Race Condition — Navigate Before startGame Completes

**Date:** 2026-03-06
**Ticket:** Race condition in useGameSummaryPage.ts:129 — navigate fires before startGame() resolves
**Phase:** 2 (minimal — skipped by user, written from research facts)

## Problem

`handlePlayAgain()` in `useGameSummaryPage.ts`:

1. Calls `createRematch()` — awaited correctly
2. Calls `navigate(ROUTES.game(rematch.gameId))` — **immediately**, game is still in `lobby`
3. Calls `void startGame(...).catch(...)` — fire-and-forget, NOT awaited

`GamePage` → `useGameLogic` has no guard for `status === "lobby"`. The page renders a game that has not started yet.

## Solution

In `handlePlayAgain()`:

1. Await `startGame()` **before** calling `navigate()`
2. Add `starting` boolean local state (loading guard) and an in-flight ref to prevent concurrent calls — same pattern as `useStartPage.ts:315–342`
3. Return the `starting` flag from the hook so the component can disable the button

## Scope

**One hook modified:** `src/pages/GameSummaryPage/useGameSummaryPage.ts`
**One test file modified:** `src/pages/GameSummaryPage/useGameSummaryPage.test.ts`

No new files. No API changes. No store changes. No routing changes.

## Reference Pattern

`src/pages/StartPage/useStartPage.ts` lines 315–342:

- `starting: boolean` state flag
- `startGameInFlightRef: React.MutableRefObject<boolean>` to prevent concurrent calls
- `try { await startGame(...) } catch { toUserErrorMessage() } finally { clear flags }`
- Navigate only on success, inside the try block after await

## Hook Return Shape (modified fields only)

```
useGameSummaryPage(): {
  ...existing fields...,
  starting: boolean,   // NEW — true while startGame is in-flight
}
```

## Component Change

`src/pages/GameSummaryPage/index.tsx`: pass `starting` to disable the "Play Again" button while `startGame` is pending.
