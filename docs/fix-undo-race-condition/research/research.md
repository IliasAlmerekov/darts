# Research: Fix Undo Race Condition (Rapid Click)

**Date:** 2026-03-09
**Ticket:** TKT-222 — When the game is in "started" mode and players have already made several throws, clicking the Undo button very quickly causes ThrowDisplay to show 3 already-made throws for every player simultaneously (25/25/25, Score 226). Clicking a throw after that produces "Maximum update depth exceeded" and "Cannot throw: no active player found" with `activePlayerId: null`.
**Feature folder:** docs/fix-undo-race-condition/

---

## Current State

The undo flow has an `isUndoInFlightRef` guard that is intended to prevent concurrent undo calls, but the guard has a timing gap: it is set inside `executeUndo()` rather than in `handleUndo()` before the async boundary, and is reset in a `finally` block — creating a window where a second rapid click can slip through or where the deferred-undo path (`requestUndoAfterSync`) triggers an undo on already-undone optimistic state.

---

## Domain Types and Stores

### GameThrowsResponse

**File:** `src/shared/types/game.ts`
**Kind:** type alias
**Fields/Shape:**

```
id: number
status: GameStatus
currentRound: number
activePlayerId: number          ← becomes null/corrupted in the bug
currentThrowCount: number
players: {
  id: number
  name: string
  score: number
  isActive: boolean
  isBust: boolean
  position: number | null
  throwsInCurrentRound: number
  currentRoundThrows: PlayerThrow[]   ← all players show 3 throws in the bug
  roundHistory: RoundHistory[]
}[]
winnerId: number | null
settings: { ... }
```

**Used by:** `$gameData` atom, `throwStateService.ts`, `useGameState.ts`, `useUndoFlow.ts`, `useThrowQueue.ts`, `useThrowHandler.ts`, `useGamePlayersState.ts`, `useGameSounds.ts`
**Notes relevant to bug:** `activePlayerId` is a `number` in the type, but the bug evidence shows it becomes `null` at runtime, indicating the state is set to a value that doesn't match the declared type.

### PlayerThrow

**File:** `src/shared/types/game.ts`
**Kind:** type alias
**Fields/Shape:** `{ value: number; isDouble?: boolean; isTriple?: boolean; isBust?: boolean }`

### $gameData / $isLoading / $error

**File:** `src/shared/store/game-state.ts`
**Kind:** Nanostore atoms
**Actions:** `setGameData(data)`, `setLoading(loading)`, `setError(error)`, `resetGameStore()`
**Notes:** `setGameData` runs `normalizeGameData()` (winner derivation) before writing. All callers of `setGameData` identified: `useGameState.ts`, `useUndoFlow.ts`, `useThrowQueue.ts`, `throwStateService.ts` (via callers).

---

## Architecture and Patterns

**Folder structure (GamePage):**

```
src/pages/GamePage/
  ├── index.tsx                       (270L) — thin orchestrator, calls useGameLogic()
  ├── useGameLogic.ts                 (162L) — composes all sub-hooks
  ├── useThrowHandler.ts              (159L) — handleThrow + handleUndo entry points
  ├── useUndoFlow.ts                  (61L)  — executeUndo + isUndoInFlightRef
  ├── useThrowQueue.ts                (155L) — queue of up to 3 pending throws
  ├── useThrowReconciliation.ts       (75L)  — conflict detection + state reload
  ├── useGameState.ts                 (114L) — fetch + store subscription
  ├── useGamePlayersState.ts          (92L)  — derived player UI state
  ├── useGamePageEffects.ts           (120L) — SSE handlers, navigation, auto-finish
  ├── throwStateService.ts            (318L) — pure optimistic state functions
  ├── playerThrowsDisplay.logic.ts    (104L) — pure throw display logic
  ├── gamePlayersState.logic.ts       (86L)  — derived player state logic
  ├── components/
  │   ├── Keyboard.tsx                — throw input grid (no Undo button)
  │   ├── NumberButton.tsx            — renders a single button; value="Undo" renders Undo icon
  │   └── game-player-item/           — player card with throw slots
```

**Patterns CONFIRMED — must be respected in implementation:**

