# Phase 02: Core Undo Fixes — `useUndoFlow` + `useThrowHandler`

**Layer:** pages/GamePage (hooks)
**Depends on:** Phase 01 (independent — different files, can merge in any order)
**Can be tested in isolation:** Yes — hooks tested with mocked API boundary

---

## Goal

Fix `useUndoFlow` to: (1) validate the server undo response before writing to the store, (2) recover from API failures by calling `reconcileGameState`, (3) expose `isUndoPending` React state so the UI can reflect the in-flight status. Fix `useThrowHandler` to pass `reconcileGameState` to `useUndoFlow` and expose `isUndoPending` in its return.

---

## Files to MODIFY

### `src/pages/GamePage/useUndoFlow.ts`

**Confirmed at:** research.md — Related Components section; file read lines 1-61

**Change A — Add `reconcileGameState` to options interface:**

```typescript
// BEFORE
interface UseUndoFlowOptions {
  gameId: number | null;
}

// AFTER
interface UseUndoFlowOptions {
  gameId: number | null;
  reconcileGameState: (message: string) => Promise<void>;
}
```

**Change B — Add `isUndoPending` to return interface:**

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
  isUndoPending: boolean;
  resetUndoState: () => void;
}
```

**Change C — Add `isUndoPending` state to hook body:**
Add `const [isUndoPending, setIsUndoPending] = useState(false);` inside `useUndoFlow`.
Import `useState` from `react` (add to existing import).

**Change D — Modify `executeUndo` body:**

Current `executeUndo` sequence (lines 26-54):

```
check guard → set guard → check gameId → try { optimistic undo → API call → setGameData } catch { log + sound } finally { reset guard }
```

New `executeUndo` sequence:

```
check guard
→ set guard (isUndoInFlightRef.current = true)
→ setIsUndoPending(true)                          ← NEW: batched with next setGameData call
→ check gameId (early return if null)
→ try {
    optimistic undo → if (optimisticUndoState) setGameData(optimisticUndoState)
    const updatedGameState = await undoLastThrow(gameId)
    → VALIDATE: typeof updatedGameState.activePlayerId !== "number"
                || !Number.isFinite(updatedGameState.activePlayerId)
      if invalid:
        console.error("Undo returned invalid activePlayerId:", updatedGameState.activePlayerId)
        await reconcileGameState("")              ← empty string: no user-visible sync message
        (do NOT call setGameData or playSound)
      else:
        setGameData(updatedGameState)
        playSound("undo")
  } catch (error) {
    console.error("Failed to undo throw:", error)
    await reconcileGameState("")                  ← NEW: recover optimistic state; empty string
    playSound("error")
  } finally {
    isUndoInFlightRef.current = false
    setIsUndoPending(false)                       ← NEW
  }
