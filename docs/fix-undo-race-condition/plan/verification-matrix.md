# Verification Matrix

| Phase | Title                                           | Files Changed                                                                                              | Required Checks                                               | Agent Pipeline                       |
| ----- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------ |
| 01    | Display Fix — Active Player Fallback            | `playerThrowsDisplay.logic.ts`, `playerThrowsDisplay.logic.test.tsx`                                       | typecheck, eslint, prettier, test (playerThrowsDisplay.logic) | coder → reviewer → security → tester |
| 02    | Core Undo Fixes — useUndoFlow + useThrowHandler | `useUndoFlow.ts`, `useThrowHandler.ts`, `useThrowHandler.test.ts`                                          | typecheck, eslint, prettier, test (useThrowHandler)           | coder → reviewer → security → tester |
| 03    | Thread isUndoPending to UI                      | `gamePlayersState.logic.ts`, `useGamePlayersState.ts`, `useGameLogic.ts`, `gamePlayersState.logic.test.ts` | typecheck, eslint, prettier, test (full suite)                | coder → reviewer → security → tester |

## Full Suite (run after Phase 03)

```
npm run typecheck
npm run eslint
npm run stylelint
npm run test
npx prettier --check .
npm run test:e2e
```

## Key Tests to Watch

| Test file                            | Phase | Risk                                                                                                 |
| ------------------------------------ | ----- | ---------------------------------------------------------------------------------------------------- |
| `playerThrowsDisplay.logic.test.tsx` | 01    | `shouldClearPrev` change may break existing assertions for active player with `roundsCountLength: 1` |
| `useThrowHandler.test.ts`            | 02    | Mock setup for `useUndoFlow` must include `reconcileGameState` option                                |
| `gamePlayersState.logic.test.ts`     | 03    | All existing fixtures must add `isUndoPending: false`                                                |
| `tests/game/basic-throw.spec.ts`     | 03    | E2E undo test (1.6, 1.7) must still pass                                                             |