- Component pattern: functional components with explicit return type — confirmed
- CSS: CSS Modules co-located at `ComponentName.module.css` — confirmed
- Hooks: `use` prefix, effect cleanup mandatory — confirmed; all effects have cleanup
- Stores: `$` prefix, mutations via explicit actions only — confirmed
- Network: AbortController for cancellation — confirmed in `useGameState`; NOT used in `useUndoFlow` or `useThrowQueue`
- Error handling: no silent catch — confirmed; all catch blocks console.error or reconcile
- Raw DTOs never passed to UI — confirmed; `mapPlayersToUI` transforms at boundary

**Naming conventions observed:**

- Files: `{domain}.{type}.ts` (e.g. `throwStateService.ts`, `playerThrowsDisplay.logic.ts`)
- DTOs: `Dto` suffix (on external DTOs); internal domain types without suffix
- Mappers: verb-first (`mapPlayersToUI`, `applyOptimisticThrow`, `applyOptimisticUndo`)
- Constants: `UPPER_SNAKE_CASE`

**Import rules confirmed:**

- `app → pages → shared` direction — no violations observed

---

## Related Components and Pages

### useThrowHandler (directly affected)

**File:** `src/pages/GamePage/useThrowHandler.ts`
**Returns:** `{ handleThrow, handleUndo, pendingThrowCount, isQueueFull, syncMessage, clearSyncMessage }`
**Local state:** none (all via refs and sub-hooks)
**Hooks called:** `useThrowReconciliation`, `useUndoFlow`, `useThrowQueue`
**Key behavior — handleUndo:**

```
1. if (isUndoInFlightRef.current) → warn and return          ← GUARD CHECK
2. if (hasPendingThrows())         → requestUndoAfterSync()  ← DEFER PATH
3. else                            → await executeUndo()     ← EXECUTE PATH
```

**Problem area:** The guard at step 1 checks `isUndoInFlightRef.current`, but `isUndoInFlightRef.current = true` is only set INSIDE `executeUndo()` after the function is entered. There is a window between when `handleUndo` returns `await executeUndo()` and when the ref is actually set inside `executeUndo`.

### useUndoFlow (directly affected)

**File:** `src/pages/GamePage/useUndoFlow.ts`
**Returns:** `{ executeUndo: () => Promise<void>; isUndoInFlightRef: MutableRefObject<boolean>; resetUndoState: () => void }`
**Observed sequence inside `executeUndo`:**

```
applyOptimisticUndo($gameData.get()) → setGameData(optimisticState)
isUndoInFlightRef.current = true          ← SET AFTER optimistic update, not at top
await undoLastThrow(gameId)               ← no AbortSignal
setGameData(serverResponse)              ← replaces optimistic
finally: isUndoInFlightRef.current = false  ← reset
```

**Cancellation:** AbortController NOT used — undo API call cannot be cancelled on unmount.
**Notes on timing:** `isUndoInFlightRef.current = true` is set AFTER `setGameData(optimisticState)` is called. A second click that arrives in the microtask gap before the ref is set would pass the guard check, call `executeUndo` again, and call `applyOptimisticUndo` on already-undone state.

### useThrowQueue (directly affected)

**File:** `src/pages/GamePage/useThrowQueue.ts`
**Key state:**

- `pendingQueueRef`: mutable array of queued throws (max 3)
- `isDrainingRef`: prevents concurrent drain loops
- `pendingUndoRequestRef`: flag that triggers undo after drain completes
- `pendingThrowCount` (useState): synced from ref for UI re-render
  **Deferred undo path:** `requestUndoAfterSync()` sets `pendingUndoRequestRef = true`. After `drainQueue()` completes, it calls `executeUndo()`. If the queue drains and `executeUndo` is also in-flight from a direct undo click, two undo executions can overlap.

### throwStateService (directly affected — pure functions)

**File:** `src/pages/GamePage/throwStateService.ts`
**`applyOptimisticUndo` behavior:**

- Finds `activePlayerId` in the passed `currentGameData`
- Removes last entry from `currentRoundThrows` of that player
- Restores score
- Returns `null` if `currentRoundThrows` is empty for the active player
  **Critical gap:** Does NOT validate that `activePlayerId` corresponds to a valid player. If `activePlayerId` is stale (e.g., points to a player whose turn has already ended or is `null`), the function either finds the wrong player or returns `null`.

### GamePage / KeyboardSection (Undo button render)

