# Data Flow: SSE Reconnect in useRoomStream

## Decision: Real-time SSE with manual reconnect

SSE is required (existing implementation). Reconnect on error is the new behavior.
Cookie-based auth (`withCredentials: true`) persists across reconnects — no token refresh needed.

---

## Happy Path: Initial Connection

```
useRoomStream(gameId) mounts
  → useEffect runs (dep: [gameId])
  → connect() called
  → new EventSource(`${API_BASE_URL}/room/${gameId}/stream`, { withCredentials: true })
  → currentSource = eventSource
  → addEventListener × 6 (player-joined, player-left, game-started, throw, throw-recorded, game-finished)
  → onopen fires
      → setIsConnected(true)
      → retryDelay = INITIAL_RETRY_DELAY_MS  (reset / first set)
  → SSE events arrive
      → setEventFrom(type)(e) → parseRoomStreamEventData(e.data)
          → valid JSON  → setEvent({ type, data: parsedData })
          → invalid JSON → console.warn, return (no state update)
```

---

## Error Path: Connection Lost → Exponential Backoff Reconnect

```
eventSource.onerror fires
  → setIsConnected(false)
  → eventSource.close()             ← prevents browser native retry race
  → retryTimerId = setTimeout(callback, retryDelay)

  [retryDelay ms pass]

  callback fires:
    → retryDelay = Math.min(retryDelay * 2, MAX_RETRY_DELAY_MS)
    → connect()                     ← new EventSource, new currentSource

  → onopen fires  (reconnected successfully)
      → setIsConnected(true)
      → retryDelay = INITIAL_RETRY_DELAY_MS   ← reset

  OR

  → onerror fires again             ← another failure
      → repeat from top (new timer, doubled delay, capped at 30 000 ms)
```

Backoff sequence (wait times): 1 s → 2 s → 4 s → 8 s → 16 s → 30 s → 30 s → …

---

## Cleanup Path: Component Unmount

```
useEffect cleanup runs (unmount OR gameId change)
  → if (retryTimerId !== null) clearTimeout(retryTimerId)   ← cancel pending retry
  → currentSource?.close()                                  ← close active EventSource
```

Note: `currentSource` always points to the latest `EventSource` because `connect()` updates it on every call.

---

## gameId Change Path

```
gameId changes (e.g., user joins a different game)
  → useEffect cleanup fires (old gameId)
      → clearTimeout(retryTimerId)  (if a retry was pending)
      → currentSource?.close()
  → useEffect runs (new gameId)
      → retryDelay = INITIAL_RETRY_DELAY_MS  ← fresh start
      → retryTimerId = null
      → connect() → new EventSource for new gameId
```

---

## Null gameId Path (no active game)

```
useRoomStream(null) called
  → useEffect runs → early return (guard: if (!gameId) return)
  → No EventSource created
  → event state remains null, isConnected remains false
```

---

## State Summary

| Variable        | Kind          | Scope          | Initial                         | Updated when                               |
| --------------- | ------------- | -------------- | ------------------------------- | ------------------------------------------ |
| `event`         | useState      | hook           | `null`                          | valid SSE event received                   |
| `isConnected`   | useState      | hook           | `false`                         | onopen (→ true), onerror (→ false)         |
| `retryDelay`    | let (mutable) | effect closure | `INITIAL_RETRY_DELAY_MS` (1000) | doubled in timer callback; reset in onopen |
| `retryTimerId`  | let (mutable) | effect closure | `null`                          | set in onerror; cleared in cleanup         |
| `currentSource` | let (mutable) | effect closure | `null`                          | set in connect()                           |
