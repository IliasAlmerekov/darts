# Implementation Plan: Reduce `useAuthenticatedUser` Safety Timeout

**Date:** 2026-03-06

**Design:** `docs/reduce-use-authenticated-user-safety-timeout/design/design-summary.md`

**API Contracts:** `docs/reduce-use-authenticated-user-safety-timeout/design/api-contracts.md`

**Test Strategy:** `docs/reduce-use-authenticated-user-safety-timeout/design/test-strategy.md`

**Research:** `docs/reduce-use-authenticated-user-safety-timeout/research/research.md`

## Summary

This plan implements the approved timeout-ownership change for `useAuthenticatedUser`: remove the hook-local `setTimeout(10000)`, keep the hook-owned `AbortController` for lifecycle cleanup, and call `getAuthenticatedUser({ signal, timeoutMs: 5000 })` so the API layer becomes the single timeout owner for this request. The scope stays intentionally narrow: one shared hook plus focused hook tests in Phase 01, followed by a verification-only final phase with the full repository validation suite. `LoginPage` regression coverage is treated as optional follow-up unless implementation or review shows that the shared timing change needs an extra consumer-level assertion.

## Phase Overview

| #   | Phase name                                        | Layer          | New files | Modified files | Complexity |
| --- | ------------------------------------------------- | -------------- | --------- | -------------- | ---------- |
| 01  | Hook timeout ownership + focused regression tests | `shared/hooks` | 0         | 2              | Medium     |
| 02  | Consumer-risk review + full validation gate       | verification   | 0         | 0              | Low        |

## Dependency Order

1. Phase 01 must complete before Phase 02.
2. Phase 02 is the final gate and must run the full validation suite required by the repo and workflow before the ticket can be considered implementation-ready.

## Conventions Confirmed from Research

- `useAuthenticatedUser` already owns an `AbortController` and performs cleanup in the effect boundary — confirmed: `docs/reduce-use-authenticated-user-safety-timeout/research/research.md` [F1], [F2].
- `getAuthenticatedUser` already accepts `{ signal?, timeoutMs? }` and already implements timeout-driven abort behavior internally — confirmed: `docs/reduce-use-authenticated-user-safety-timeout/research/research.md` [F4], [F5].
- `useAuthenticatedUser` public contract must remain `{ user, loading, error }` — confirmed: `docs/reduce-use-authenticated-user-safety-timeout/research/research.md` [F1].
- `ProtectedRoutes` and `LoginPage` are consumers of the hook’s loading and checking state, but the approved design keeps both consumers unchanged — confirmed: `docs/reduce-use-authenticated-user-safety-timeout/research/research.md` [F7], [F9] and `docs/reduce-use-authenticated-user-safety-timeout/design/design-summary.md` (“Decision 4”).
- Existing hook coverage already asserts unmount abort behavior, so new tests should extend rather than replace that pattern — confirmed: `docs/reduce-use-authenticated-user-safety-timeout/research/research.md` (“Tests and Coverage Found”).

## Open Questions and Flags

- [Q-001] Should this ticket promote missing `LoginPage` `checking` coverage into required scope, or keep it as optional follow-up? Current plan keeps it **optional** because no `LoginPage` production files are scheduled to change and the approved design explicitly keeps consumers unchanged.
- [Q-002] Should the `5000` timeout remain inline at the hook call site or be extracted to a local constant near the hook? Current plan assumes **inline value** for the smallest approved diff, consistent with the design summary.

## Risks

- [R-001] A partial implementation could leave both timeout owners active.
  **Mitigation:** Phase 01 changes the hook and its focused tests together; no partial rollout.
- [R-002] A shorter timeout could expose slow-network auth checks earlier than before.
  **Mitigation:** keep API contract unchanged, preserve abort handling, and run full validation in Phase 02.
- [R-003] Shared-hook timing changes could affect consumer loading flows without direct page edits.
  **Mitigation:** retain existing `ProtectedRoutes` coverage in the validation run and keep `LoginPage` coverage available as an optional escalation if review finds a gap.

## Scope Guardrails

- In scope:
  - `src/shared/hooks/useAuthenticatedUser.ts`
  - `src/shared/hooks/useAuthenticatedUser.test.ts`
- Out of scope by default:
  - `src/pages/LoginPage/*`
  - `src/app/ProtectedRoutes.tsx`
  - `src/shared/api/auth.ts`
- Exception:
  - `LoginPage` test coverage may be added only if human review explicitly promotes [Q-001] into required scope before implementation starts.

## Definition of Ready for Implementation

- Phase 01 has an exact two-file change list with deterministic tests.
- Phase 02 includes the full validation suite required by the repo and workflow:
  - `npm run eslint`
  - `npm run stylelint`
  - `npm run test`
  - `npm run typecheck`
  - `npx prettier --check .`
  - `npm run test:e2e`
- No plan item introduces production changes outside the task folder or outside the approved ticket scope.
