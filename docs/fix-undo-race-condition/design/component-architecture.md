# Component Architecture

## Layer Placement

| Component/Hook                 | Layer          | Kind          | New/Existing | File path                                         |
| ------------------------------ | -------------- | ------------- | ------------ | ------------------------------------------------- |
| `useUndoFlow`                  | pages/GamePage | Hook          | MODIFY       | `src/pages/GamePage/useUndoFlow.ts`               |
| `useThrowHandler`              | pages/GamePage | Hook          | MODIFY       | `src/pages/GamePage/useThrowHandler.ts`           |
| `buildGamePlayersDerivedState` | pages/GamePage | Pure function | MODIFY       | `src/pages/GamePage/gamePlayersState.logic.ts`    |
| `useGamePlayersState`          | pages/GamePage | Hook          | MODIFY       | `src/pages/GamePage/useGamePlayersState.ts`       |
| `useGameLogic`                 | pages/GamePage | Hook          | MODIFY       | `src/pages/GamePage/useGameLogic.ts`              |
| `getPlayerThrowsDisplay`       | pages/GamePage | Pure function | MODIFY       | `src/pages/GamePage/playerThrowsDisplay.logic.ts` |

No new files. No new components.

---

## Hook Composition (current → changed)

```
GamePage (index.tsx)
  └── useGameLogic()
        ├── useThrowHandler({ gameId })           ← MODIFIED
        │     ├── useUndoFlow({ gameId, reconcileGameState })  ← MODIFIED signature
        │     │     ├── isUndoInFlightRef: MutableRefObject<boolean>  (unchanged)
        │     │     ├── isUndoPending: boolean                ← NEW state for UI
        │     │     ├── executeUndo(): Promise<void>          (unchanged name, MODIFIED body)
        │     │     └── resetUndoState(): void                (unchanged)
        │     ├── useThrowReconciliation({ gameId })
        │     │     └── reconcileGameState(message): Promise<void>
        │     └── useThrowQueue({ gameId, executeUndo, reconcileGameState })
        │
        └── useGamePlayersState({ gameId, gameData, isLoading, hasError, isUndoPending })  ← MODIFIED
              └── buildGamePlayersDerivedState({
                    dismissedZeroScorePlayerIds,
                    gameData,
                    hasError,
                    isLoading,
                    isUndoPending,    ← NEW
                    skipFinishOverlay,
                  })
                  → isUndoDisabled now includes: isUndoPending || areAllPlayersAtStartScore(...)
```

---

## Data Flow Through Modified Hook Chain

```
User clicks Undo button
  → handleUndo() in useThrowHandler
        → executeUndo() in useUndoFlow
              → setIsUndoPending(true)            ← NEW: triggers re-render, button disables
              → applyOptimisticUndo($gameData.get())
              → setGameData(optimisticState)       (if not null)
              → await undoLastThrow(gameId)
              → VALIDATION: if (!isValidUndoResponse(response)) ← NEW
                  → reconcileGameState(message)   ← recovery path
              → else setGameData(response)
              → finally: setIsUndoPending(false)  ← NEW: triggers re-render, button re-enables
```

---

## Modified `UseUndoFlowOptions` Interface

```typescript
// BEFORE
interface UseUndoFlowOptions {
  gameId: number | null;
}

// AFTER
interface UseUndoFlowOptions {
  gameId: number | null;
  reconcileGameState: (message: string) => Promise<void>; // ← NEW
}
```

## Modified `UseUndoFlowReturn` Interface

```typescript
// BEFORE
interface UseUndoFlowReturn {
  executeUndo: () => Promise<void>;
  isUndoInFlightRef: MutableRefObject<boolean>;
  resetUndoState: () => void;
}

// AFTER
interface UseUndoFlowReturn {
  executeUndo: () => Promise<void>;
  isUndoInFlightRef: MutableRefObject<boolean>;
  isUndoPending: boolean; // ← NEW: React state, triggers re-renders
  resetUndoState: () => void;
}
```

