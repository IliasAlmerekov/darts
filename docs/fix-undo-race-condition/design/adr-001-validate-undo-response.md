# ADR-001: Validate `activePlayerId` in Undo Server Response

**Status:** Proposed — pending human review

---

## Context

Research finding: `GameThrowsResponse.activePlayerId` is typed as `number`, but at runtime the field becomes `null` after rapid sequential undo clicks exhaust the throw history. This occurs because the server returns `activePlayerId: null` under certain edge cases (no remaining throws to undo, or concurrent undo processing). The client's `executeUndo` in `useUndoFlow.ts` calls `setGameData(updatedGameState)` unconditionally, writing the null value to the `$gameData` Nanostore atom. Subsequent `handleThrow` calls read `activePlayerId: null` from the store, cannot find the active player, and fail with the error logged in the ticket.

---

## Decision

**Validate the `activePlayerId` field in the server response BEFORE writing it to the store.** Validation occurs in `executeUndo` (the undo-specific call site) rather than in the shared `setGameData` action or in `normalizeGameData`.

Validation check:

```typescript
typeof updatedGameState.activePlayerId !== "number" ||
  !Number.isFinite(updatedGameState.activePlayerId);
```

On validation failure:

1. Log a structured error (not silent)
2. Call `reconcileGameState(message)` to fetch a fresh, authoritative state from the server and overwrite the store
3. Do NOT call `setGameData(updatedGameState)` with the invalid response

---

## Rejected Alternatives

1. **Add null check in `normalizeGameData` (shared store action)** — rejected because `normalizeGameData` is a shared utility that knows nothing about undo semantics, does not have access to `reconcileGameState`, and cannot perform async recovery. Adding undo-specific behavior to a shared action violates the single-responsibility principle and the `app → pages → shared` dependency direction (the store cannot depend on page-level reconciliation logic).

2. **Add a TypeScript type guard at the API boundary (`src/shared/api/game.ts`)** — rejected because the existing `isGameThrowsResponse` validator in `game.ts` would need to be changed to reject `activePlayerId: null`, which could break other callers (e.g., `getGameThrows` after a legitimate game-finished state). The validation is undo-specific.

3. **Ignore the validation and handle null in `handleThrow`** — rejected because this would require null-propagation guards throughout the game logic, masking the root cause instead of preventing state corruption.

4. **Block the undo API call if there are no current-round throws** — rejected because undo legitimately crosses turn boundaries (the server undoes the previous player's last throw when the current player has no throws in their current round). The client cannot know from local state whether the server has throws to undo.

---

## Consequences

**Positive:**

- Corrupted `activePlayerId: null` state is never written to the store
- Store remains valid after all undo edge cases
- Recovery is automatic (reconcileGameState fetches fresh state)
- Pattern matches the existing error recovery in `drainQueue`

**Negative / Trade-offs:**

- If the server legitimately needs to return `activePlayerId: null` (e.g., game in a special state), this validation would incorrectly trigger reconciliation. This is acceptable because a null `activePlayerId` is always an invalid state for an active game — if the game is finished, the `status` field communicates that, not `activePlayerId`.
- Adds one more `reconcileGameState` call path; adds one more network request on the failure edge case.

**Impact on tests:**

- New unit test: `executeUndo` with `undoLastThrow` returning `{ activePlayerId: null }` → `reconcileGameState` called, `setGameData` not called
- New unit test: `executeUndo` with `undoLastThrow` returning `{ activePlayerId: NaN }` → same behavior
- `useThrowHandler.test.ts` must set up `reconcileGameState` mock for `useUndoFlow`

---

## Linked Research Facts

- Research: `activePlayerId` typed as `number` but becomes null at runtime (domain types section)
- Research: `isUndoInFlightRef` guard exists but `isUndoDisabled` does not include in-flight state (related components section)
- Research: `catch` block in `executeUndo` does not restore state on failure (API layer section)
- Research: `reconcileGameState` pattern already used in `drainQueue` error path (architecture section)
