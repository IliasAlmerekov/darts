# Data Flow: Authenticated User Timeout Consolidation

## Sync vs Async Decision

This remains an **async** request/response flow because `useAuthenticatedUser` fetches `/login/success` over the network. The design only changes where timeout control is configured, not the asynchronous nature of the flow. [F2][F4][F5]

## Happy Path

1. A consumer mounts `useAuthenticatedUser` (for example `ProtectedRoutes` or `LoginPage`). [F7][F9]
2. The hook creates an `AbortController` for lifecycle cleanup. [F2]
3. The hook calls `getAuthenticatedUser({ signal: controller.signal, timeoutMs: 5000 })`. [F4][F5]
4. The API client creates its own controller, forwards the hook signal, and starts a `5000` ms timeout. [F4][F5]
5. Backend returns success; API maps response to `data.user ?? data`. [F6]
6. Hook sets `user`, optionally sets current game id, and finishes with `loading = false`. [F1][F3]
7. Consumers render their normal authenticated or unauthenticated UI. [F7][F9]

## Error Paths

### Network timeout

1. API timeout reaches `5000` ms.
2. API controller aborts fetch. [F5]
3. Hook receives abort-path completion and exits loading state.
4. `ProtectedRoutes` stops showing skeletons; `LoginPage` stops blocking form controls. [F7][F9]

### Unmount before request resolves

1. Consumer unmounts.
2. Hook cleanup aborts its controller. [F2]
3. API signal-forwarding aborts the internal controller. [F5]
4. Late state updates are skipped. Existing tests already cover this pattern. [F2]

### Non-abort error

1. API call rejects for a non-abort reason.
2. Hook maps the error into `error` and clears loading. [F1][F2]
3. Consumers continue with current error-handling behavior.

## Expected Latency

| Operation                    | Expected behavior after design                  |
| ---------------------------- | ----------------------------------------------- |
| Normal successful auth check | Unchanged; limited by network and backend       |
| Hung auth check              | Hard stop at about `5000` ms for this hook flow |
| Unmount cleanup              | Immediate abort via hook controller             |

## Data Integrity Notes

- No DTO changes are proposed. [F6]
- No Nanostore design change is proposed; only existing `setCurrentGameId` behavior remains. [F3]
