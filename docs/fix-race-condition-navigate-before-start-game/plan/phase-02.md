# Phase 02: Update Component — Disable Button While Starting

**Layer:** pages
**Depends on:** Phase 01 (hook must expose `starting: boolean`)
**Can be tested in isolation:** No — depends on Phase 01's `starting` return value

## Goal

Destructure `starting` from `useGameSummaryPage()` in `GameSummaryPage/index.tsx` and pass it as `disabled` to the "Play Again" `<Button>`.

## Files to MODIFY

### `src/pages/GameSummaryPage/index.tsx`

**Confirmed at:** `src/pages/GameSummaryPage/index.tsx` (direct read)
**Button `disabled` prop confirmed at:** `src/shared/ui/button/Button.tsx:16,69`

Changes:

1. **MODIFY destructure** (currently line 13–22): add `starting` to destructured fields:

   ```
   const {
     error,
     starting,       ← ADD
     podiumData,
     newList,
     leaderBoardList,
     loadSummary,
     handleUndo,
     handlePlayAgain,
     handleBackToStart,
   } = useGameSummaryPage();
   ```

2. **MODIFY "Play Again" `<Button>`** (currently lines 61–67): add `disabled={starting}`:
   ```
   <Button
     label="Play Again"
     type="primary"
     isInverted
     className={styles.summaryActionButton}
     disabled={starting}     ← ADD
     handleClick={handlePlayAgain}
   />
   ```

DO NOT CHANGE:

- "Back To Start" `<Button>` — `handleBackToStart` has no in-flight risk, no `disabled` prop needed
- Undo button (`<button>` element, lines 30–41) — unaffected
- `$gameSettings` store usage (lines 24–25) — untouched
- CSS, Podium, OverviewPlayerItemList, ErrorState — untouched

---

### `src/pages/GameSummaryPage/GameSummaryPage.test.tsx`

**Confirmed at:** `src/pages/GameSummaryPage/GameSummaryPage.test.tsx` (confirmed by research)

Changes:

1. **ADD test:** `"disables Play Again button while startGame is pending"`
   - Mock `useGameSummaryPage` to return `{ ...defaults, starting: true }`
   - Assert `getByRole("button", { name: "Play Again" })` has `disabled` attribute or `toBeDisabled()`

2. **ADD test:** `"enables Play Again button when not starting"`
   - Mock `useGameSummaryPage` to return `{ ...defaults, starting: false }`
   - Assert "Play Again" button is NOT disabled

## Tests for This Phase

| Test case                                                 | Condition         | Expected output                 | Mocks needed                                          |
| --------------------------------------------------------- | ----------------- | ------------------------------- | ----------------------------------------------------- |
| `"disables Play Again button while startGame is pending"` | `starting: true`  | button has `disabled` attribute | `useGameSummaryPage` mock returning `starting: true`  |
| `"enables Play Again button when not starting"`           | `starting: false` | button not disabled             | `useGameSummaryPage` mock returning `starting: false` |

## Verification Commands

1. `npm run typecheck`
2. `npm run eslint`
3. `npm run test -- --reporter=verbose src/pages/GameSummaryPage/`
4. `npx prettier --check src/pages/GameSummaryPage/index.tsx`

## Done Criteria

- [ ] All verification commands pass
- [ ] "Play Again" button is disabled (`disabled` attribute) when `starting === true`
- [ ] "Back To Start" button remains unaffected
- [ ] 2 new component tests written and passing
- [ ] Only `index.tsx` and `GameSummaryPage.test.tsx` changed in this phase

## Human Review Checkpoint

- [ ] `disabled={starting}` passed only to "Play Again" button?
- [ ] "Back To Start" button unchanged?
- [ ] `Button` component `disabled` prop confirmed to work (confirmed: `Button.tsx:16,69`)?
- [ ] Component tests mock `useGameSummaryPage`, not internal hook details?
