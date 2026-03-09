# Design: Fix Undo Race Condition (Rapid Click)

**Date:** 2026-03-09
**Research:** docs/fix-undo-race-condition/research/research.md
**Ticket:** TKT-222 — Rapid Undo clicks corrupt game state: all players show stale round-history throws; subsequent throw attempt logs `activePlayerId: null`.

---

## Current State

The undo flow has an `isUndoInFlightRef` guard (`useRef<boolean>`) that is set synchronously inside `executeUndo` before the first `await`. The guard correctly prevents concurrent `executeUndo` executions. However, four distinct defects remain:

1. The guard is not reflected in the UI — `isUndoDisabled` does not account for an in-flight undo, so the Undo button appears enabled during execution, encouraging rapid clicks.
2. `executeUndo` does not validate the server response before writing it to the store. If `undoLastThrow` returns a state with `activePlayerId: null` (server-side edge case triggered by sequential undos exhausting throw history), the corrupted value is stored verbatim.
3. `executeUndo` has no error recovery path — if the API call fails, the optimistic undo state remains in the store without being rolled back.
4. `applyOptimisticUndo` correctly returns `null` when the active player has no current-round throws, but the fallback display in `playerThrowsDisplay.logic.ts` then shows the previous **completed** round's throws for the active player — identical to all other players' fallback — creating visual confusion where every player appears to show 3 completed throws simultaneously.

---

## Problem Statement

**P-001 (State corruption):** When sequential undo requests drain the game's entire throw history, the server returns a `GameThrowsResponse` with `activePlayerId: null`. `executeUndo` calls `setGameData(updatedGameState)` without validating `activePlayerId`, writing `null` to the store. The next `handleThrow` call reads `$gameData.get().activePlayerId === null`, cannot find the active player, and logs the error seen in the ticket.

**P-002 (Missing error recovery):** On `undoLastThrow` failure, the `catch` block only logs the error and plays a sound. The optimistic undo state (already written to `$gameData` before the API call) is never rolled back. The user sees a score that has been decremented but the server never confirmed the undo.

**P-003 (Button not disabled during undo):** `isUndoDisabled` (computed in `buildGamePlayersDerivedState`) does not include the in-flight undo state. The Undo button remains visually enabled while `isUndoInFlightRef.current === true`, inviting the user to click repeatedly. While the ref guard blocks duplicate API calls, the enabled button is misleading.

**P-004 (Active-player fallback display):** `playerThrowsDisplay.logic.ts` applies the same fallback (last `roundHistory` entry) for both inactive and active players when `currentRoundThrows` is empty. After an undo that brings the active player back to 0 current-round throws, all players show identical round-history throws, making the UI look corrupted even when the underlying `$gameData` is technically valid.

---

## Proposed Solution

Four targeted fixes — each scoped to a single concern, no new abstractions introduced:

### Fix 1 — Validate server response in `executeUndo`

Inside `executeUndo`, after `await undoLastThrow(gameId)` returns, validate that `updatedGameState.activePlayerId` is a finite number before calling `setGameData`. If invalid, call `reconcileGameState` (already available via `useThrowReconciliation`) to fetch a fresh server state, then log a typed error. Do NOT write the corrupt state.

### Fix 2 — Roll back optimistic state on undo failure

In `executeUndo`'s `catch` block, call `reconcileGameState` so the store is restored to a valid server snapshot. This matches the existing pattern used in `drainQueue`'s error path.

### Fix 3 — Expose in-flight undo state; include in `isUndoDisabled`

Add `isUndoPending: boolean` (React `useState`) to `useUndoFlow`. Return it from `useThrowHandler`. Thread it into `buildGamePlayersDerivedState` as an additional `isUndoPending` parameter so `isUndoDisabled` is `true` while the undo is in-flight.

### Fix 4 — Do not show round-history fallback for the active player

In `playerThrowsDisplay.logic.ts`, when the player is the active player (determined by `isActive: true`), return empty throw slots instead of the previous round's throws. Only apply the round-history fallback for **inactive** players.

