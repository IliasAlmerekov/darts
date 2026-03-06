# Implementation Plan: Fix Race Condition — Navigate Before startGame Completes

**Date:** 2026-03-06
**Design:** docs/fix-race-condition-navigate-before-start-game/design/design-summary.md
**Research:** docs/fix-race-condition-navigate-before-start-game/research/research.md

## Summary

`handlePlayAgain()` in `useGameSummaryPage.ts` currently navigates to `/game/{id}` before `startGame()` resolves, leaving the game in `lobby` status when `GamePage` mounts. The fix awaits `startGame()` before calling `navigate()`, adds a `starting` boolean state and an in-flight ref to prevent concurrent calls (matching the proven pattern from `useStartPage.ts:315–342`), and exposes `starting` so the component can disable the "Play Again" button during the request. Scope is exactly two files modified — hook and component — plus their co-located tests.

## Phase Overview

| #   | Phase name                                       | Layer | New files | Modified files                           | Complexity |
| --- | ------------------------------------------------ | ----- | --------- | ---------------------------------------- | ---------- |
| 01  | Fix Hook — Await startGame Before Navigate       | hooks | 0         | 2 (`useGameSummaryPage.ts` + `.test.ts`) | Low        |
| 02  | Update Component — Disable Button While Starting | pages | 0         | 1 (`index.tsx`)                          | Low        |

## Dependency Order

Phase 01 must complete before Phase 02 (component consumes `starting` from hook).

## Conventions Confirmed from Research

- Hook pattern: `useXxx`, functional, explicit return type — confirmed: `useGameSummaryPage.ts`
- In-flight guard: `useRef<boolean>` + `useState<boolean>` for concurrent-call prevention — confirmed: `src/pages/StartPage/useStartPage.ts:315–342`
- Error handling: `try { await ... } catch { toUserErrorMessage() } finally { clear flags }` — confirmed: `useStartPage.ts`, `useGameSummaryPage.ts`
- Navigate after await (safe pattern): confirmed in `useStartPage.ts`, `handleUndo()` in same hook
- Button disabled prop: confirmed in `src/shared/ui/button/Button.tsx:16,69`
- Test pattern: `renderHook` + `act`, deferred promise for async ordering — confirmed: `useStartPage.actions.test.ts`
- Mock pattern: `vi.mock` at top of test file, `vi.fn()` per function — confirmed: `useGameSummaryPage.test.ts`
- No `any` — confirmed across codebase; `unknown` + type guards used

## Open Questions / Flags

NONE

## Risks

- [R-001] If `startGame()` is slow, users wait before navigating — acceptable per design: parity with `useStartPage` pattern; `apiClient` has 30 s timeout.
- [R-002] Existing test at line 108 (`"starts rematch game immediately and navigates..."`) uses synchronous mocks that pass today; after fix it still passes but the test name and semantics must be updated to reflect that navigate now happens AFTER startGame.
