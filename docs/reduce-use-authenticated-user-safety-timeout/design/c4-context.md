# C4 Context: Authenticated User Timeout Adjustment

## Scope

This diagram focuses on the auth-check flow started by `useAuthenticatedUser` and consumed by `ProtectedRoutes` and `LoginPage`.

## System Context

```mermaid
flowchart LR
    User[User]
    Browser[Browser SPA]
    AuthHook[useAuthenticatedUser hook]
    AuthApi[getAuthenticatedUser client]
    Backend[/login/success endpoint]

    User --> Browser
    Browser --> AuthHook
    AuthHook --> AuthApi
    AuthApi --> Backend
    Backend --> AuthApi
    AuthApi --> AuthHook
    AuthHook --> Browser
```

## People and Systems

| Element                  | Type                | Responsibility                                                  | Notes                                                                      |
| ------------------------ | ------------------- | --------------------------------------------------------------- | -------------------------------------------------------------------------- |
| User                     | Person              | Opens protected routes or login screen                          | Sees skeleton/loading or enabled login form                                |
| Browser SPA              | System              | React app runtime                                               | Contains hook, pages, route guards                                         |
| `useAuthenticatedUser`   | Internal subsystem  | Starts auth check, exposes `{ user, loading, error }`           | Current timeout source duplication exists here and in API [F1][F2][F4][F5] |
| `getAuthenticatedUser`   | Internal subsystem  | Performs `/login/success` fetch with timeout and abort handling | Already supports `timeoutMs` [F4][F5]                                      |
| `/login/success` backend | External dependency | Returns authenticated user or no user                           | Successful response maps to `data.user ?? data`; otherwise `null` [F6]     |

## Design Decision in Context

The timeout policy should be owned by the API request boundary, not split between the React hook and the API client. `useAuthenticatedUser` remains the lifecycle owner; `getAuthenticatedUser` becomes the timeout owner for this flow. [F2][F4][F5]

## External Impact

No backend contract change is proposed.  
No new external systems are introduced.
