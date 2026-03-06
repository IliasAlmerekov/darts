# Sequence Diagrams: useRoomStream Reconnect

## Main Flow: Initial Connection + Normal Events

```
useGameLogic        useRoomStream          EventSource        SSE Server
     |                    |                     |                  |
     |--useRoomStream(1)->|                     |                  |
     |                    |--connect()--------->|                  |
     |                    |  new EventSource    |--GET /room/1/--->|
     |                    |                     |<---200 SSE open--|
     |                    |<---onopen-----------|                  |
     |                    | setIsConnected(true)|                  |
     |                    | retryDelay = 1000   |                  |
     |                    |                     |<--event: throw---|
     |                    |<---addEventListener-|                  |
     |                    | parseRoomStreamEvent|                  |
     |                    | setEvent({type,data})|                 |
     |<--{ event, ... }---|                     |                  |
```

## Error Branch: Transient Disconnect → Reconnect

```
useRoomStream          EventSource        setTimeout         SSE Server
     |                     |                  |                  |
     |                     |<--- network drop -|                  |
     |                     |--- onerror ------>|                  |
     |<--onerror-----------|                  |                  |
     | setIsConnected(false)|                 |                  |
     | eventSource.close() |                  |                  |
     | retryTimerId=setTimeout(cb, 1000)----->|                  |
     |                     |                  |                  |
     |                     |          [1000ms pass]              |
     |                     |                  |                  |
     |<--callback fires----|------------------|                  |
     | retryDelay = 2000   |                  |                  |
     | connect() --------->|                  |                  |
     |              new EventSource           |--GET /room/1/--->|
     |                     |                  |<---200 SSE open--|
     |<---onopen-----------|                  |                  |
     | setIsConnected(true)|                  |                  |
     | retryDelay = 1000   |                  |                  |
```

## Error Branch: Repeated Failures (Backoff)

```
useRoomStream          EventSource        SSE Server
     |                     |                  |
     |<---onerror          |  [1st failure]   |
     | → wait 1000ms       |                  |
     | → retryDelay = 2000 |                  |
     | → connect()         |                  |
     |                     |--GET /room/1/--->|
     |                     |<---error---------|
     |<---onerror          |  [2nd failure]   |
     | → wait 2000ms       |                  |
     | → retryDelay = 4000 |                  |
     | → connect()         |                  |
     |                     |--GET /room/1/--->|
     |<---onerror          |  [3rd failure]   |
     | → wait 4000ms       |                  |
     | → retryDelay = 8000 |                  |
     | ...                 |                  |
     | → wait 30000ms      |  [Nth failure]   |
     | → retryDelay = 30000 (capped)          |
```

## Cleanup Branch: Unmount During Pending Retry

```
useRoomStream          setTimeout
     |                     |
     |<---onerror          |
     | retryTimerId=setTimeout(cb, 4000)----->|
     |                     |                  |
     |  [component unmounts before 4000ms]    |
     |                     |                  |
     | cleanup:            |                  |
     | clearTimeout(retryTimerId)------------>| ← timer cancelled
     | currentSource?.close()                 |
```

## Cleanup Branch: gameId Change

```
useRoomStream (gameId=1)       useRoomStream (gameId=2)
     |                                 |
     | [gameId prop changes from 1→2]  |
     | cleanup (gameId=1):             |
     |  clearTimeout(retryTimerId)     |
     |  currentSource?.close()         |
     |                                 |
     | new effect (gameId=2):          |
     |  retryDelay = 1000  (fresh)     |
     |  connect() → new EventSource    |
     |                                 |
```
