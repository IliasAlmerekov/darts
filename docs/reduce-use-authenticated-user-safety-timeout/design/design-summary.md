# Design: Reduce `useAuthenticatedUser` Safety Timeout

**Date:** 2026-03-06

**Research:** `docs/reduce-use-authenticated-user-safety-timeout/research/research.md`

**Ticket:** Reduce hook-local safety timeout from `10000` to `5000`, or replace it with `AbortController` timeout as part of task 3.2.

## Current State

`useAuthenticatedUser` already owns an `AbortController`, but it also starts a separate hook-local `setTimeout(10000)` while the auth API already supports its own timeout-driven abort flow via `getAuthenticatedUser({ signal?, timeoutMs? })` with an internal timeout controller. [F1][F2][F4][F5]

## Problem Statement

The current design has two timeout sources for the same auth-check request:

1. a hook-local `10000` ms safety timer in `useAuthenticatedUser`; [F1][F2]
2. an API-level timeout in `getAuthenticatedUser`, defaulting to `8000` ms and implemented with its own abort controller. [F4][F5]

This duplication increases maintenance cost and makes timeout ownership unclear. It also means user-visible loading states in `ProtectedRoutes` and `LoginPage` are indirectly governed by competing timers. [F7][F9]

## Proposed Solution

Use **one timeout source only** for this flow:

- keep the hook-level `AbortController` for lifecycle cancellation on unmount; [F2]
- remove the hook-local `setTimeout(10000)` safety timer; [F1][F2]
- call `getAuthenticatedUser({ signal: controller.signal, timeoutMs: 5000 })` from `useAuthenticatedUser`; [F4][F5]
- keep the public return shape of `useAuthenticatedUser` unchanged: `{ user, loading, error }`. [F1]

This keeps the diff small, preserves existing public APIs, and makes the timeout policy explicit at the request boundary used by this hook. [F1][F4][F5]

## Key Decisions

### Decision 1: Make the API call the single timeout owner

**Decision:** Delegate timeout control to `getAuthenticatedUser({ timeoutMs: 5000 })` and remove the hook-local timer.

**Why:** The API already supports `timeoutMs` and already aborts fetches with its own controller and cleanup. Using that existing mechanism avoids two competing timeout sources for one request. [F4][F5]

**Trade-off:** The hook now depends on the API timeout option for request timing, but that option already exists and is part of the current function contract. [F4]

**Rejected alternative:** Lower the hook-local timer from `10000` to `5000` and keep both timers. Rejected because it preserves duplicate timeout ownership and leaves the architectural ambiguity in place. [F1][F4][F5]

### Decision 2: Preserve the hook-level `AbortController` for lifecycle cleanup

**Decision:** Keep the hook-created `AbortController` and pass its `signal` into `getAuthenticatedUser`.

**Why:** The hook still needs cancellation on unmount and protection against late state updates; current tests already cover this behavior. [F2][F5]

**Trade-off:** There are still two abort controllers in the full call chain, but only one timeout source. The hook controller handles lifecycle; the API controller handles request timeout and signal forwarding. [F2][F5]

**Rejected alternative:** Remove the hook controller entirely. Rejected because unmount cancellation is already present, already tested, and should remain local to the React effect boundary. [F2]

### Decision 3: Override timeout only at the hook call site, not globally

**Decision:** Pass `timeoutMs: 5000` from `useAuthenticatedUser` instead of changing the API default constant.

**Why:** This keeps the change narrowly scoped to the ticket and avoids silently changing behavior for any other current or future `getAuthenticatedUser` consumer. [F4]

**Trade-off:** The `5000` ms timeout becomes a call-site policy instead of a global auth-client default.

**Rejected alternative:** Change `AUTH_CHECK_TIMEOUT_MS` from `8000` to `5000`. Rejected because the research does not prove that all callers should inherit the shorter timeout. [F4]

### Decision 4: Preserve consumer contracts and visible UI behavior

**Decision:** Keep `ProtectedRoutes` and `LoginPage` unchanged as consumers.

