# Implementation Plan: 3.2 Add AbortController to Fetch Hooks

**Date:** 2026-03-05  
**Research:** `docs/add-abortcontroller-fetch-hooks/research.md`

## Summary

Implement request cancellation for game/auth fetch hooks to prevent stale updates on unmount and during fast route changes.  
Keep public APIs stable by extending signatures with optional `signal` support and preserving current default behavior.

## Phase Overview

| #   | Phase name                   | Layer              | New files | Modified files | Complexity |
| --- | ---------------------------- | ------------------ | --------- | -------------- | ---------- |
| 01  | API signal support           | shared api         | 0         | 2              | Medium     |
| 02  | Hook cancellation            | pages/shared hooks | 0         | 2              | Medium     |
| 03  | Test coverage for abort/race | api + hooks tests  | 3         | 1              | Medium     |
| 04  | Full validation              | quality gates      | 0         | 0              | Low        |

## Dependency Order

1. Phase 01 must be completed before Phase 02 (hooks need API signal support).
2. Phase 02 must be completed before Phase 03 (tests target final behavior).
3. Phase 04 runs after all code and tests are updated.

## Phase Details

### Phase 01 — API signal support

**Files:**

- `src/shared/api/game.ts`
- `src/shared/api/auth.ts`

**Changes:**

- Extend `getGameThrowsIfChanged` to accept optional `AbortSignal` and pass it into `fetch`.
- Ensure aborted requests are not converted to generic `NetworkError`.
- Extend `getAuthenticatedUser` to accept optional external signal (and optional timeout override if needed), preserving existing default timeout behavior.
- Keep all call sites backward-compatible (optional params only).

**Acceptance criteria:**

- Existing call sites compile without modifications.
- Aborted requests surface as abort (not normal network failure).

### Phase 02 — Hook cancellation

**Files:**

- `src/pages/GamePage/useGameState.ts`
- `src/shared/hooks/useAuthenticatedUser.ts`

**Changes:**

- Add `AbortController` lifecycle handling inside `useEffect` cleanup.
- Pass `controller.signal` into async fetch calls.
- Guard state/store updates for aborted/stale requests.
- In `useGameState`, avoid stale `setGameData`/`setError`/`setLoading` from older requests.
- In `useAuthenticatedUser`, avoid post-unmount `setUser`/`setError`/`setLoading` and late `setCurrentGameId`.

**Acceptance criteria:**

- Unmount cancels in-flight requests.
- No error UI state set for abort-only scenarios.
- Stale request completion does not overwrite newer state.

### Phase 03 — Test coverage for abort/race

**New files:**

- `src/shared/api/auth.test.ts`
- `src/shared/hooks/useAuthenticatedUser.test.ts`
- `src/pages/GamePage/useGameState.test.ts`

**Modified files:**

- `src/shared/api/get-game.test.ts`

**Changes:**

- Add API tests for `getAuthenticatedUser` timeout/abort and successful fast path.
- Add hook test for `useAuthenticatedUser` unmount-before-resolve behavior.
- Add hook test for `useGameState` race (`gameId` switch; older response must not override newer).
- Extend `get-game.test.ts` with abort-signal behavior for `getGameThrowsIfChanged`.

**Acceptance criteria:**

- Tests validate abort semantics and race protection explicitly.
- No reliance on real network/time; deterministic mocks only.

### Phase 04 — Full validation

Run and report:

```bash
npm run eslint
npm run stylelint
npm run test
npm run test:e2e
npm run typecheck
npx prettier --check .
```

## Open Questions

1. Final API contract for abort in `getGameThrowsIfChanged`: should abort be re-thrown as `AbortError` or mapped to `null`?  
   Recommended: keep abort as abort error and ignore it in hooks.

## Risks and Mitigations

- **R-001:** Abort mapped incorrectly to network error.  
  **Mitigation:** explicit abort test in `get-game.test.ts`.
- **R-002:** Loading state stuck due to overlapping requests.  
  **Mitigation:** stale-request guards in hook + race test in `useGameState.test.ts`.
- **R-003:** Behavior regression in login/session checks.  
  **Mitigation:** keep optional params backward-compatible and run full suite including E2E.

## Definition of Done

- All four target files updated with cancellation-safe behavior.
- New/updated tests for abort and race are present and passing.
- Full validation suite passes.
- No FSD boundary violations introduced.
