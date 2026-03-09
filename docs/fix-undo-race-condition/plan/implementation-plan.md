# Implementation Plan: Fix Undo Race Condition (Rapid Click)

**Date:** 2026-03-09
**Design:** docs/fix-undo-race-condition/design/design-summary.md
**Research:** docs/fix-undo-race-condition/research/research.md

---

## Summary

Three targeted phases address the four defects from TKT-222. Phase 01 fixes the display logic (P-004): the active player now always shows empty throw slots rather than falling back to the previous round's history. Phase 02 fixes the core undo hook (P-001, P-002): `useUndoFlow` receives `reconcileGameState`, validates the server response for a finite `activePlayerId`, and recovers from API failures by reconciling against the server. Phase 03 threads the new `isUndoPending` React state through the hook chain so `isUndoDisabled` is `true` while an undo is in-flight, disabling the button at the same render cycle as the optimistic score update (React 18 automatic batching ensures no visible delay — P-003).

No new files are created. All changes are confined to `src/pages/GamePage/`.

---

## Phase Overview

| #   | Phase name                                          | New files | Modified files                                                               | Complexity |
| --- | --------------------------------------------------- | --------- | ---------------------------------------------------------------------------- | ---------- |
| 01  | Display Fix — Active Player Fallback                | 0         | 1 (`playerThrowsDisplay.logic.ts`)                                           | Low        |
| 02  | Core Undo Fixes — `useUndoFlow` + `useThrowHandler` | 0         | 2 (`useUndoFlow.ts`, `useThrowHandler.ts`)                                   | Medium     |
| 03  | Thread `isUndoPending` to UI                        | 0         | 3 (`gamePlayersState.logic.ts`, `useGamePlayersState.ts`, `useGameLogic.ts`) | Low        |

---

## Dependency Order

- Phase 01 has no dependencies — can run first independently.
- Phase 02 depends on Phase 01 being merged (or can run in parallel since they touch different files).
- Phase 03 depends on Phase 02 (requires `isUndoPending` to exist in `UseThrowHandlerReturn`).

---

## Conventions Confirmed from Research

| Convention                                                                              | Confirmed at                                                                    |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Hooks: `use` prefix, `useCallback` for handlers, `useState`/`useRef` for state          | `src/pages/GamePage/useUndoFlow.ts`, `useThrowQueue.ts`                         |
| Pure functions: verb-first, no side effects, co-located `.logic.ts` files               | `src/pages/GamePage/playerThrowsDisplay.logic.ts`, `gamePlayersState.logic.ts`  |
| State + Ref dual pattern: `useState` for UI re-renders, `useRef` for synchronous guards | `src/pages/GamePage/useThrowQueue.ts` (`pendingThrowCount` + `pendingQueueRef`) |
| Error handling: no silent catch, `console.error` + recovery action                      | `src/pages/GamePage/useThrowQueue.ts` drain error path                          |
| `reconcileGameState` pattern: fetch full state, `setGameData`, set sync message         | `src/pages/GamePage/useThrowReconciliation.ts:49`                               |
| `buildGamePlayersDerivedState` options as typed interface                               | `src/pages/GamePage/gamePlayersState.logic.ts:9`                                |
| `useMemo` for derived state in hooks                                                    | `src/pages/GamePage/useGamePlayersState.ts:47`                                  |

---

## Q-001 Resolution: Button Disable with No Visible Delay

User concern: disabling the button during undo might feel sluggish.

Resolution applied in the plan: `setIsUndoPending(true)` and `setGameData(optimisticState)` are called in the same synchronous code block inside `executeUndo` (no `await` between them). React 18's automatic batching merges both state updates into a single render frame. The score updates AND the button disables in the same render — visually instantaneous, no perceptible delay.

## Q-002 Resolution: Silent Reconciliation on Invalid Server Response

User goal: eliminate the error at the root; validation is a defensive safety net only.

Resolution applied in the plan: when `activePlayerId` is not a finite number, `reconcileGameState` is called **without setting a `syncMessage`** (pass empty string internally, or simply skip `setSyncMessage` call — see Phase 02 spec). The user sees no error message; the store is restored to valid server state silently.

---

## Risks

- **[R-001]** `shouldClearPrev` change in Phase 01 might affect other display scenarios (e.g., bust recovery). Mitigation: run full existing `playerThrowsDisplay.logic.test.tsx` suite; add targeted tests for the changed path.
- **[R-002]** Adding `reconcileGameState` to `useUndoFlow`'s options changes the hook call site in `useThrowHandler`. If `useThrowHandler` is tested with a mocked `useUndoFlow`, mock setup must be updated. Mitigation: Phase 02 includes explicit test update instructions.
- **[R-003]** Adding `isUndoPending` to `BuildGamePlayersStateOptions` is a breaking change for all existing callers of `buildGamePlayersDerivedState`. The only caller is `useGamePlayersState.ts` — Phase 03 updates it. Existing `gamePlayersState.logic.test.ts` test fixtures must add `isUndoPending: false`. Mitigation: explicit instruction in Phase 03.