**Why:** They already respond to `loading/checking`; this task only shortens how long that state can persist before the request is aborted and settled. [F7][F9]

**Trade-off:** User-visible UI does not gain a new timeout-specific message; it simply exits the loading state sooner if the auth check hangs.

**Rejected alternative:** Add new loading or timeout-specific UI. Rejected because the ticket is about timeout source/threshold reduction, not a UX redesign, and small diffs are preferred. [F7][F9]

## Rejected Approaches

1. **Lower hook-local timeout to `5000` and leave API timeout in place**
   Rejected because it keeps duplicate timeout sources and does not resolve ownership ambiguity. [F1][F4][F5]
2. **Change API default timeout globally to `5000`**
   Rejected because research does not justify changing all consumers; this task is specifically about `useAuthenticatedUser`. [F4]
3. **Adopt `AbortSignal.timeout(...)` or `AbortController.timeout(...)` now**
   Rejected because no such usage exists in the codebase today, and the current API already provides a tested timeout mechanism with `timeoutMs`. [F5][U3]

## Impact on Existing Architecture

### Expected file changes

- `src/shared/hooks/useAuthenticatedUser.ts` — remove local timer, pass `timeoutMs: 5000`
- `src/shared/hooks/useAuthenticatedUser.test.ts` — add or adjust deterministic timeout coverage
- optionally `src/app/ProtectedRoutes.test.tsx` or login-page tests only if implementation adds targeted regression coverage for consumer-visible loading completion

### Breaking changes

None.

### Public API impact

- `useAuthenticatedUser` return shape remains unchanged. [F1]
- `getAuthenticatedUser` public signature remains unchanged. [F4]

### Affected consumers

- `ProtectedRoutes` loading skeleton flow. [F7][F8]
- `LoginPage` and `useLoginPage` auth-checking-disabled form flow. [F9]
- `PlayerProfilePage` is low risk because it does not consume the hook’s loading state. [F10]

## Risks

- A shorter timeout may expose existing slow-network behavior more often, especially where auth status currently resolves between 5 and 8 seconds.
- If timeout behavior is covered only at the API layer today, missing hook-level timer tests could allow regressions unless new deterministic tests are added. [U1]
- `LoginPage` currently lacks direct `checking`-path coverage, so implementation should add regression coverage there if feasible. [U2]

## Accessibility Notes

- No new UI controls or interaction patterns are introduced.
- Shortening auth-check duration can improve keyboard and screen-reader usability on `LoginPage` because disabled form controls should remain blocked for less time when the auth check stalls. [F9]
- `ProtectedRoutes` keeps the same skeleton-based loading behavior; this task does not remove or weaken existing accessible navigation flow. [F7]

## Open Questions

- [Q1] Should the user-visible error remain unchanged when the auth check times out, or should timeout-specific messaging be considered in a later UX task?
  This design assumes **no new message** in this ticket.
- [Q2] Should the `5000` ms value be extracted into a small shared constant near the hook, or kept inline at the call site for minimal diff?
  This design prefers the **smallest diff** acceptable to reviewers.

## Testing Approach Summary

- Add a hook-level deterministic test proving `useAuthenticatedUser` passes `timeoutMs: 5000` to `getAuthenticatedUser`.
- Preserve existing unmount-abort coverage for the hook. [F2]
- Keep API timeout behavior covered by existing `getAuthenticatedUser` timeout tests. [F5]
- Add or extend consumer-focused regression coverage where loading state depends on the hook:
  - `ProtectedRoutes` remains covered for loading branches. [F8]
  - `LoginPage` should gain missing `checking` coverage if implementation touches that area. [U2]

## Human Review Checklist

- [x] All major decisions reference research facts
- [x] Single timeout owner chosen
- [x] Public APIs preserved
- [x] Affected consumers listed
- [x] Trade-offs and rejected alternatives documented
- [x] Risks documented
- [x] Accessibility impact documented
- [x] Required tests identified
- [ ] Open questions reviewed by a human before Planning starts