```

**Important note on `reconcileGameState("")`:** `reconcileGameState` calls `setSyncMessage(message)` internally. Passing `""` (empty string) means `syncMessage` will be set to `""`. The calling code must ensure this does not display a visible message. If `reconcileGameState`'s current implementation does `setSyncMessage(message)` unconditionally, and the UI checks `syncMessage` for truthiness before displaying, an empty string will not show. If the UI shows on any non-null value, pass a null-safe variant or update the call. **Coder must inspect the `syncMessage` UI rendering in `GamePage/index.tsx` and confirm empty string is not displayed, OR pass `null` if the API allows it.**

Alternative: if `reconcileGameState` does not accept empty string cleanly, use a separate `rawReconcileGameState` pattern. But the simplest approach is to call `reconcileGameState("")` and clear syncMessage immediately after via `updateSyncMessage(null)` — but `updateSyncMessage` is not available in `useUndoFlow`. Coder should inspect and choose the cleanest approach that produces no user-visible message.

**Change E — Update return object:**

```typescript
return {
  executeUndo,
  isUndoInFlightRef,
  isUndoPending, // ← NEW
  resetUndoState,
};
```

**Change F — Update `resetUndoState`:**

```typescript
const resetUndoState = useCallback((): void => {
  isUndoInFlightRef.current = false;
  setIsUndoPending(false); // ← NEW: reset pending state on game change
}, []);
```

**Change G — Update `useCallback` deps for `executeUndo`:**
Add `reconcileGameState` and `setIsUndoPending` (stable from useState) to the dependency array:

```typescript
}, [gameId, reconcileGameState]);
// Note: setIsUndoPending from useState is stable, does not need to be in deps
// (React guarantees setState dispatch functions are stable)
```

**DO NOT CHANGE:**

- `isUndoInFlightRef` guard logic (lines 27-31) — unchanged
- `applyOptimisticUndo` call and null check — unchanged
- `undoLastThrow` import — unchanged
- `playSound` import — unchanged
- Export of `useUndoFlow` function — unchanged

---

### `src/pages/GamePage/useThrowHandler.ts`

**Confirmed at:** research.md — Related Components section; file read lines 1-159

**Change A — Pass `reconcileGameState` to `useUndoFlow`:**
Current call (line 31):

```typescript
const { executeUndo, isUndoInFlightRef, resetUndoState } = useUndoFlow({ gameId });
```

After:

```typescript
const { executeUndo, isUndoInFlightRef, isUndoPending, resetUndoState } = useUndoFlow({
  gameId,
  reconcileGameState, // ← NEW: from useThrowReconciliation (already available at line 29-30)
});
```

**Change B — Update `UseThrowHandlerReturn` interface:**

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

// AFTER
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

**Change C — Include `isUndoPending` in return:**

```typescript
return {
  handleThrow,
  handleUndo,
  pendingThrowCount,
  isQueueFull,
  isUndoPending, // ← NEW
  syncMessage,
  clearSyncMessage,
};
```

**DO NOT CHANGE:**

- `handleThrow` logic — unchanged
- `handleUndo` logic — unchanged
- `useThrowReconciliation` call — unchanged
- `useThrowQueue` call — unchanged
- The `useEffect` that resets queue state on `gameId` change — unchanged
- All existing `useCallback` deps — unchanged (only `reconcileGameState` moves from being available to being also passed to `useUndoFlow`)

---

## Tests for This Phase

**Test file:** `src/pages/GamePage/useThrowHandler.test.ts`

New test cases to add:

| Test case                                                                  | Condition                                                                | Expected                                                                           | Mocks needed                                               |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| should return `isUndoPending: false` initially                             | hook rendered                                                            | `result.current.isUndoPending === false`                                           | `undoLastThrow` mock                                       |
| should set `isUndoPending: true` while undo is in-flight                   | `handleUndo()` called, `undoLastThrow` deferred                          | `isUndoPending === true` during await                                              | deferred `undoLastThrow`                                   |
| should set `isUndoPending: false` after undo completes                     | `undoLastThrow` resolves                                                 | `isUndoPending === false`                                                          | `undoLastThrow` mock                                       |
| should set `isUndoPending: false` after undo API failure                   | `undoLastThrow` rejects                                                  | `isUndoPending === false`                                                          | `undoLastThrow` mock rejects                               |
| should call `reconcileGameState` when server returns null `activePlayerId` | `undoLastThrow` resolves with `{ activePlayerId: null, players: [...] }` | `reconcileGameState` mock called once; `setGameData` NOT called with invalid state | `undoLastThrow` resolves invalid; `reconcileGameState` spy |
| should call `reconcileGameState` when undo API throws                      | `undoLastThrow` rejects with `ApiError`                                  | `reconcileGameState` mock called once                                              | `undoLastThrow` rejects                                    |
| should not call `undoLastThrow` twice on rapid undo clicks                 | `handleUndo()` called twice before first resolves                        | `undoLastThrow` called exactly once                                                | deferred `undoLastThrow`                                   |

**Existing tests that must still pass:**
All existing `useThrowHandler.test.ts` tests. The key change is: `useUndoFlow` now requires `reconcileGameState`. If `useUndoFlow` is mocked in existing tests via `vi.mock`, the mock must be updated to accept the new option. If it is NOT mocked (uses real implementation with mocked `undoLastThrow`), no mock changes needed — just ensure `reconcileGameState` (from `useThrowReconciliation`) is properly set up in test environment.

---

## Verification Commands

1. `npm run typecheck`
2. `npm run eslint`
3. `npm run test -- useThrowHandler`
4. `npm run test -- useUndoFlow` (if there is a dedicated test file — check; if not, covered via `useThrowHandler`)
5. `npx prettier --check .`

---

## Done Criteria

- [ ] `useUndoFlow` accepts `reconcileGameState` parameter
- [ ] `useUndoFlow` returns `isUndoPending: boolean`
- [ ] `executeUndo` validates `activePlayerId` before calling `setGameData`
- [ ] `executeUndo` calls `reconcileGameState` on API failure (catch block)
- [ ] `executeUndo` calls `setIsUndoPending(true)` before any await; `setIsUndoPending(false)` in finally
- [ ] `resetUndoState` also calls `setIsUndoPending(false)`
- [ ] `useThrowHandler` passes `reconcileGameState` to `useUndoFlow`
- [ ] `useThrowHandler` exposes `isUndoPending` in return value
- [ ] All new tests passing; all existing tests passing
- [ ] `npm run typecheck` passes

---

## Human Review Checkpoint

Before proceeding to Phase 03:

- [ ] `setIsUndoPending(true)` is called BEFORE `setGameData(optimisticState)` — same synchronous block, batched by React 18?
- [ ] `reconcileGameState` call in catch produces no user-visible sync message?
- [ ] `isUndoInFlightRef.current = true` still set synchronously at the top of `executeUndo` (before `setIsUndoPending`)?
- [ ] `resetUndoState` resets both `isUndoInFlightRef` and `isUndoPending`?
