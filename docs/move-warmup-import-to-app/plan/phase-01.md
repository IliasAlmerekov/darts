# Phase 01: Remove Duplicate Warmup Effect

**Layer:** pages/GamePage
**Depends on:** none
**Can be tested in isolation:** Yes

## Goal

Delete the `useEffect` block at `useGameLogic.ts:88–91` that duplicates the
`GameSummaryPage` warmup already present in `App.tsx:33`.

## Files to CREATE

None.

## Files to MODIFY

### src/pages/GamePage/useGameLogic.ts

**Confirmed at:** research.md — lines 88–91 of useGameLogic.ts

Changes:

- DELETE the following block in its entirety (lines 88–91):

```ts
useEffect(() => {
  // Warm up summary route chunk to keep Game -> Summary navigation instant.
  void import("@/pages/GameSummaryPage");
}, []);
```

DO NOT CHANGE:

- Any other `useEffect` block in the file
- The hook's return value (all 29 properties)
- Helper functions: `areAllPlayersAtStartScore`, `shouldAutoFinishGame`, `shouldNavigateToSummary`
- All imports at the top of the file (none reference GameSummaryPage — confirmed)
- The `useEffect` at lines 73–86 (pointer/keyboard handler with cleanup)

## Files to MODIFY — App.tsx

None. `GameSummaryPage` is already at `App.tsx:33`. Do NOT touch `App.tsx`.

## Tests for This Phase

Test file: `src/pages/GamePage/useGameLogic.test.ts` (existing)

The existing test file covers only pure helper functions — none test the warmup `useEffect`.
No test additions are required for this deletion because:

- Dynamic import side effects are not unit-testable without mocking the module system
- The App.tsx warmup is similarly untested (confirmed in research)
- The deletion removes behavior duplicated elsewhere — correctness is structural, not behavioral

| Test case               | Condition                        | Expected output                | Mocks needed |
| ----------------------- | -------------------------------- | ------------------------------ | ------------ |
| (no new tests required) | removal of side-effect-only code | verified by typecheck + eslint | —            |

## Verification Commands

1. `npm run typecheck`
2. `npm run eslint`
3. `npm run test`
4. `npx prettier --check .`

Do NOT run `npm run test:e2e` — no user journey is affected by this refactor.

## Done Criteria

- [ ] `useEffect` block at original lines 88–91 is removed from `useGameLogic.ts`
- [ ] No changes made to `App.tsx`
- [ ] All verification commands pass
- [ ] Only `useGameLogic.ts` is modified

## Human Review Checkpoint

Before closing:

- [ ] Confirm `App.tsx:33` still contains `void import("@/pages/GameSummaryPage")`
- [ ] Confirm no other file in `src/pages/GamePage/` imports or re-exports the warmup logic
- [ ] File diff shows only a deletion (no additions)