## Modified `UseThrowHandlerReturn` Interface

```typescript
// BEFORE
interface UseThrowHandlerReturn {
  handleThrow: (value: string | number) => Promise<void>;
  handleUndo: () => Promise<void>;
  pendingThrowCount: number;
  isQueueFull: boolean;
  syncMessage: string | null;
  clearSyncMessage: () => void;
}

// AFTER — adds isUndoPending
interface UseThrowHandlerReturn {
  handleThrow: (value: string | number) => Promise<void>;
  handleUndo: () => Promise<void>;
  pendingThrowCount: number;
  isQueueFull: boolean;
  isUndoPending: boolean; // ← NEW
  syncMessage: string | null;
  clearSyncMessage: () => void;
}
```

## Modified `BuildGamePlayersStateOptions` Interface

```typescript
// BEFORE
export interface BuildGamePlayersStateOptions {
  dismissedZeroScorePlayerIds: number[];
  gameData: GameThrowsResponse | null;
  hasError: boolean;
  isLoading: boolean;
  skipFinishOverlay: boolean;
}

// AFTER — adds isUndoPending
export interface BuildGamePlayersStateOptions {
  dismissedZeroScorePlayerIds: number[];
  gameData: GameThrowsResponse | null;
  hasError: boolean;
  isLoading: boolean;
  isUndoPending: boolean; // ← NEW
  skipFinishOverlay: boolean;
}
```

## `isUndoDisabled` Computation (gamePlayersState.logic.ts)

```typescript
// BEFORE
const isUndoDisabled =
  isLoading ||
  hasError ||
  !gameData ||
  shouldShowFinishOverlay ||
  areAllPlayersAtStartScore(gameData);

// AFTER
const isUndoDisabled =
  isLoading ||
  hasError ||
  !gameData ||
  shouldShowFinishOverlay ||
  isUndoPending || // ← NEW: disables button during in-flight undo
  areAllPlayersAtStartScore(gameData);
```

---

## `playerThrowsDisplay.logic.ts` Change

The function `getPlayerThrowsDisplay` currently falls back to the last `roundHistory` entry for ALL players with empty `currentRoundThrows`. After the fix, the active player (identified by `isActive: true` on the player object or an explicit `isActive` parameter) returns **empty throw slots** instead of the round history fallback.

```
// BEFORE (conceptual)
if (currentRoundThrows.length === 0) {
  → use last roundHistory entry as fallback (for all players)
}

// AFTER
if (currentRoundThrows.length === 0) {
  if (player.isActive) {
    → return empty throw slots (no fallback for active player)
  } else {
    → use last roundHistory entry as fallback (inactive players only)
  }
}
```

The exact parameter name/shape to be confirmed in Phase 4 against the current `PlayerThrowsDisplayOptions` interface.

---

## `executeUndo` Validation Logic (pseudocode)

```typescript
// After await undoLastThrow(gameId) resolves:
if (
  typeof updatedGameState.activePlayerId !== "number" ||
  !Number.isFinite(updatedGameState.activePlayerId)
) {
  console.error("Undo returned invalid activePlayerId:", updatedGameState.activePlayerId);
  await reconcileGameState("Undo could not be applied. Game state refreshed.");
  // do NOT call setGameData
} else {
  setGameData(updatedGameState);
  playSound("undo");
}
```

---

## Import Rules Verified

- `useUndoFlow` imports `useThrowReconciliation` → both in `pages/GamePage/` — same slice, allowed
- `useThrowHandler` → `useUndoFlow` → same slice — allowed
- `useGameLogic` → `useThrowHandler` → same slice — allowed
- `buildGamePlayersDerivedState` in `gamePlayersState.logic.ts` — same slice — allowed
- No imports from `app/` into `pages/` or `shared/` — not introduced
- No cross-slice deep imports — not introduced
