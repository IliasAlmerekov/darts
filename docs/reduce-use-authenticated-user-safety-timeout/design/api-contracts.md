# API Contracts: Authenticated User Timeout Usage

## Endpoint in Scope

`GET /login/success`

## Client Function Contract

### `getAuthenticatedUser`

**Current signature (unchanged):**

`getAuthenticatedUser(options?: { signal?: AbortSignal; timeoutMs?: number }): Promise<AuthenticatedUser | null>` [F4]

### Proposed usage from `useAuthenticatedUser`

`getAuthenticatedUser({ signal: controller.signal, timeoutMs: 5000 })` [F2][F4][F5]

## Request Contract

| Field       | Type          | Required | Purpose                                             |
| ----------- | ------------- | -------- | --------------------------------------------------- |
| `signal`    | `AbortSignal` | No       | Allows hook cleanup to cancel request [F2][F5]      |
| `timeoutMs` | `number`      | No       | Overrides API default timeout for this request [F4] |

## Response Contract

| Condition                        | Client result       | Notes                          |
| -------------------------------- | ------------------- | ------------------------------ |
| `response.ok` and `data.success` | `data.user ?? data` | Existing mapping remains [F6]  |
| Any other response path          | `null`              | Existing behavior remains [F6] |

## DTO to Domain Mapping

| API payload field          | Domain field               | Notes                                                      |
| -------------------------- | -------------------------- | ---------------------------------------------------------- |
| `data.user` or root `data` | `AuthenticatedUser`        | Existing mapping remains [F6]                              |
| `gameId`                   | `AuthenticatedUser.gameId` | Hook may propagate to current game store when numeric [F3] |

## Error Table

| Failure source                    | Typed code           | User-safe message                    | Notes                                                      |
| --------------------------------- | -------------------- | ------------------------------------ | ---------------------------------------------------------- |
| Request aborted by timeout        | `AUTH_CHECK_ABORTED` | No new message in this ticket        | Existing abort path should end loading without new UI copy |
| Request aborted by unmount        | `AUTH_CHECK_ABORTED` | No user-facing message               | Local lifecycle cleanup [F2][F5]                           |
| Unexpected fetch or runtime error | `AUTH_CHECK_FAILED`  | Existing generic hook error handling | Preserve current behavior [F1][F2]                         |

## Client-Side Validation Rules

- `timeoutMs` must be a positive integer when provided.
- This design sets `timeoutMs = 5000` only at the `useAuthenticatedUser` call site.
- No backend validation change is required.

## Contract Decision

No API signature changes are required. [F4]  
The change is a **usage policy** change, not a **contract shape** change.
