# ADR-001: Unify Auth Timeout Source

**Status:** Proposed — pending human review

## Context

`useAuthenticatedUser` currently starts a hook-local `10000` ms safety timer while also calling `getAuthenticatedUser`, which already supports `timeoutMs` and maintains its own abort-controller timeout logic. [F1][F2][F4][F5]

This creates two timeout sources for the same auth-check flow, and the resulting loading behavior is user-visible in `ProtectedRoutes` and `LoginPage`. [F7][F9]

The ticket asks to reduce the effective timeout to `5000` ms or replace the hook-local timeout with an `AbortController`-based timeout mechanism. Research confirms that abort handling already exists in both the hook and the API. [F2][F5]

## Decision

For the `useAuthenticatedUser` flow:

- keep the hook-level `AbortController` for unmount and lifecycle cleanup; [F2]
- remove the hook-local `setTimeout(10000)` safety timer; [F1][F2]
- call `getAuthenticatedUser({ signal: controller.signal, timeoutMs: 5000 })`; [F4][F5]
- preserve current public APIs and consumer contracts. [F1][F4]

## Rejected Alternatives

1. **Lower hook-local timeout from `10000` to `5000` and keep API timeout as well**  
   Rejected because it still leaves two competing timeout sources for one request. [F1][F4][F5]

2. **Change the API default timeout constant globally from `8000` to `5000`**  
   Rejected because research does not justify changing timeout behavior for all potential consumers. [F4]

3. **Introduce `AbortSignal.timeout(...)` or a new shared timeout utility**  
   Rejected because the existing API already supports `timeoutMs`, no current codebase usage of `AbortSignal.timeout(...)` was found, and the smallest viable diff is preferred. [F4][F5][U3]

## Consequences

### Positive

- Single timeout owner for this auth-check flow
- Smaller and clearer React hook effect
- Faster exit from hung loading states in `ProtectedRoutes` and `LoginPage` [F7][F9]
- No public API break

### Negative and Trade-offs

- Timeout policy becomes explicitly configured at the hook call site
- Slower networks may hit the shorter timeout more often
- Additional regression coverage is needed for hook-level timeout configuration [U1]

### Impact on Tests

- Add deterministic test for `timeoutMs: 5000` at the hook boundary
- Preserve existing unmount abort coverage
- Rerun auth-related integration and E2E verification for affected consumers

## Linked Research Facts

[F1], [F2], [F4], [F5], [F7], [F9], [U1], [U3]