---

## Key Decisions

### Decision 1: Validate server response inside `executeUndo` rather than in `setGameData`

**Choice:** Add validation logic to `executeUndo` (call site) rather than to the shared `setGameData` action.
**Rationale:** `setGameData` is a shared action in `shared/store/game-state.ts`. Adding undo-specific validation there would couple the store to undo semantics. The call site (`executeUndo`) already has full context (game ID, reconciliation function) and can take corrective action. Research confirms `setGameData` currently only normalizes `winnerId` — undo-specific validation belongs at the page layer.
**Alternative considered:** Add null check in `normalizeGameData` in the store — rejected because `normalizeGameData` has no access to `reconcileGameState`, cannot perform async recovery, and is a shared utility that should remain domain-agnostic.

### Decision 2: Use existing `reconcileGameState` for error recovery

**Choice:** Reuse `useThrowReconciliation.reconcileGameState` in the undo error path.
**Rationale:** `reconcileGameState` already calls `getGameThrows(gameId)` (full state, not conditional) and writes the server snapshot to the store. This matches the pattern in `drainQueue`'s error path (research confirmed). No new abstraction needed.
**Alternative considered:** Re-apply `$gameData.get()` snapshot captured before the optimistic undo — rejected because the snapshot would be stale if other concurrent state changes occurred; server is the single source of truth.

### Decision 3: `isUndoPending` as `useState`, not derived from ref

**Choice:** Add `const [isUndoPending, setIsUndoPending] = useState(false)` to `useUndoFlow` alongside the existing `isUndoInFlightRef`.
**Rationale:** The ref does not trigger re-renders — the button cannot reactively disable without a state value. The state and ref serve different purposes: ref prevents execution (guard, sync); state drives UI (render, async). Research confirms this pattern is already in use in `useThrowQueue` (`pendingThrowCount` state + `pendingQueueRef` ref).
**Alternative considered:** Replace `isUndoInFlightRef` with state entirely — rejected because state updates are async-batched in React 18; the in-flight guard must be set synchronously before the first `await`, which requires a ref.

### Decision 4: Active player never falls back to round history for throw display

**Choice:** Modify `playerThrowsDisplay.logic.ts` to return empty throws for the active player when `currentRoundThrows` is empty, instead of falling back to `roundHistory`.
**Rationale:** The active player is in the process of throwing; their empty throw slots correctly represent "waiting for first throw of the turn". Showing their previous round is misleading. Inactive players should continue to show their last completed round as a reference.
**Alternative considered:** Add a dedicated UI message ("Player X's turn — no throws yet") — rejected as over-engineering; empty throw slots are the correct semantic representation.

---

## Impact on Existing Architecture

| File                                              | Change                                                                                                               | Reason      |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ----------- |
| `src/pages/GamePage/useUndoFlow.ts`               | Add `isUndoPending` state; add validation of `activePlayerId`; add `reconcileGameState` param; add recovery in catch | Fix 1, 2, 3 |
| `src/pages/GamePage/useThrowHandler.ts`           | Thread `reconcileGameState` into `useUndoFlow`; expose `isUndoPending` in return                                     | Fix 1, 2, 3 |
| `src/pages/GamePage/gamePlayersState.logic.ts`    | Add `isUndoPending` parameter to `BuildGamePlayersStateOptions`; include in `isUndoDisabled`                         | Fix 3       |
| `src/pages/GamePage/useGamePlayersState.ts`       | Pass `isUndoPending` into `buildGamePlayersDerivedState`                                                             | Fix 3       |
| `src/pages/GamePage/useGameLogic.ts`              | Extract `isUndoPending` from `useThrowHandler`; pass to `useGamePlayersState`                                        | Fix 3       |
| `src/pages/GamePage/playerThrowsDisplay.logic.ts` | Skip round-history fallback for active player                                                                        | Fix 4       |

