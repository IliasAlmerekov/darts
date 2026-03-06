# Phase 03: Full Validation Gate

**Layer:** verification

**Depends on:** Phase 01 and Phase 02

**Can be tested in isolation:** Yes. This phase is verification-only and does not plan further production changes.

## Goal

Confirm that the new wake-lock behavior is safe in the repository context and that no lint, type, unit, formatting, or critical-flow regressions were introduced.

## Files to CREATE

None.

## Files to MODIFY

None planned.

## Verification Focus

Primary validation targets:

- `src/pages/GamePage/useWakeLock.ts`
- `src/pages/GamePage/useWakeLock.test.ts`
- `src/pages/GamePage/useGameLogic.ts`
- `src/pages/GamePage/useGameLogic.wake-lock.test.tsx`
- existing `GamePage` and joined-game flow tests that run through the full suite

## Tests for This Phase

| Test case                                                               | Condition                                | Expected output                                         | Mocks needed              |
| ----------------------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------- | ------------------------- |
| should keep GamePage test coverage green after wake-lock integration    | run the repo unit/integration suite      | no new failures in existing `GamePage` test files       | existing suite mocks only |
| should keep critical joined-game flow green after wake-lock integration | run the Playwright suite                 | no regression in join/start/throw/finish user flows     | existing E2E setup only   |
| should keep repository quality gates green                              | run required validation commands in full | no new lint, type, formatting, unit, or E2E regressions | none                      |

## Verification Commands

1. `npm run eslint`
2. `npm run stylelint`
3. `npm run test`
4. `npm run typecheck`
5. `npx prettier --check .`
6. `npm run test:e2e`

## Rollback Notes

- If any repository-level check fails because of the wake-lock change, restore the implementation to the last approved state as a unit:
  - `src/pages/GamePage/useWakeLock.ts`
  - `src/pages/GamePage/useWakeLock.test.ts`
  - `src/pages/GamePage/useGameLogic.ts`
  - `src/pages/GamePage/useGameLogic.wake-lock.test.tsx`
- Do not fix unrelated repository failures in this ticket unless human review explicitly expands scope.
- If `test:e2e` fails due to a pre-existing unrelated issue, record it as a blocker in the later implementation artifact rather than patching outside scope.

## Done Criteria

- [ ] All mandatory validation commands pass, or unrelated blockers are explicitly documented during implementation
- [ ] Existing `GamePage` and critical-flow coverage remains green
- [ ] No out-of-scope production files are changed in the verification phase
- [ ] The ticket is ready for Phase 4 implementation approval

## Human Review Checkpoint

- [ ] Full repository validation is treated as the final gate
- [ ] Rollback restores the wake-lock feature as a single coherent unit
- [ ] No hidden scope expansion occurred during verification
