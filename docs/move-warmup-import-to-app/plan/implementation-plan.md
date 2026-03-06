# Implementation Plan: Move Warmup Import to App.tsx

**Date:** 2026-03-06
**Design:** N/A — skipped per user decision (trivial single-file deletion)
**Research:** docs/move-warmup-import-to-app/research/research.md

## Summary

Remove the duplicate `void import("@/pages/GameSummaryPage")` warmup effect from
`useGameLogic.ts` (lines 88–91). `App.tsx` already preloads this chunk at line 33 inside
the centralized `warmUpRoutes()` function — no additions to App.tsx are required.
The change is a net deletion of 4 lines (useEffect block + comment) with no new code.

## Phase Overview

| #   | Phase name                     | Layer          | New files | Modified files | Complexity |
| --- | ------------------------------ | -------------- | --------- | -------------- | ---------- |
| 01  | Remove duplicate warmup effect | pages/GamePage | 0         | 1              | Trivial    |

## Dependency Order

No dependencies. Single phase.

## Conventions Confirmed from Research

- `void import()` pattern for warmup — confirmed: `src/app/App.tsx:31–37`
- `warmUpRoutes()` is a local function inside a `useEffect`, not an exported array — confirmed: `src/app/App.tsx:30–38`
- `GameSummaryPage` already present in `warmUpRoutes()` — confirmed: `src/app/App.tsx:33`
- `useEffect` with empty dependency array — confirmed: `src/pages/GamePage/useGameLogic.ts:88–91`
- Dynamic imports do NOT require cleanup in effect return — confirmed: `useGameLogic.ts:88–91` has no return
- `@/pages/` alias used consistently — confirmed across all dynamic imports

## Open Questions / Flags

NONE

## Risks

- [R-001] Ticket description says "add GameSummaryPage to warmUpRoutes array in App.tsx" — misleading.
  `warmUpRoutes` is a function, not an array, and `GameSummaryPage` is already included.
  **Mitigation:** Phase 01 spec explicitly states: do NOT modify `App.tsx`.