**Public API changes:** `BuildGamePlayersStateOptions` gains an `isUndoPending: boolean` field; `UseUndoFlowReturn` gains `isUndoPending: boolean`; `UseThrowHandlerReturn` gains `isUndoPending: boolean`.

**Breaking changes:** NONE — all changes are additive or internal to the `GamePage` slice.

---

## Rejected Approaches

1. **Add debounce/throttle to the Undo button click** — rejected because debounce is a UX hack that masks the underlying state bug. It also conflicts with the requirement that "score should disappear immediately", which requires the optimistic update to fire on the first click without delay.

2. **Block the Undo API call if the active player has no current-round throws** — rejected because undo can legitimately cross turn boundaries (the server undoes the previous player's last throw). The client cannot determine from local state whether the server has throws to undo.

3. **Replace `isUndoInFlightRef` with a mutex/lock abstraction** — rejected because the existing ref-based guard is correct and does not have a race condition in the synchronous sense. Adding an abstraction layer would increase complexity without fixing the real bugs (server returning null, missing error recovery).

4. **Add AbortController to `executeUndo`** — deferred, not included in this fix. The undo API call doesn't have a meaningful abort use case (an undo mid-flight should complete even if the component unmounts, or the reconciliation will fix it). This can be addressed in a separate cleanup ticket.

---

## Open Questions — human must answer before Planning

- [ ] [Q-001] Should `isUndoPending = true` also block throw input (similar to `isUndoInFlightRef` already blocking throws in `handleThrow`)? Or should the button-disabled state be the only UI signal? The current code already blocks throws via `isUndoInFlightRef` — `isUndoPending` would be an additive visual-only signal.
- Answer: if we disable the button, the UI will show a delay for users. Is it possible to disable the button, but optimize it so that it is very fast and unnoticeable for the user?
- [ ] [Q-002] When `executeUndo` detects an invalid server response (`activePlayerId: null`), should it also display a user-visible sync message (similar to `"Game state changed in another session. Synced latest game state."` from `drainQueue`)? Or should it silently reconcile?
- Answer: this error shouldn't happen at all, we want to eliminate the error completely so that undo works stably.

---

## Testing Approach

- **Unit (useUndoFlow):** rapid sequential undo calls; invalid server response (null `activePlayerId`); error recovery via reconcileGameState on API failure.
- **Unit (playerThrowsDisplay.logic):** active player with empty `currentRoundThrows` shows empty slots, not round history.
- **Unit (gamePlayersState.logic):** `isUndoDisabled = true` when `isUndoPending = true`.
- **Integration (useThrowHandler):** isUndoPending returned and reflects in-flight state.
- **E2E (basic-throw.spec.ts):** extend test 1.6 to cover rapid undo without state corruption.

Details in `test-strategy.md`.

---

## Human Review Checklist

!! DO NOT PROCEED TO PLANNING UNTIL CHECKLIST COMPLETE !!

Architecture:

- [x] Layer boundaries respected (app → pages → shared) — all changes stay within `pages/GamePage/` or `shared/store/`
- [x] No raw DTOs passed to UI — validation added at executeUndo call site, not in components
- [x] Nanostores used only where genuinely needed — no new stores added
- [x] AbortController specified for all network calls — deferred for undo (Q in Open Questions); existing coverage unchanged
- [x] Effect cleanup specified — no new effects introduced

Data:

- [x] Domain types defined separately from DTOs — no new types needed
- [x] Mapper functions are pure — `playerThrowsDisplay.logic.ts` change is pure
- [x] All DTO→Domain mappings explicit — no new mappings

Errors:

- [x] All error paths documented in data-flow.md and sequence.md
- [x] User-facing error messages are safe — reconcileGameState handles user messaging
- [x] Error types are typed strings — reuses `isThrowNotAllowedConflict` pattern

Open Questions:

- [ ] Q-001: answered before planning
- [ ] Q-002: answered before planning

Decisions:

- [x] Every major decision has an ADR (see adr-001-validate-undo-response.md)
- [x] Every ADR references research fact IDs
- [x] Rejected alternatives documented