**File:** `src/pages/GamePage/index.tsx`
**Undo button:** `NumberButton` with `value="Undo"` at line ~153 in `KeyboardSection`.
**Handler:** `onUndo={handleUndo}` from `useGameLogic()`.
**Disabled state:** `isUndoDisabled` from `useGamePlayersState` — computed via `buildGamePlayersDerivedState()`.
**No debounce or throttle** on the Undo button click handler — confirmed absent.

### GamePlayerItem / usePlayerThrowsDisplay (display side of bug)

**File:** `src/pages/GamePage/components/game-player-item/GamePlayerItem.tsx`
**File:** `src/pages/GamePage/usePlayerThrowsDisplay.ts`
**File:** `src/pages/GamePage/playerThrowsDisplay.logic.ts`
**Notes:** `getPlayerThrowsDisplay` reads `player.currentRoundThrows` and `player.roundHistory` to decide which throws to show per player. When optimistic state is applied multiple times incorrectly (all players' `currentRoundThrows` become populated), all players show throw slots filled. No "ThrowDisplay" component exists by that name — rendering is in `GamePlayerItem`.

---

## API Layer and Data Mapping

### undoLastThrow

**File:** `src/shared/api/game.ts`
**Signature:** `undoLastThrow(gameId: number): Promise<GameThrowsResponse>`
**Endpoint:** `DELETE /game/{id}/throw`
**Cancellation:** AbortSignal NOT supported — confirmed absent
**Returns:** Full `GameThrowsResponse` (not a delta)

### recordThrow

**File:** `src/shared/api/game.ts`
**Signature:** `recordThrow(gameId: number, payload: ThrowRequest): Promise<ThrowAckResponse>`
**Endpoint:** `POST /game/{id}/throw/delta`
**Cancellation:** AbortSignal NOT supported in direct call; queue manages sequencing

### applyOptimisticUndo

**File:** `src/pages/GamePage/throwStateService.ts`
**Signature:** `applyOptimisticUndo(currentGameData: GameThrowsResponse): GameThrowsResponse | null`
**Pure function:** YES
**Behavior:** Clones player array, removes last throw from active player's `currentRoundThrows`, restores `score`. Returns `null` when `currentRoundThrows` is empty.

### applyScoreboardDeltaToGameState

**File:** `src/pages/GamePage/throwStateService.ts`
**Signature:** `applyScoreboardDeltaToGameState(currentGameData: GameThrowsResponse, scoreboardDelta: ScoreboardDelta): GameThrowsResponse`
**Pure function:** YES
**Behavior:** Updates player properties from delta, finalizes turn (clears `currentRoundThrows`), rotates `activePlayerId` from `ScoreboardDelta.changedPlayers`.

### Error handling in undo path

**File:** `src/pages/GamePage/useUndoFlow.ts`

- `catch` block: `console.error` + `playSound("error")` — not silent, but no state recovery
- `finally` block: `isUndoInFlightRef.current = false` — always resets the guard

---

## Tests and Coverage

### Existing Tests

| Test file                                               | Kind        | What it covers                                                                                                                          |
| ------------------------------------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `src/pages/GamePage/useThrowHandler.test.ts`            | unit        | Optimistic throws, queue management, undo queuing while throws sync, throw conflict reconciliation, optimistic undo immediately applied |
| `src/pages/GamePage/throwStateService.test.ts`          | unit        | `applyOptimisticUndo` reverses last throw, `applyOptimisticThrow` finishes turn after 3rd throw, scoreboard delta reconciliation        |
| `src/pages/GamePage/Keyboard.test.tsx`                  | unit        | Throw modifier buttons (Double/Triple), disabled state                                                                                  |
| `src/pages/GamePage/usePlayerThrowsDisplay.test.tsx`    | unit        | Throw display fallback from previous round                                                                                              |
| `src/pages/GamePage/playerThrowsDisplay.logic.test.tsx` | unit        | Pure display logic per-player                                                                                                           |
| `src/pages/GamePage/useGameLogic.test.ts`               | unit        | Pure helpers (areAllPlayersAtStartScore, shouldAutoFinishGame, etc.)                                                                    |
| `src/pages/GamePage/useGameLogic.abort.test.tsx`        | unit        | AbortSignal handling for auto-finish                                                                                                    |
| `src/pages/GamePage/useGameLogic.wake-lock.test.tsx`    | unit        | Wake lock lifecycle, handleThrow/handleUndo wiring                                                                                      |
| `src/pages/GamePage/useGameState.test.ts`               | unit        | Game state fetching, stale response handling                                                                                            |
| `src/pages/GamePage/useGameSounds.test.ts`              | unit        | Sound triggers on state change, no sound on undo correction                                                                             |
| `src/pages/GamePage/gamePlayersState.logic.test.ts`     | unit        | Derived player state, `isUndoDisabled` flag                                                                                             |
| `src/pages/GamePage/GamePage.test.tsx`                  | integration | Error states only (missing gameId, load error, retry)                                                                                   |
| `tests/game/basic-throw.spec.ts`                        | e2e         | Throw mechanics 1.1–1.9: undo last throw within turn (1.6), undo from finish overlay (1.7), throw conflict recovery (1.8)               |

### Coverage Gaps (confirmed absences)

- **Rapid consecutive undo clicks**: no test — `useThrowHandler.test.ts` tests single queued undo, not two rapid consecutive `handleUndo()` calls
  - Searched: `useThrowHandler.test.ts`, `tests/game/basic-throw.spec.ts`
- **`isUndoInFlightRef` guard race**: no test — guard is exercised in spirit but no test fires two near-simultaneous undo calls
  - Searched: `useUndoFlow.ts`, `useThrowHandler.test.ts`
- **Deferred undo (`pendingUndoRequestRef`) + direct undo overlap**: no test
  - Searched: `useThrowQueue.ts`, all test files
- **`activePlayerId: null` state corruption**: no test validates recovery from this state
  - Searched: all `*.test.ts` files for `activePlayerId`
- **"Maximum update depth exceeded" regression guard**: no test
  - Searched: all `*.test.tsx` files

---

## Missing — Required for This Ticket

- No debounce/throttle on the Undo button `handleClick` — not found in `NumberButton.tsx` or `KeyboardSection`
- `isUndoInFlightRef.current = true` is set AFTER `setGameData(optimisticState)`, not before — gap confirmed by reading `useUndoFlow.ts`
- AbortController not used in `undoLastThrow` call — confirmed absent
- No guard in `handleUndo` that is set synchronously before the first `await` — confirmed absent
- Tests for rapid undo click scenario — not found
- Tests for `activePlayerId: null` recovery — not found

---

## File Reference Index

**MUST READ before implementation:**

- `src/pages/GamePage/useUndoFlow.ts`
- `src/pages/GamePage/useThrowHandler.ts`
- `src/pages/GamePage/useThrowQueue.ts`
- `src/pages/GamePage/throwStateService.ts`
- `src/pages/GamePage/index.tsx` (KeyboardSection, lines ~145–157)
- `src/pages/GamePage/components/NumberButton.tsx`
- `src/pages/GamePage/gamePlayersState.logic.ts` (isUndoDisabled derivation)
- `src/shared/api/game.ts` (undoLastThrow)
- `src/shared/store/game-state.ts`

**NOT FOUND (confirmed absent):**

- `ThrowDisplay.tsx`: no component by this name; display is in `GamePlayerItem.tsx` + `playerThrowsDisplay.logic.ts`
- AbortSignal in `undoLastThrow`: searched `src/shared/api/game.ts`, `useUndoFlow.ts`
- Debounce/throttle on Undo button: searched `NumberButton.tsx`, `index.tsx` KeyboardSection
- Test for rapid undo: searched `**/*.test.ts`, `**/*.test.tsx`, `e2e/**/*.spec.ts`

---

## Constraints Observed

- Functional components only — confirmed across all `src/pages/` and `src/shared/`
- CSS Modules co-located — confirmed in all components
- Mappers are pure functions — confirmed in `throwStateService.ts` (all three functions are pure)
- AbortController used in `useGameState` — confirmed; NOT used in undo flow
- No silent catch blocks — confirmed; all catch blocks log or reconcile
- Raw DTOs never passed to UI — confirmed; `mapPlayersToUI` at `shared/lib/player-mappers.ts`
- Direct store mutations forbidden — confirmed; all writes via `setGameData`, `setLoading`, `setError`
- `isUndoInFlightRef` ref (not state) used for in-flight guard — confirmed; setting it does not trigger re-renders
- `useCallback` used for `handleUndo` and `handleThrow` — confirmed; both are memoized
