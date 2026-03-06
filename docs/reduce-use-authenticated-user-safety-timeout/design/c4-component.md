# C4 Component: `useAuthenticatedUser` Timeout Ownership

## Component View

```mermaid
flowchart TD
    Effect[useEffect in useAuthenticatedUser]
    Controller[Hook AbortController]
    ApiCall[getAuthenticatedUser({ signal, timeoutMs: 5000 })]
    ApiController[API AbortController + timeout]
    Store[setCurrentGameId]
    State[setUser / setLoading / setError]
    Consumers[ProtectedRoutes / LoginPage / PlayerProfilePage]

    Effect --> Controller
    Effect --> ApiCall
    ApiCall --> ApiController
    ApiCall --> State
    ApiCall --> Store
    State --> Consumers
```

## Components and Responsibilities

| Component              | Responsibility                                  | Change                                                   |
| ---------------------- | ----------------------------------------------- | -------------------------------------------------------- |
| Hook effect            | Starts auth check and cleans up on unmount      | Keeps cleanup responsibility [F2]                        |
| Hook `AbortController` | Cancels in-flight work on unmount               | Unchanged [F2]                                           |
| API timeout handling   | Aborts long-running `/login/success` request    | Becomes the single timeout source for this flow [F4][F5] |
| Hook state setters     | Publish `user`, `loading`, `error`              | Unchanged public behavior [F1]                           |
| `setCurrentGameId`     | Sync current game when returned in auth payload | Unchanged [F3]                                           |

## Design Decision

Use one component for **lifecycle cancellation** and one component for **request timeout**, but not two separate timeout timers:

- Hook owns unmount cancellation. [F2]
- API owns timeout duration for the request. [F4][F5]

## Rejected Component Split

Do not add a new shared timeout utility or store for this task.  
Reason: the problem is local, the API already has the necessary mechanism, and the task explicitly prefers a small diff. [F4][F5]
