# Research: Wake Lock API Implementation

**Date:** 2026-03-06
**Ticket:** 4. High — Wake Lock API not implemented. Create `src/pages/GamePage/useWakeLock.ts` and integrate into `useGameLogic.ts` to prevent screen sleep during active games.
**Feature folder:** docs/wake-lock-api/

## Current State

Wake Lock API is not implemented. No `useWakeLock` hook, no `WakeLockSentinel` usage, and no `navigator.wakeLock` calls exist anywhere in the codebase.

## Domain Types and Stores

### GameStatus

**File:** src/shared/types/game.ts
**Kind:** enum
**Fields/Shape:**

```typescript
export enum GameStatus {
  Lobby = "lobby",
  Started = "started",
  Finished = "finished",
}
```

**Used by:** src/pages/GamePage/useGameLogic.ts (indirectly via `gameData.status` string comparisons), src/shared/types/game.ts
**Notes:** `GameStatus.Started = "started"` — this value is what the ticket uses in `gameData?.status === "started"`.

### GameThrowsResponse

**File:** src/shared/types/game.ts
**Kind:** type
**Fields/Shape (relevant):**

```typescript
export type GameThrowsResponse = {
  id: number;
  status: string; // "lobby" | "started" | "finished" — untyped string, not GameStatus enum
  // ...
};
```

**Used by:** $gameData store, useGameState.ts, useGameLogic.ts, useThrowHandler.ts, useGameSounds.ts
**Notes:** `status` field is typed as `string`, not `GameStatus` enum. Direct string comparison `gameData?.status === "started"` is valid and used elsewhere in the project.

### $gameData

**File:** src/shared/store/game-state.ts
**Kind:** nanostore atom — `atom<GameThrowsResponse | null>`
**Used by:** useGameState.ts via `useStore($gameData)`, useThrowHandler.ts

### WakeLockSentinel

**NOT FOUND:** No usage in src/. The type `WakeLockSentinel` is part of the DOM lib (available via tsconfig `"DOM"` inclusion).

## Architecture and Patterns

**Folder structure (relevant):**

```
src/pages/GamePage/
  index.tsx                   # GamePage component — calls useGameLogic()
  useGameLogic.ts             # Main orchestration hook — 22 imports, 6 useEffect, 6 useState
  useGameState.ts             # Data fetching — AbortController pattern
  useThrowHandler.ts          # Throw queue — ref-based async guards
  useGameSounds.ts            # Sound effects — no boolean param, no cleanup
  usePlayerThrowsDisplay.ts   # Display logic — no effects
  components/
    SettingsOverlay.tsx
    Keyboard.tsx
    NumberButton.tsx
    game-player-item/
      GamePlayerItem.tsx
      GamePlayerItemList.tsx
      FinishedGamePlayerItemList.tsx
```

**Patterns CONFIRMED — must be respected in implementation:**

- Component pattern: functional component with explicit return type — CONFIRMED
- CSS: CSS Modules co-located — CONFIRMED (not relevant for this hook)
- Hooks: `use` prefix, effect cleanup mandatory — CONFIRMED in useGameState, useThrowHandler, useRoomStream
- Stores: `$` prefix, mutations via explicit actions only — CONFIRMED
- Network: AbortController for cancellation — CONFIRMED in useGameState and client.ts
- Error handling: no silent catch blocks — CONFIRMED (the ticket explicitly allows silent catch for wake lock per spec — see Constraints)
- DOM lib: `"DOM"` is in tsconfig.json `lib` array — CONFIRMED (`["ES2020", "DOM", "DOM.Iterable"]`)

**Naming conventions observed:**

- Hooks: `useXxx.ts` — `useGameLogic.ts`, `useGameState.ts`, `useGameSounds.ts`
- Import aliases: `@/` prefix throughout, no relative `../` imports
- All hooks are co-located in `src/pages/GamePage/` when page-specific

**Import rules confirmed:**

- `app → pages → shared` direction — CONFIRMED, no violations observed

## Related Components and Pages

### useGameLogic (directly affected)

**File:** src/pages/GamePage/useGameLogic.ts
**Signature:** `export function useGameLogic(): { gameId, gameData, isLoading, error, activePlayers, finishedPlayers, activePlayer, shouldShowFinishOverlay, isInteractionDisabled, isUndoDisabled, isSettingsOpen, isSavingSettings, settingsError, pageError, isExitOverlayOpen, handleThrow, handleUndo, handleContinueGame, handleUndoFromOverlay, handleOpenSettings, handleCloseSettings, handleSaveSettings, handleOpenExitOverlay, handleCloseExitOverlay, clearPageError, handleExitGame, refetch }`
**Local state:** useStore($invitation), multiple useState, useRef(isAutoFinishingRef)
**Hooks called:**

- useNavigate(), useLocation(), useParams() — React Router
- useStore($invitation) — Nanostores
- useMemo() — multiple derived values
- useGameState({ gameId }) — data fetching
- useThrowHandler({ gameId }) — throw queue
- useRoomStream(gameId) — SSE stream
- useGameSounds(gameData) — sound effects
- useEffect() — 6 effects
- useState() — multiple state vars
- useCallback() — multiple callbacks
- useRef() — isAutoFinishingRef
  **Routes:** /game/:id (inferred from useParams)
  **Notes:** `gameData` is available from useGameState result. `gameData?.status === "started"` pattern is valid here. No existing status check for "started" — only an event type check `event.type === "game-started"` (different concept).

### useGameSounds (reference pattern — similar usage point)

