# C4 Container: Frontend Auth-Check Timeout Flow

## Containers in Scope

```mermaid
flowchart TB
    subgraph Frontend[React + Vite Frontend]
        PR[ProtectedRoutes]
        LP[LoginPage / useLoginPage]
        PP[PlayerProfilePage]
        Hook[shared/hooks/useAuthenticatedUser]
        Api[shared/api/auth.getAuthenticatedUser]
    end

    Backend[/login/success API]

    PR --> Hook
    LP --> Hook
    PP --> Hook
    Hook --> Api
    Api --> Backend
```

## Container Notes

| Container                    | Technology                     | Responsibility                                                  | Relevant facts |
| ---------------------------- | ------------------------------ | --------------------------------------------------------------- | -------------- |
| `ProtectedRoutes`            | React Router + React component | Shows loading skeletons while auth check is in progress         | [F7][F8]       |
| `LoginPage` / `useLoginPage` | React component + hook         | Disables login form while auth check is in progress             | [F9]           |
| `PlayerProfilePage`          | React component                | Reads `user` and `error`, not `loading`                         | [F10]          |
| `useAuthenticatedUser`       | React hook                     | Orchestrates auth check and local lifecycle cancellation        | [F1][F2][F3]   |
| `getAuthenticatedUser`       | API client function            | Fetches `/login/success`, supports timeout and abort forwarding | [F4][F5][F6]   |

## Proposed Container-Level Change

Only the interaction between `useAuthenticatedUser` and `getAuthenticatedUser` changes:

- before: hook timer (`10000`) + API timeout (`8000` default) [F1][F4]
- after: hook lifecycle abort + API timeout override (`5000`) [F2][F4][F5]

## Container-Level Trade-off

Keeping timeout configuration at the API boundary slightly increases the importance of the `timeoutMs` option, but it removes ambiguity and still preserves the existing public function signatures. [F4][F5]
