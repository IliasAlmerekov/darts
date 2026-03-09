# Phase 03: Thread `isUndoPending` to UI

**Layer:** pages/GamePage (hooks + logic)
**Depends on:** Phase 02 (`isUndoPending` must exist in `UseThrowHandlerReturn`)
**Can be tested in isolation:** Yes — `buildGamePlayersDerivedState` is a pure function; `useGamePlayersState` testable with mocked dependencies

---

## Goal

Thread `isUndoPending` from `useThrowHandler` through `useGameLogic` → `useGamePlayersState` → `buildGamePlayersDerivedState`, so `isUndoDisabled` is `true` while an undo API call is in-flight. React 18 automatic batching ensures the button disables in the same render frame as the optimistic score update.

---

## Files to MODIFY

### `src/pages/GamePage/gamePlayersState.logic.ts`

**Confirmed at:** research.md — Related Components section; file read lines 9-25

**Change A — Add `isUndoPending` to `BuildGamePlayersStateOptions`:**

```typescript
// BEFORE
export interface BuildGamePlayersStateOptions {
  dismissedZeroScorePlayerIds: number[];
  gameData: GameThrowsResponse | null;
  hasError: boolean;
  isLoading: boolean;
  skipFinishOverlay: boolean;
}

// AFTER
export interface BuildGamePlayersStateOptions {
  dismissedZeroScorePlayerIds: number[];
  gameData: GameThrowsResponse | null;
  hasError: boolean;
  isLoading: boolean;
  isUndoPending: boolean; // ← NEW
  skipFinishOverlay: boolean;
}
```

**Change B — Include `isUndoPending` in `isUndoDisabled` computation:**

```typescript
// BEFORE (lines 70-75)
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
  isUndoPending || // ← NEW: disable while undo is in-flight
  areAllPlayersAtStartScore(gameData);
```

**DO NOT CHANGE:**

- `GamePlayersDerivedState` return interface — unchanged
- `appendDismissedPlayerIds` — unchanged
- `filterDismissedPlayerIds` — unchanged
- `buildGamePlayersDerivedState` function signature (only options interface changes) — function name unchanged
- All other derived state computations (`activePlayer`, `activePlayers`, `finishedPlayers`, `isInteractionDisabled`, `shouldShowFinishOverlay`, `zeroScorePlayerIds`) — unchanged

---

### `src/pages/GamePage/useGamePlayersState.ts`

**Confirmed at:** research.md — Related Components section; file read lines 9-92

**Change A — Add `isUndoPending` to `UseGamePlayersStateOptions`:**

```typescript
// BEFORE
interface UseGamePlayersStateOptions {
  error: Error | null;
  gameData: GameThrowsResponse | null;
  gameId: number | null;
  handleUndo: () => Promise<void>;
  isLoading: boolean;
  skipFinishOverlay: boolean;
}

// AFTER
interface UseGamePlayersStateOptions {
  error: Error | null;
  gameData: GameThrowsResponse | null;
  gameId: number | null;
  handleUndo: () => Promise<void>;
  isLoading: boolean;
  isUndoPending: boolean; // ← NEW
  skipFinishOverlay: boolean;
}
```

**Change B — Destructure `isUndoPending` in hook body:**

```typescript
// BEFORE
export function useGamePlayersState({
  error,
  gameData,
  gameId,
  handleUndo,
  isLoading,
  skipFinishOverlay,
}: UseGamePlayersStateOptions): UseGamePlayersStateResult {

// AFTER
export function useGamePlayersState({
  error,
  gameData,
  gameId,
  handleUndo,
  isLoading,
  isUndoPending,    // ← NEW
  skipFinishOverlay,
}: UseGamePlayersStateOptions): UseGamePlayersStateResult {
```

**Change C — Pass `isUndoPending` to `buildGamePlayersDerivedState`:**

```typescript
// BEFORE (lines 47-57)
} = useMemo(
  () =>
    buildGamePlayersDerivedState({
      dismissedZeroScorePlayerIds,
      gameData,
      hasError: !!error,
      isLoading,
      skipFinishOverlay,
    }),
  [dismissedZeroScorePlayerIds, error, gameData, isLoading, skipFinishOverlay],
);

// AFTER
} = useMemo(
  () =>
    buildGamePlayersDerivedState({
      dismissedZeroScorePlayerIds,
      gameData,
      hasError: !!error,
      isLoading,
      isUndoPending,    // ← NEW
      skipFinishOverlay,
    }),
  [dismissedZeroScorePlayerIds, error, gameData, isLoading, isUndoPending, skipFinishOverlay],
);
```