**File:** src/pages/GamePage/useGameSounds.ts
**Signature:** `export function useGameSounds(gameData: GameThrowsResponse | null): void`
**Notes:** Called in useGameLogic immediately after sub-hooks (line 74). Returns void. Similar to intended useWakeLock placement.

### GamePage (reference)

**File:** src/pages/GamePage/index.tsx
**Notes:** Thin orchestration layer. Only calls useGameLogic(). No direct game status checks.

## API Layer and Data Mapping

Not directly relevant to this ticket. Wake Lock is a browser API, no server interaction required.

**Game status values confirmed from API layer:**

- DTOs return `status: string` with literal values: `"lobby"`, `"started"`, `"finished"`
- `GameStatus` enum confirms `"started"` is the value for an active game
- The ticket's `gameData?.status === "started"` is consistent with actual API response values

## Tests and Coverage

### Existing Tests

| Test file                                                                          | Kind             | What it covers                                                                                                     |
| ---------------------------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------ |
| src/pages/GamePage/GamePage.test.tsx                                               | integration      | GamePage routing errors, load error retry, page error dismissal                                                    |
| src/pages/GamePage/useGameLogic.test.ts                                            | unit             | Pure utility functions: areAllPlayersAtStartScore, shouldAutoFinishGame, shouldNavigateToSummary, parseGameIdParam |
| src/pages/GamePage/useGameState.test.ts                                            | unit/hook        | Data fetching, AbortSignal, race condition guard                                                                   |
| src/pages/GamePage/useThrowHandler.test.ts                                         | unit/hook        | Throw queue, optimistic updates, 409 conflict recovery                                                             |
| src/pages/GamePage/usePlayerThrowsDisplay.test.tsx                                 | unit/hook        | Display fallback logic                                                                                             |
| src/pages/GamePage/components/game-player-item/GamePlayerItemList.test.tsx         | integration      | scrollIntoView behavior, fake timers                                                                               |
| src/pages/GamePage/components/game-player-item/FinishedGamePlayerItemList.test.tsx | integration      | Finished players list rendering                                                                                    |
| tests/joined-game/basic-throw.spec.ts                                              | e2e (Playwright) | Full game flow: throws, modifiers, checkout, undo, 409 conflict                                                    |

### Coverage Gaps (confirmed absences)

- `useWakeLock` hook: no test found — hook does not exist yet
  - Searched: `**/*.test.ts`, `**/*.spec.ts`, `e2e/**`, grep for "wakeLock"
- `useGameSounds.ts`: no unit test found despite complex state logic

### Navigator API Mocking Pattern (confirmed)

From existing tests:

```typescript
Object.assign(navigator, {
  clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
});
```

Pattern for mocking `navigator.*` properties: `Object.assign(navigator, { ... })`.

### Hook Test Pattern (confirmed)

- `renderHook()` + `waitFor()` from `@testing-library/react`
- Custom `Deferred<T>` helper for async promise control
- `vi.useFakeTimers()` + `vi.advanceTimersByTime()` for timer-based effects
- Unmount testing: `const { unmount } = renderHook(...); unmount();`
- `vi.stubGlobal("SomeGlobal", MockImpl)` for browser globals

## Missing — Required for This Ticket

- `src/pages/GamePage/useWakeLock.ts`: does not exist — must be created
- `isGameActive` variable in useGameLogic.ts: does not exist — must be added
- `useWakeLock(isGameActive)` call in useGameLogic.ts: does not exist — must be added
- `import { useWakeLock } from "./useWakeLock"` in useGameLogic.ts: does not exist — must be added
- Test file `src/pages/GamePage/useWakeLock.test.ts`: does not exist — must be created

## File Reference Index

**MUST READ before implementation:**

- src/pages/GamePage/useGameLogic.ts
- src/pages/GamePage/useGameSounds.ts (reference pattern for void hook called in useGameLogic)
- src/shared/types/game.ts (GameStatus enum, GameThrowsResponse)
- tsconfig.json (confirms DOM lib)

**NOT FOUND (confirmed absent):**

- `src/pages/GamePage/useWakeLock.ts` — searched `src/pages/GamePage/useWakeLock*`
- Any usage of `navigator.wakeLock` — searched `src/**` for "wakeLock"
- Any usage of `WakeLockSentinel` — searched `src/**` for "WakeLockSentinel"

## Constraints Observed

Facts the implementation MUST respect:

- Functional components only — CONFIRMED across all src/pages/ and src/shared/
- DOM lib included in tsconfig — CONFIRMED: `["ES2020", "DOM", "DOM.Iterable"]`; `WakeLockSentinel` type available without additional packages
- `gameData.status` is typed as `string`, not `GameStatus` enum — literal string comparison `=== "started"` is the correct pattern
- Effect cleanup is mandatory — CONFIRMED in useGameState (AbortController), useThrowHandler (clearQueue), useRoomStream (EventSource.close)
- Silent catch in useWakeLock is explicitly allowed per ticket spec — this is a documented exception: wake lock failure is non-actionable and must not propagate
- No `@/pages` imports from within pages — use relative imports for co-located files (all GamePage hooks use relative imports from each other)
- `useWakeLock` must use `@/` alias or relative import — existing pattern in GamePage uses relative imports for co-located hooks (confirmed: useGameSounds called without alias)
- Import placement: ticket specifies import added after existing imports in useGameLogic.ts
- `navigator.wakeLock` feature detection via `"wakeLock" in navigator` — standard pattern, browser support check before any API call
