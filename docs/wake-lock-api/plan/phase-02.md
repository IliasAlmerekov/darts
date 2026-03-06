# Phase 02: Game Logic Integration + Active-State Regression Tests

**Layer:** `pages/GamePage`

**Depends on:** Phase 01

**Can be tested in isolation:** Yes. This phase modifies one production file and adds one focused integration test file for the wake-lock wiring.

## Goal

Integrate the new wake-lock hook into `useGameLogic` so screen sleep prevention is active only while a game is in the `"started"` state, without changing the hook’s public return contract or unrelated game behaviors.

## Files to CREATE

### `src/pages/GamePage/useGameLogic.wake-lock.test.tsx`

Changes:

- ADD jsdom-focused coverage for `useGameLogic` wake-lock integration.
- MOCK page-level dependencies at the boundary:
  - `useGameState`
  - `useThrowHandler`
  - `useRoomStream`
  - `useGameSounds`
  - `useWakeLock`
  - router hooks as needed
- ASSERT that `useWakeLock` receives `true` when `gameData?.status === "started"`.
- ASSERT that `useWakeLock` receives `false` when:
  - `gameData` is `null`
  - `gameData.status` is `"lobby"`
  - `gameData.status` is `"finished"`
- KEEP the assertions focused on wiring, not on re-testing unrelated `useGameLogic` behavior already covered elsewhere.

## Files to MODIFY

### `src/pages/GamePage/useGameLogic.ts`

Changes:

- ADD `import { useWakeLock } from "./useWakeLock";` alongside the other local GamePage hooks.
- ADD a local `isGameActive` boolean derived from `gameData?.status === "started"`.
- CALL `useWakeLock(isGameActive)` near the existing side-effect hooks so the behavior is easy to review with `useGameSounds(gameData)`.
- KEEP the existing return shape from `useGameLogic` unchanged.
- DO NOT move other side effects, alter navigation logic, or expand into shared layers.

## Tests for This Phase

| Test case                                                           | Condition                                  | Expected output                                | Mocks needed                           |
| ------------------------------------------------------------------- | ------------------------------------------ | ---------------------------------------------- | -------------------------------------- |
| should enable wake lock when game status is `started`               | mocked `useGameState` returns started game | `useWakeLock(true)`                            | mocked page hooks, mocked router hooks |
| should disable wake lock when game data is missing                  | mocked `useGameState` returns `null`       | `useWakeLock(false)`                           | mocked page hooks, mocked router hooks |
| should disable wake lock when game status is not `started`          | status is `lobby` or `finished`            | `useWakeLock(false)`                           | mocked page hooks, mocked router hooks |
| should preserve existing public contract while adding wake-lock use | read the hook result shape                 | expected handlers and state fields still exist | mocked page hooks, mocked router hooks |

## Verification Commands

1. `npm run typecheck`
2. `npm run eslint`
3. `npm run test -- src/pages/GamePage/useWakeLock.test.ts src/pages/GamePage/useGameLogic.wake-lock.test.tsx src/pages/GamePage/useGameLogic.test.ts`
4. `npx prettier --check src/pages/GamePage/useGameLogic.ts src/pages/GamePage/useGameLogic.wake-lock.test.tsx`

Notes:

- `useGameLogic.test.ts` stays in the focused run because the integration must not break existing pure helper coverage.
- No `stylelint` in this phase because no CSS files are changed.
- No `test:e2e` in this phase; repository-level E2E remains part of Phase 03.

## Rollback Notes

- If this phase fails, revert the integration pair together:
  - `src/pages/GamePage/useGameLogic.ts`
  - `src/pages/GamePage/useGameLogic.wake-lock.test.tsx`
- Do not leave `useWakeLock` imported but unused or partially wired.
- If the integration test reveals that `useGameLogic` needs broader refactoring, stop and reopen planning instead of widening scope mid-phase.

## Done Criteria

- [ ] `useGameLogic` imports and calls `useWakeLock`
- [ ] `isGameActive` is derived from the existing game status source
- [ ] Wake lock is enabled only for `"started"` games
- [ ] `useGameLogic` public return contract remains unchanged
- [ ] Focused integration coverage is passing
- [ ] No out-of-scope production files are modified

## Human Review Checkpoint

- [ ] Wake-lock wiring is easy to identify in `useGameLogic.ts`
- [ ] The started-game condition uses existing status semantics rather than a new domain abstraction
- [ ] Integration tests verify only wiring and contract stability
- [ ] Scope stayed inside `src/pages/GamePage/`