**DO NOT CHANGE:**

- All existing `useEffect` hooks (lines 59-67) — unchanged
- `handleContinueGame` — unchanged
- `handleUndoFromOverlay` — unchanged
- Return object — unchanged (all same fields, no new fields exposed)

---

### `src/pages/GamePage/useGameLogic.ts`

**Confirmed at:** research.md — Architecture section; file read lines 1-162

**Change A — Destructure `isUndoPending` from `useThrowHandler`:**

```typescript
// BEFORE (line 72)
const { handleThrow, handleUndo } = useThrowHandler({ gameId });

// AFTER
const { handleThrow, handleUndo, isUndoPending } = useThrowHandler({ gameId });
```

**Change B — Pass `isUndoPending` to `useGamePlayersState`:**

```typescript
// BEFORE (lines 92-99)
} = useGamePlayersState({
  error,
  gameData,
  gameId,
  handleUndo,
  isLoading,
  skipFinishOverlay,
});

// AFTER
} = useGamePlayersState({
  error,
  gameData,
  gameId,
  handleUndo,
  isLoading,
  isUndoPending,    // ← NEW
  skipFinishOverlay,
});
```

**DO NOT CHANGE:**

- `UseGameLogicResult` interface — `isUndoDisabled` already exists in the return type; no new fields needed since `isUndoPending` is an implementation detail consumed by `useGamePlayersState`, not exposed at `useGameLogic` level
- All other hook calls — unchanged
- Return object — unchanged

---

## Tests for This Phase

### `src/pages/GamePage/gamePlayersState.logic.test.ts`

**Existing test updates required:**
All existing calls to `buildGamePlayersDerivedState` must add `isUndoPending: false` to their options object. The TypeScript compiler will flag these as errors, so coder can follow the compiler to find all call sites.

**New test cases to add:**

| Test case                                                                                 | Input                                                                                           | Expected                |
| ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ----------------------- |
| should disable undo when `isUndoPending` is true and game has throws                      | `isUndoPending: true`, game has active player with throws, not at start score                   | `isUndoDisabled: true`  |
| should enable undo when `isUndoPending` is false and game has throws                      | `isUndoPending: false`, game has active player with throws, not at start score                  | `isUndoDisabled: false` |
| should disable undo when `isUndoPending` is true even if other conditions would enable it | `isUndoPending: true`, not loading, no error, game data present, not at start score, no overlay | `isUndoDisabled: true`  |

---

## Verification Commands

1. `npm run typecheck`
2. `npm run eslint`
3. `npm run test -- gamePlayersState.logic`
4. `npm run test -- useGamePlayersState` (if test file exists)
5. `npm run test` ← full suite to catch any regressions
6. `npx prettier --check .`

---

## Done Criteria

- [ ] `BuildGamePlayersStateOptions` has `isUndoPending: boolean`
- [ ] `isUndoDisabled` includes `isUndoPending` in its OR chain
- [ ] `useGamePlayersState` options include and pass through `isUndoPending`
- [ ] `useMemo` deps array in `useGamePlayersState` includes `isUndoPending`
- [ ] `useGameLogic` destructures `isUndoPending` from `useThrowHandler` and passes to `useGamePlayersState`
- [ ] All existing `gamePlayersState.logic.test.ts` fixtures updated with `isUndoPending: false`
- [ ] New `isUndoPending` tests pass
- [ ] Full `npm run test` passes — no regressions
- [ ] `npm run typecheck` passes

---

## Human Review Checkpoint

Before marking TKT-222 complete:

- [ ] `isUndoPending` is NOT exposed in `UseGameLogicResult` (it's an internal implementation detail)?
- [ ] `useMemo` deps include `isUndoPending` to prevent stale closure?
- [ ] E2E test `tests/game/basic-throw.spec.ts` test 1.6 still passes?
- [ ] Consider running `npm run test:e2e` to verify undo flow end-to-end
