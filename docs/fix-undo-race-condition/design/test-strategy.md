# Test Strategy

## Unit Tests

### `useUndoFlow` — new test cases

| Scenario                                  | Input                                                    | Expected                                                             | Mocks needed                                       |
| ----------------------------------------- | -------------------------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------- |
| `isUndoPending` is false initially        | hook rendered                                            | `isUndoPending = false`                                              | none                                               |
| `isUndoPending` becomes true during undo  | `executeUndo()` called, API not yet resolved             | `isUndoPending = true` while awaiting                                | `undoLastThrow` deferred                           |
| `isUndoPending` resets after undo success | `executeUndo()` resolves                                 | `isUndoPending = false` after resolve                                | `undoLastThrow` mock resolves                      |
| `isUndoPending` resets after undo failure | `executeUndo()` rejects                                  | `isUndoPending = false` in finally                                   | `undoLastThrow` mock rejects                       |
| Server returns `activePlayerId: null`     | `undoLastThrow` resolves with `{ activePlayerId: null }` | `reconcileGameState` called; `setGameData` NOT called with bad state | `undoLastThrow`, `reconcileGameState` mocks        |
| Server returns `activePlayerId: NaN`      | `undoLastThrow` resolves with `{ activePlayerId: NaN }`  | same as above                                                        | same                                               |
| API failure triggers reconcile            | `undoLastThrow` rejects                                  | `reconcileGameState` called; store restored                          | `undoLastThrow` rejects; `reconcileGameState` mock |
| Guard prevents second concurrent undo     | two simultaneous `executeUndo()` calls                   | second returns early, first completes normally                       | deferred `undoLastThrow`                           |

### `gamePlayersState.logic` — `isUndoDisabled` with `isUndoPending`

| Scenario                                                  | Input                                                       | Expected                 |
| --------------------------------------------------------- | ----------------------------------------------------------- | ------------------------ |
| should disable undo when undo is pending                  | `isUndoPending: true`, game has throws                      | `isUndoDisabled = true`  |
| should enable undo when undo not pending and throws exist | `isUndoPending: false`, game has throws, not at start score | `isUndoDisabled = false` |
| should disable undo when pending AND at start score       | `isUndoPending: true`, `areAllPlayersAtStartScore = true`   | `isUndoDisabled = true`  |

### `playerThrowsDisplay.logic` — active player fallback

| Scenario                                                                            | Input                                                                                   | Expected                                  |
| ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ----------------------------------------- |
| should show empty slots for active player with no current throws                    | `isActive: true`, `currentRoundThrows: []`, `roundHistory: [{ throws: [25, 25, 25] }]`  | three empty throw slots, NOT [25, 25, 25] |
| should still show round history fallback for inactive player with no current throws | `isActive: false`, `currentRoundThrows: []`, `roundHistory: [{ throws: [25, 25, 25] }]` | [25, 25, 25] (unchanged behavior)         |
| should show current throws for active player when throws exist                      | `isActive: true`, `currentRoundThrows: [{ value: 20 }]`                                 | [20, empty, empty]                        |

### `useThrowHandler` — integration of `isUndoPending`

| Scenario                                                         | Expected                                                                  |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------- |
| should expose `isUndoPending` from `useUndoFlow` in return value | `isUndoPending` present in return; reflects state from `useUndoFlow`      |
| should pass `reconcileGameState` to `useUndoFlow`                | `useUndoFlow` receives `reconcileGameState` from `useThrowReconciliation` |

---

## Integration Tests

| Component             | Scenario                                     | Setup                                                   | Expected                                                     |
| --------------------- | -------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------ |
| `useThrowHandler`     | undo in flight blocks second undo            | deferred `undoLastThrow`, user calls `handleUndo` twice | second call is no-op; `undoLastThrow` called once            |
| `useThrowHandler`     | undo cleans up after invalid server response | `undoLastThrow` returns `{ activePlayerId: null }`      | `reconcileGameState` called; store reflects reconciled state |
| `useGamePlayersState` | `isUndoDisabled` true when `isUndoPending`   | render with `isUndoPending: true`                       | `isUndoDisabled = true` in derived state                     |

---

## E2E Tests (Playwright)

Extend `tests/game/basic-throw.spec.ts` test 1.6 (undo last throw within turn):

| Journey                               | Steps                                                                      | Expected                                                                                                     |
| ------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Rapid undo — no corruption            | player throws once; user clicks Undo rapidly (twice in < 100ms)            | API called once; score restores correctly; no "activePlayerId: null" error; `handleThrow` succeeds afterward |
| Undo button disabled during in-flight | player throws once; user clicks Undo; before response, verify button state | Undo button has `disabled` attribute while API pending                                                       |
| Undo button re-enables after response | undo completes                                                             | Undo button is re-enabled                                                                                    |

---

## Mocking Rules

- Mock `undoLastThrow` (external API boundary) — `vi.mocked(undoLastThrow)`
- Mock `reconcileGameState` where it is a parameter (passed into `useUndoFlow`) — use `vi.fn()`
- Mock `$gameData.get()` / `setGameData` as needed for state setup
- NEVER mock `applyOptimisticUndo` — pure function, test with real logic
- NEVER mock `buildGamePlayersDerivedState` — pure function, test with real logic
- NEVER mock `getPlayerThrowsDisplay` — pure function, test with real logic
- Reset all mocks in `beforeEach`

---

## Existing Tests — Must Not Break

| Test file                            | Risk                                                                           | Mitigation                                                                                   |
| ------------------------------------ | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| `useThrowHandler.test.ts`            | New `isUndoPending` in return; new `reconcileGameState` param in `useUndoFlow` | Update mock setup; add `isUndoPending` to assertions where relevant                          |
| `gamePlayersState.logic.test.ts`     | New `isUndoPending` param in `BuildGamePlayersStateOptions`                    | Pass `isUndoPending: false` in all existing test cases                                       |
| `playerThrowsDisplay.logic.test.tsx` | Active player fallback behavior changed                                        | Update existing tests that expected fallback for active player; add new test for empty slots |
| `throwStateService.test.ts`          | Not affected                                                                   | No changes to `throwStateService.ts`                                                         |
| `tests/game/basic-throw.spec.ts`     | E2E undo test (1.6, 1.7)                                                       | Run existing tests; add rapid-undo test scenario                                             |
