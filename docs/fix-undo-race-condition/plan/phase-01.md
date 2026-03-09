# Phase 01: Display Fix — Active Player Fallback

**Layer:** pages/GamePage (pure logic)
**Depends on:** none
**Can be tested in isolation:** Yes — pure function, no side effects

---

## Goal

Fix `getPlayerThrowsDisplay` so the active player never falls back to the previous round's throw history when `currentRoundThrows` is empty. Empty throw slots are shown instead.

---

## Files to MODIFY

### `src/pages/GamePage/playerThrowsDisplay.logic.ts`

**Confirmed at:** research.md — Related Components section; file read at line 49

**Current behavior (bug):**

```typescript
const shouldClearPrev = isActive && roundsCountLength > 1;
```

When `isActive = true` AND `roundsCountLength = 1` (player completed exactly one round), `shouldClearPrev` is `false`. The function falls back to `prevThrow1 / prevThrow2 / prevThrow3` for the active player, showing their last completed round — identical to all inactive players' fallback. This creates visual confusion.

**Change:**

```typescript
// BEFORE
const shouldClearPrev = isActive && roundsCountLength > 1;

// AFTER
const shouldClearPrev = isActive;
```

**Logic:** The active player is currently throwing. Showing their previous round's scores is always misleading, regardless of how many rounds they have completed. Empty slots correctly convey "waiting for first throw of the turn". Inactive players are unaffected — `isActive = false` means `shouldClearPrev = false` for them.

**DO NOT CHANGE:**

- `PlayerThrowsDisplayOptions` interface — no fields added or removed
- `PlayerThrowsDisplay` interface — no fields added or removed
- `getPlayerThrowsDisplay` function signature — unchanged
- All bust icon rendering logic (lines 80-93) — unchanged
- All `selectedThrowXIsBust` computation logic (lines 69-74) — unchanged
- Export list — unchanged

---

## Tests for This Phase

**Test file:** `src/pages/GamePage/playerThrowsDisplay.logic.test.tsx`

Update existing tests and add new ones:

| Test case                                                                        | Condition                                                                                                                 | Expected output                                                                                                           |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| should show empty slots for active player with no current throws when in round 2 | `isActive: true`, `roundsCountLength: 1`, `currentThrow1-3: undefined`, `prevThrow1: 20`                                  | `throw1: undefined`, `throw2: undefined`, `throw3: undefined`                                                             |
| should show empty slots for active player with no current throws when in round 1 | `isActive: true`, `roundsCountLength: 0`, `currentThrow1-3: undefined`, `prevThrow1: 20`                                  | `throw1: undefined` (unchanged from current behavior since round 0 never had `shouldClearPrev = true` either, but verify) |
| should still show current throws for active player when throws exist             | `isActive: true`, `roundsCountLength: 1`, `currentThrow1: 20, currentThrow2: undefined`                                   | `throw1: 20`, `throw2: undefined`                                                                                         |
| should still show prev round fallback for inactive player with no current throws | `isActive: false`, `roundsCountLength: 1`, `currentThrow1-3: undefined`, `prevThrow1: 25, prevThrow2: 25, prevThrow3: 25` | `throw1: 25`, `throw2: 25`, `throw3: 25`                                                                                  |
| should show prev round fallback for inactive player in round 3                   | `isActive: false`, `roundsCountLength: 2`, `currentThrow1-3: undefined`, `prevThrow1: 10`                                 | `throw1: 10` (unchanged)                                                                                                  |

**Existing tests that must still pass:**

- All existing `playerThrowsDisplay.logic.test.tsx` tests. Inspect each: any test that had `isActive: true` and `roundsCountLength <= 1` with `prevThrow` values may need to update expected output from `prevThrowX` to `undefined`.

---

## Verification Commands

1. `npm run typecheck`
2. `npm run eslint`
3. `npm run test -- playerThrowsDisplay.logic`
4. `npx prettier --check .`

---

## Done Criteria

- [ ] `shouldClearPrev = isActive` (single-token change) in `playerThrowsDisplay.logic.ts`
- [ ] All new tests above written and passing
- [ ] All pre-existing `playerThrowsDisplay.logic.test.tsx` tests updated and passing
- [ ] `usePlayerThrowsDisplay.test.tsx` still passes (hook is a thin `useMemo` wrapper — no change needed there)
- [ ] `npm run typecheck` passes with no new errors
- [ ] Only `playerThrowsDisplay.logic.ts` and its test file changed

---

## Human Review Checkpoint

Before proceeding to Phase 02:

- [ ] The one-line change is `shouldClearPrev = isActive` with no other logic touched?
- [ ] Bust icon rendering (lines 80-93) is untouched?
- [ ] Inactive player fallback behavior is verified unchanged by tests?
