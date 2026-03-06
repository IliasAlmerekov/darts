# Phase 01: Fix Hook — Await startGame Before Navigate

**Layer:** hooks (pages)
**Depends on:** none
**Can be tested in isolation:** Yes — hook is testable via `renderHook`

## Goal

Modify `handlePlayAgain()` in `useGameSummaryPage.ts` to await `startGame()` before calling `navigate()`, add `starting` boolean state + in-flight ref to guard against concurrent calls, and expose `starting` in the hook return value.

## Files to MODIFY

### `src/pages/GameSummaryPage/useGameSummaryPage.ts`

**Confirmed at:** `src/pages/GameSummaryPage/useGameSummaryPage.ts` (research.md + direct read)

Changes:

1. **ADD import:** `useRef` from `"react"` (already imports `useCallback, useEffect, useMemo, useState` — add `useRef`)

2. **ADD local state** inside `useGameSummaryPage()` body:

   ```
   const [starting, setStarting] = useState<boolean>(false);
   const startGameInFlightRef = useRef<boolean>(false);
   ```

   Pattern source: `useStartPage.ts:91,128` — identical guard pattern confirmed in research.

3. **MODIFY `handlePlayAgain`** (currently lines 109–145):

   Replace the fire-and-forget `void startGame(...).catch(...)` + preceding `navigate(...)` block with:
   - Guard at top: `if (starting || startGameInFlightRef.current) return;`
   - Set `startGameInFlightRef.current = true` and `setStarting(true)` before the try block
   - Inside the existing `try` block, after `setInvitation(...)` and the `startScore/doubleOut/tripleOut` variable reads:
     - `await startGame(rematch.gameId, { startScore: startScoreValue, doubleOut, tripleOut, round: 1, status: "started" })`
     - `navigate(ROUTES.game(rematch.gameId))` — AFTER the await
   - Remove the `// Navigate immediately...` comment and the entire `void startGame(...).catch(...)` block (lines 128–140)
   - Add `finally` block: `startGameInFlightRef.current = false; setStarting(false);`

   Resulting call sequence in `handlePlayAgain`:

   ```
   guard (starting || inFlightRef) → return
   setStarting(true) + inFlightRef = true
   try {
     createRematch(...)        ← awaited (unchanged)
     setInvitation(...)        ← unchanged
     resolve startScore/doubleOut/tripleOut  ← unchanged
     await startGame(...)      ← NEW: was void fire-and-forget
     navigate(...)             ← MOVED: now after startGame
   } catch { toUserErrorMessage + setError + console.error }
   finally { setStarting(false) + inFlightRef = false }
   ```

4. **MODIFY return object** (line 170–179): add `starting` field:
   ```
   return {
     error,
     starting,       ← NEW
     podiumData,
     newList,
     leaderBoardList,
     loadSummary,
     handleUndo,
     handlePlayAgain,
     handleBackToStart,
   };
   ```

DO NOT CHANGE:

- `loadSummary`, `handleUndo`, `handleBackToStart` — untouched
- `finishedGameIdFromRoute` memo, `newList` memo, `podiumData` derivation — untouched
- All imports except adding `useRef`

---

### `src/pages/GameSummaryPage/useGameSummaryPage.test.ts`

**Confirmed at:** `src/pages/GameSummaryPage/useGameSummaryPage.test.ts` (direct read)

Changes:

1. **MODIFY existing test** `"starts rematch game immediately and navigates to game route"` (line 108):
   - Rename to: `"navigates to game route after startGame resolves"`
   - Test body: no functional change needed (synchronous mocks still pass), but optionally verify call order via `expect(startGameMock).toHaveBeenCalledWith(...)` before `expect(navigateMock).toHaveBeenCalledWith(...)`

2. **ADD test:** `"does not navigate when startGame fails"`
   - `startGameMock.mockRejectedValueOnce(new Error("server error"))`
   - Call `handlePlayAgain()`
   - Assert `navigateMock` NOT called
   - Assert `result.current.error` is a non-null string

3. **ADD test:** `"prevents concurrent handlePlayAgain calls while starting"`
   - Use a deferred promise for `startGameMock` (create a `{ resolve, promise }` pair — pattern from `useStartPage.actions.test.ts`)
   - Call `handlePlayAgain()` twice before the first resolves
   - Resolve the deferred
   - Assert `createRematchMock` called once, `startGameMock` called once
   - Pattern source: `useStartPage.actions.test.ts` — deferred utility confirmed

4. **ADD test:** `"navigate is called after startGame resolves, not before"`
   - Use a deferred promise for `startGameMock`
   - Start `handlePlayAgain()` without awaiting
   - Assert `navigateMock` NOT called yet
   - Resolve the deferred
   - Flush async queue (wrap in `act`)
   - Assert `navigateMock` called once with `"/game/77"`

5. **ADD test:** `"starting flag is true while startGame is pending and false after"`
   - Use a deferred promise for `startGameMock`
   - Before resolving: assert `result.current.starting === true`
   - After resolving: assert `result.current.starting === false`

DO NOT CHANGE:

- `"undoes last throw and navigates back to game route"` (line 74)
- `"does not navigate when undo fails"` (line 94)
- `"does not navigate when rematch response misses game id"` (line 126)
- All `vi.mock(...)` setup blocks at the top of the file

## Tests for This Phase

| Test case                                                    | Condition                   | Expected output                                         | Mocks needed                                      |
| ------------------------------------------------------------ | --------------------------- | ------------------------------------------------------- | ------------------------------------------------- |
| `"navigates to game route after startGame resolves"`         | happy path                  | `navigateMock("/game/77")` called after `startGameMock` | `createRematchMock`, `startGameMock` resolve sync |
| `"does not navigate when startGame fails"`                   | `startGameMock` rejects     | `navigateMock` not called; `error` set                  | `startGameMock.mockRejectedValueOnce`             |
| `"prevents concurrent handlePlayAgain calls while starting"` | called twice before resolve | `createRematchMock` called once                         | deferred `startGameMock`                          |
| `"navigate is called after startGame resolves, not before"`  | timing check                | navigate not called until startGame resolves            | deferred `startGameMock`                          |
| `"starting flag is true while pending and false after"`      | state lifecycle             | flag changes correctly                                  | deferred `startGameMock`                          |

## Verification Commands

1. `npm run typecheck`
2. `npm run eslint`
3. `npm run test -- --reporter=verbose src/pages/GameSummaryPage/`

## Done Criteria

- [ ] All verification commands pass
- [ ] 5 tests listed above written and passing (3 new + 1 modified + 1 renamed)
- [ ] `navigate()` is called only after `await startGame()` resolves successfully
- [ ] `starting` flag is `true` while request is in-flight, `false` otherwise
- [ ] Concurrent `handlePlayAgain` calls are no-ops after the first
- [ ] `startGame` failure sets `error` and does not navigate
- [ ] No raw DTOs passed beyond API boundary
- [ ] Only `useGameSummaryPage.ts` and `useGameSummaryPage.test.ts` changed

## Human Review Checkpoint

Before proceeding to Phase 02:

- [ ] Return type of `useGameSummaryPage` includes `starting: boolean`?
- [ ] `useRef<boolean>` pattern matches `useStartPage.ts:128`?
- [ ] `finally` block clears both `startGameInFlightRef.current` and `setStarting(false)`?
- [ ] Fire-and-forget `void` block fully removed (lines 128–140 of original)?
- [ ] All 5 tests pass including deferred-promise ordering tests?
