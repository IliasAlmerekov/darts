# Sequence: Auth Check with Single Timeout Source

```mermaid
sequenceDiagram
    participant C as Consumer
    participant H as useAuthenticatedUser
    participant A as getAuthenticatedUser
    participant B as /login/success

    C->>H: mount
    H->>H: create AbortController
    H->>A: getAuthenticatedUser({ signal, timeoutMs: 5000 })
    A->>A: create internal AbortController
    A->>A: forward incoming abort signal
    A->>B: fetch /login/success

    alt success response
        B-->>A: 200 + user payload
        A-->>H: user or null
        H->>H: setUser / setCurrentGameId if needed
        H->>H: setLoading(false)
        H-->>C: expose settled state
    else non-success response
        B-->>A: non-success / no user
        A-->>H: null
        H->>H: setLoading(false)
        H-->>C: expose unauthenticated state
    else timeout at 5000 ms
        A->>A: abort internal controller
        A-->>H: abort-path completion
        H->>H: do not apply late updates
        H->>H: setLoading(false)
        H-->>C: loading ends sooner
    else unmount before completion
        C->>H: unmount
        H->>H: cleanup -> abort hook controller
        H->>A: forwarded abort
        A->>A: abort internal controller
        A-->>H: request canceled
        H->>H: skip late state updates
    else non-abort error
        B--xA: reject / unexpected failure
        A--xH: throw error
        H->>H: setError(...)
        H->>H: setLoading(false)
        H-->>C: expose error state
    end
```

## Notes

- This sequence intentionally preserves the hook’s unmount cleanup while removing the separate hook-local timeout timer. [F2][F4][F5]
- `ProtectedRoutes` and `LoginPage` are the main user-visible consumers of the loading-state change. [F7][F9]
