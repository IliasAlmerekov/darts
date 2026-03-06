# Implementation Plan: Wake Lock API

**Date:** 2026-03-06

**Design:** Skipped by explicit human instruction. Planning relies on `docs/wake-lock-api/research/research.md` as the primary input artifact, per `.codex/WORKFLOW.md`.

**Research:** `docs/wake-lock-api/research/research.md`

## Summary

This plan adds a page-scoped wake-lock hook for active games and integrates it into the existing `GamePage` orchestration without widening the feature surface beyond `src/pages/GamePage/`. The work is split into three phases: first implement and test `useWakeLock` against the browser API boundary, then wire the hook into `useGameLogic` with focused integration coverage for the active-game condition, and finally run the full repository validation suite as the release gate.

## Phase Overview

| #   | Phase name                                             | Layer            | New files | Modified files | Complexity |
| --- | ------------------------------------------------------ | ---------------- | --------- | -------------- | ---------- |
| 01  | Wake lock hook implementation + browser-API tests      | `pages/GamePage` | 2         | 0              | Medium     |
| 02  | Game logic integration + active-state regression tests | `pages/GamePage` | 1         | 1              | Medium     |
| 03  | Full validation gate                                   | verification     | 0         | 0              | Low        |

## Dependency Order

1. Phase 01 must complete before any `useGameLogic` wiring starts, because Phase 02 depends on the final hook contract.
2. Phase 02 must complete before Phase 03, because the final validation gate must verify the fully integrated behavior rather than an isolated hook only.
3. Phase 03 is the final approval gate and must run the repository-level commands required by `AGENTS.md`, `CLAUDE.md`, and `.codex/WORKFLOW.md`.

## Conventions Confirmed from Research

- Page-specific hooks are co-located under `src/pages/GamePage/` and referenced with relative imports, so the new hook must stay in that slice and be imported as `./useWakeLock`.
- `useGameLogic` already aggregates side-effect hooks such as `useGameSounds(gameData)`, making it the correct integration point for `useWakeLock`.
- `GameThrowsResponse.status` is typed as `string`, and existing `GamePage` logic already compares literal values such as `"finished"`, so the active-game condition should use the same literal-value pattern.
- Effect cleanup is mandatory across the project, which means the new hook must always release any held wake-lock sentinel during cleanup.
- The ticket and research explicitly allow silent failure for unsupported or rejected wake-lock requests, so the new hook must not surface user-facing errors for `navigator.wakeLock` failures.
- Existing hook tests use `renderHook`, `waitFor`, explicit deferred promises, and browser API mocking at the boundary, so the wake-lock coverage should follow the same deterministic pattern.

## Open Questions and Flags

- [Q-001] Should `useGameLogic` expose a named `isGameActive` value for readability even if it is only consumed once? Current plan assumes yes, because the ticket explicitly calls for that variable and it makes the wake-lock trigger easier to review.
- [Q-002] Should the integration test live in `useGameLogic.test.ts` or in a dedicated jsdom test file? Current plan assumes a dedicated jsdom-focused test file to avoid mixing node-only pure-function coverage with browser-hook coverage in one file.
- [Q-003] Should document visibility re-acquisition be covered now if the hook starts listening for `visibilitychange`? Current plan assumes yes only if the hook implementation needs that listener for reliable behavior; otherwise the hook should stay minimal and skip extra event subscriptions.

## Risks

- [R-001] The hook could acquire a wake lock and fail to release it on deactivation or unmount.
  **Mitigation:** Phase 01 includes deterministic cleanup tests and a rollback that removes both the hook and its tests together.
- [R-002] `useGameLogic` could request wake lock in lobby or finished states due to an incorrect active-game condition.
  **Mitigation:** Phase 02 adds focused integration coverage that asserts the boolean passed to `useWakeLock` for started vs. non-started game states.
- [R-003] Browser API mocking could become flaky if tests depend on real DOM timing or unsupported globals.
  **Mitigation:** keep tests boundary-mocked, avoid real timers unless the hook truly needs them, and use explicit mock sentinels.
- [R-004] Wake-lock support is browser-dependent, so unsupported environments could throw if feature detection is incomplete.
  **Mitigation:** Phase 01 treats `"wakeLock" in navigator` guarding as mandatory behavior and covers the unsupported path in tests.

## Scope Guardrails

- In scope:
  - `src/pages/GamePage/useWakeLock.ts`
  - `src/pages/GamePage/useWakeLock.test.ts`
  - `src/pages/GamePage/useGameLogic.ts`
  - `src/pages/GamePage/useGameLogic.wake-lock.test.tsx`
- Out of scope by default:
  - `src/pages/GamePage/index.tsx`
  - `src/shared/api/*`
  - store contracts in `src/store/*`
  - Playwright specs unless Phase 03 validation reveals a required follow-up
- Exception:
  - If implementation discovers that `useWakeLock` must rely on a shared helper for type safety, that helper may be added only inside `src/pages/GamePage/` and the plan must be updated before expanding further.

## Definition of Ready for Implementation

- Phase 01 isolates the browser-API boundary in one new hook and one new hook test file.
- Phase 02 limits production integration to `useGameLogic.ts` and one focused jsdom test file for wake-lock wiring.
- Each phase includes explicit rollback instructions and exact verification commands.
- Phase 03 includes the full validation suite required by the local workflow:
  - `npm run eslint`
  - `npm run stylelint`
  - `npm run test`
  - `npm run typecheck`
  - `npx prettier --check .`
  - `npm run test:e2e`
- No plan item requires changes outside `docs/wake-lock-api/` for artifacts or outside `src/pages/GamePage/` for production code.
