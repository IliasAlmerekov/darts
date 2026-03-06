# Test Strategy: Reduce `useAuthenticatedUser` Safety Timeout

## Scope

Cover the timeout-source consolidation and ensure the visible loading consumers remain safe.

## Unit Tests

| Subject                | Scenario                                                   | Input or Setup                           | Expected                                                          | Mocks                     |
| ---------------------- | ---------------------------------------------------------- | ---------------------------------------- | ----------------------------------------------------------------- | ------------------------- |
| `useAuthenticatedUser` | should pass `timeoutMs: 5000` when starting auth check     | Mock `getAuthenticatedUser`, render hook | `getAuthenticatedUser` called with `signal` and `timeoutMs: 5000` | Mock API function         |
| `useAuthenticatedUser` | should still abort request on unmount                      | Existing deferred promise pattern        | signal aborted; no late state updates                             | Mock API function         |
| `useAuthenticatedUser` | should stop loading after aborted timeout-driven rejection | Mock API to reject with abort-like error | `loading` becomes `false`; no unexpected error state regression   | Mock API function         |
| `getAuthenticatedUser` | should abort request when `timeoutMs` elapses              | Existing fake-timer coverage             | Promise rejects with abort behavior                               | Mock `fetch`, fake timers |

## Integration Tests

| Component                     | Scenario                                                                  | Setup                                                   | Expected                                                              |
| ----------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------- | --------------------------------------------------------------------- |
| `ProtectedRoutes`             | should keep rendering route-specific skeleton while auth check is loading | Mock hook with `loading: true`                          | Existing skeleton behavior preserved                                  |
| `LoginPage` or `useLoginPage` | should disable form while auth check is in progress                       | Mock hook with `loading: true` or `checking: true` path | Inputs, checkbox, submit disabled; submit label reflects loading [F9] |
| `LoginPage` or `useLoginPage` | should re-enable form when auth check settles                             | Mock settled hook state                                 | Form controls no longer blocked                                       |

## E2E

No new E2E scenario is required for this ticket if implementation remains an internal timeout-source consolidation with unchanged UI flow.

However, existing auth-critical E2E coverage should be rerun because affected consumers are part of login and protected-route behavior. [F7][F9]

## Mocking Rules

- Mock only external boundaries:
  - `getAuthenticatedUser` in hook tests
  - `fetch` in API tests
  - timers in deterministic timeout tests
- Do **not** mock internal business logic that is under direct test.

## Risks Addressed by Tests

- Regression where the hook stops passing an abort signal
- Regression where timeout ownership remains duplicated
- Regression where `LoginPage` stays disabled indefinitely
- Regression where protected-route loading UI never settles

## Coverage Gaps to Close

- Add missing hook-level coverage for the timeout configuration value. [U1]
- Add missing login-page `checking` regression coverage if absent in current tests. [U2]
