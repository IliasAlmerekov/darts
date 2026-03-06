# Phase 01: Hook Timeout Ownership + Focused Regression Tests

**Layer:** `shared/hooks`

**Depends on:** none

**Can be tested in isolation:** Yes — the phase changes one hook and one hook test file only.

## Goal

Make `getAuthenticatedUser({ signal, timeoutMs: 5000 })` the single timeout owner for the auth-check flow while preserving the hook-owned `AbortController` for lifecycle cleanup.

## Files to CREATE

None.

## Files to MODIFY

### `src/shared/hooks/useAuthenticatedUser.ts`

**Confirmed at:** `docs/reduce-use-authenticated-user-safety-timeout/research/research.md` [F1], [F2], [F3] (evidence: `src/shared/hooks/useAuthenticatedUser.ts:18-67`)

Changes:

- REMOVE the hook-local `window.setTimeout(..., 10000)` safety timer.
- KEEP the hook-local `AbortController` and effect cleanup on unmount.
- CHANGE the auth request call to `getAuthenticatedUser({ signal: controller.signal, timeoutMs: 5000 })`.
- KEEP the public return shape exactly as `{ user, loading, error }`.
- KEEP current `setCurrentGameId(userData.gameId)` behavior when `gameId` is numeric.
- DO NOT CHANGE consumer contracts, export name, or error-state shape.

Reference:

- `docs/reduce-use-authenticated-user-safety-timeout/design/design-summary.md` — “Proposed Solution” and “Decision 1/2/3”
- `docs/reduce-use-authenticated-user-safety-timeout/design/api-contracts.md` — “Proposed usage from useAuthenticatedUser”

### `src/shared/hooks/useAuthenticatedUser.test.ts`

**Confirmed at:** `docs/reduce-use-authenticated-user-safety-timeout/research/research.md` (“Tests and Coverage Found”; evidence: `src/shared/hooks/useAuthenticatedUser.test.ts:40-53`)

Changes:

- EXTEND the existing hook test coverage instead of replacing it.
- ADD a deterministic assertion that `getAuthenticatedUser` is called with:
  - a live `signal`
  - `timeoutMs: 5000`
- KEEP existing unmount-abort and no-late-store-update coverage.
- ADD a regression test for timeout-owner behavior at the hook boundary:
  - when the mocked API rejects with an abort-like error, the hook should finish with `loading = false`
  - the hook should not surface a new unexpected user-facing error for that abort path
- DO NOT introduce real timers, real network, or unrelated page-level rendering.

## Tests for This Phase

| Test case                                                                    | Condition                               | Expected output                                                       | Mocks needed                                       |
| ---------------------------------------------------------------------------- | --------------------------------------- | --------------------------------------------------------------------- | -------------------------------------------------- |
| should pass `signal` and `timeoutMs: 5000` when starting auth check          | render the hook once                    | `getAuthenticatedUser` called once with `{ signal, timeoutMs: 5000 }` | mocked `getAuthenticatedUser`                      |
| should abort request on unmount and skip late store updates                  | deferred promise resolves after unmount | `signal.aborted === true`; `setCurrentGameId` not called late         | mocked `getAuthenticatedUser`, mocked store action |
| should stop loading after an abort-like rejection from the API timeout owner | mocked API rejects with `AbortError`    | final state has `loading === false`; no unexpected error regression   | mocked `getAuthenticatedUser`                      |

## Verification Commands

1. `npm run typecheck`
2. `npm run eslint`
3. `npm run test -- src/shared/hooks/useAuthenticatedUser.test.ts src/shared/api/auth.test.ts`
4. `npx prettier --check src/shared/hooks/useAuthenticatedUser.ts src/shared/hooks/useAuthenticatedUser.test.ts`

Notes:

- No `stylelint` in this phase because no CSS files are in scope.
- No `test:e2e` in this phase; the full E2E suite belongs to the final phase.

## Rollback Notes

- If this phase fails validation, revert **both** modified files together:
  - `src/shared/hooks/useAuthenticatedUser.ts`
  - `src/shared/hooks/useAuthenticatedUser.test.ts`
- Do **not** keep a partial rollback that mixes the new hook call with the old hook-local timer or vice versa.
- If the new timeout-owner behavior proves unsafe, restore the pre-phase hook implementation exactly and re-open the ticket for a design review rather than patching in a second timeout source.

## Done Criteria

- [ ] `useAuthenticatedUser` no longer owns a hook-local timer
- [ ] `useAuthenticatedUser` still owns lifecycle cleanup via `AbortController`
- [ ] `getAuthenticatedUser` is called with `{ signal, timeoutMs: 5000 }`
- [ ] Existing public hook return shape remains unchanged
- [ ] Focused hook tests listed above are written and passing
- [ ] Only the two in-scope files are modified
- [ ] No page-layer or API-layer production code is changed

## Human Review Checkpoint

- [ ] Single timeout owner is the API call, not the hook
- [ ] Hook cleanup still aborts on unmount
- [ ] No duplicate timeout path remains in `useAuthenticatedUser`
- [ ] Test assertions are deterministic and do not rely on real time or network
- [ ] Scope stayed inside `src/shared/hooks/`
