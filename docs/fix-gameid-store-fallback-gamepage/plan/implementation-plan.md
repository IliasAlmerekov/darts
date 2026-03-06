# Implementation Plan: Fix gameId Store Fallback in GamePage
**Date:** 2026-03-06
**Research:** docs/fix-gameid-store-fallback-gamepage/research/research.md

## Summary

Remove the `$invitation` store fallback from the `gameId` useMemo in `useGameLogic.ts`. When `gameIdParam` is absent or non-numeric, the hook must return `null` instead of falling back to `invitation?.gameId`. The `!gameId` error path in `GamePage/index.tsx` already renders a safe `ErrorState` — no UI changes required. The fix is accompanied by unit tests for the extracted pure function `parseGameIdParam`.

## Phase Overview

| # | Phase name | Layer | New files | Modified files | Complexity |
|---|-----------|-------|-----------|----------------|------------|
| 01 | Hook Fix and Tests | pages/GamePage | 0 | 2 | Low |

## Dependency Order

Phase 01 is the only phase. No dependencies.

## Conventions Confirmed from Research

- Hooks: `use` prefix, co-located with page — confirmed: `src/pages/GamePage/useGameLogic.ts`
- Pure exported helpers in hook file — confirmed: `areAllPlayersAtStartScore`, `shouldAutoFinishGame`, `shouldNavigateToSummary` all exported from `useGameLogic.ts`
- Test file co-located: `useGameLogic.test.ts` next to `useGameLogic.ts` — confirmed
- Test environment: `// @vitest-environment node` for pure function tests — confirmed: `useGameLogic.test.ts:1`
- `buildGameData()` factory pattern for test data — confirmed: `useGameLogic.test.ts:10–49`
- `any` type: FORBIDDEN — confirmed
- `$invitation` import remains in file (used by `handleExitGame` via `setInvitation`) — confirmed: research.md Constraints

## Open Questions

NONE

## Risks

- [R-001] `useStartPage.ts` has the same fallback pattern but is NOT in scope — Mitigation: do not touch it; the ticket explicitly limits the fix to `useGameLogic.ts`
