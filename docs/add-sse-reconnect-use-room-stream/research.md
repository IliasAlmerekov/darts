# Research: Add SSE Reconnect Logic to useRoomStream

**Date:** 2026-03-06
**Ticket:** Add reconnect logic to `useRoomStream`. Problem: `useRoomStream.ts:50` — `eventSource.onerror = () => { setIsConnected(false) }`. SSE connection drops silently without any reconnect attempt. Task: implement exponential backoff reconnect (1s → 2s → ... → 30s max).
**Feature folder:** docs/add-sse-reconnect-use-room-stream/

## Current State

SSE reconnect logic does not exist. The `onerror` handler only sets `isConnected=false` and lets the connection die; no retry timer, no backoff, no reconnect function. Neither `useRoomStream` nor `useEventSource` has any reconnection mechanism.

## Domain Types and Stores

### RoomStreamEvent\<T\>

**File:** src/shared/types/api.ts (lines 71-74)
**Kind:** generic interface
**Fields/Shape:** `{ type: string; data: T }`
**Used by:** src/shared/hooks/useRoomStream.ts, src/pages/GamePage/useGameLogic.ts
**Missing (relevant to ticket):** no connection status or retry-related fields

### isConnected (local state in useRoomStream)

**File:** src/shared/hooks/useRoomStream.ts:20
**Kind:** `useState<boolean>(false)` — local to hook
**Returned:** yes (`return { event, isConnected }`)
**Consumed downstream:** NOT consumed anywhere — `useGameLogic` destructures only `{ event }`, ignores `isConnected`
**Missing:** no `isReconnecting: boolean` flag, no `retryCount: number`

### Nanostores (connection-related)

- `$currentGameId` — `atom<number | null>` — persisted to sessionStorage
- `$gameData` — `atom<GameThrowsResponse | null>`
- **No `$connectionState`, `$isConnected`, or `$streamStatus` store exists.**

## Architecture and Patterns

**Folder structure (relevant files):**

```
src/shared/
  hooks/
    useRoomStream.ts         ← target hook
    useRoomStream.test.ts    ← only tests parseRoomStreamEventData
    useEventSource.ts        ← generic SSE wrapper (no reconnect)
    useAuthenticatedUser.ts  ← reference: AbortController + setTimeout safety pattern
    useAuthenticatedUser.test.ts
  api/
    client.ts                ← API_BASE_URL constant
    room.ts                  ← room CRUD API (no SSE)
    auth.ts                  ← reference: AbortController + timeout pattern
    errors.ts                ← ApiError, NetworkError, etc.
  types/
    api.ts                   ← RoomStreamEvent<T>
  store/
    game-session.ts          ← $currentGameId, $invitation
    game-state.ts            ← $gameData, $isLoading, $error
src/pages/
  GamePage/
    useGameLogic.ts          ← primary consumer of useRoomStream
    useGameState.ts          ← reference: AbortController + requestIdRef pattern
  StartPage/
    useGamePlayers.ts        ← uses useEventSource (not useRoomStream)
```

**Patterns CONFIRMED — must be respected in implementation:**

- Component pattern: functional component with explicit return type — CONFIRMED
- Hooks: `use` prefix, effect cleanup mandatory — CONFIRMED
- Stores: `$` prefix, mutations via explicit actions only — CONFIRMED
- Network: AbortController for cancellation — CONFIRMED in useAuthenticatedUser, useGameState, auth.ts; NOT USED in useRoomStream (EventSource.close() is the cancellation mechanism)
- Error handling: no silent catch — CONFIRMED (onerror in useRoomStream sets isConnected; no silent swallow)
- setTimeout + clearTimeout in cleanup: CONFIRMED in useAuthenticatedUser.ts, ViewToogleBtn.tsx, NavigationBar.tsx

**AbortController + timeout pattern (confirmed in useAuthenticatedUser.ts and auth.ts):**

1. Create controller
2. Set `setTimeout(() => controller.abort(), N)` and store ref
3. Pass `controller.signal` to async call
4. Clear timeout in `finally` block
5. Check `signal.aborted` before state updates
6. Use `isAbortError()` helper to detect abort

**setTimeout/clearTimeout pattern (confirmed in ViewToogleBtn.tsx, NavigationBar.tsx):**

- Store timeoutId in `useRef<ReturnType<typeof setTimeout> | null>(null)`
- Clear in cleanup: `if (timerRef.current) clearTimeout(timerRef.current)`

**Naming conventions observed:**

- Files: `use{Domain}{Feature}.ts` (e.g., `useRoomStream.ts`)
- Private refs: camelCase + "Ref" suffix (`requestIdRef`, `timerRef`, `isDrainingRef`)
- Constants: `UPPER_SNAKE_CASE` (`SSE_STREAM_ENDPOINT`, `API_BASE_URL`)
- Helper predicates: `is{Condition}()` (`isAbortError`, `isThrowNotAllowedConflict`)

**Import rules confirmed:** `app → pages → shared` direction. No violations observed.

## Related Components and Pages

### useRoomStream (directly affected)

**File:** src/shared/hooks/useRoomStream.ts
**Signature:** `function useRoomStream(gameId: number | null): { event: RoomStreamEvent | null; isConnected: boolean }`
**Local state:** `useState<RoomStreamEvent | null>(null)`, `useState<boolean>(false)`
**Dependency array:** `[gameId]` — re-creates EventSource on gameId change
**EventSource URL:** `` `${API_BASE_URL}/room/${gameId}/stream` `` with `{ withCredentials: true }`
**Events subscribed:** `player-joined`, `player-left`, `game-started`, `throw`, `throw-recorded`, `game-finished`
**Current onerror (line 50-52):** `setIsConnected(false)` only — no `eventSource.close()`, no retry
**Current cleanup (lines 54-56):** `eventSource.close()` only — no clearTimeout

### useEventSource (reference pattern / indirectly affected)

**File:** src/shared/hooks/useEventSource.ts
**Signature:** `function useEventSource(url: string | null, eventName: string, handler: EventHandler, options?: UseEventSourceOptions): void`
**onerror:** `console.error("[useEventSource] EventSource error")` — no reconnect
**Cleanup:** removeEventListener + close

### useGameLogic (consumer — directly affected by behavior change)

**File:** src/pages/GamePage/useGameLogic.ts:70
**Usage:** `const { event } = useRoomStream(gameId)` — `isConnected` is NOT destructured
**Event handling (lines 160-165):** `useEffect` that triggers `refetch()` on `game-started` / `game-finished` events

### useGamePlayers (reference consumer of useEventSource)

**File:** src/pages/StartPage/useGamePlayers.ts
**Usage:** `useEventSource(url, "players", handlePlayers, { withCredentials: true })`
**Note:** hardcodes `/api/room/${gameId}/stream` instead of using `API_BASE_URL` constant (inconsistency)

## API Layer and Data Mapping

### SSE Endpoint

**URL formula:** `${API_BASE_URL}/room/{gameId}/stream`
**Credentials:** `withCredentials: true` (cookie-based auth — same as all other API calls)
**No Bearer token / Authorization header** — authentication is entirely cookie-based

### API_BASE_URL

**File:** src/shared/api/client.ts
**Resolution:** `import.meta.env.VITE_API_BASE_URL ?? "/api"` (normalized)
**Dev proxy:** `vite.config.ts` proxies `/api` → `http://localhost:8001`

### Error types (from src/shared/api/errors.ts)

- `ApiError` — base, has `status: number`
- `NetworkError extends ApiError` — `status: 0`
- SSE errors: EventSource `onerror` fires with `Event`, not a typed error object — no HTTP status available

### Mapper: parseRoomStreamEventData

**File:** src/shared/hooks/useRoomStream.ts:7-13
**Signature:** `function parseRoomStreamEventData(rawData: string): unknown | null`
**Pure function:** YES
**Returns:** parsed object or null; caller logs a warning and returns early on null

## Tests and Coverage

### Existing Tests

| Test file                                     | Kind                | What it covers                                            |
| --------------------------------------------- | ------------------- | --------------------------------------------------------- |
| src/shared/hooks/useRoomStream.test.ts        | unit (node env)     | `parseRoomStreamEventData` — valid JSON, invalid JSON     |
| src/shared/hooks/useAuthenticatedUser.test.ts | integration (jsdom) | AbortSignal on unmount, stale update prevention           |
| src/pages/GamePage/useGameState.test.ts       | integration (jsdom) | AbortSignal on gameId change, stale response via deferred |
| src/shared/api/auth.test.ts                   | unit (jsdom)        | AbortController + `vi.useFakeTimers()` for timeout        |
| src/pages/StartPage/useGamePlayers.test.tsx   | integration (jsdom) | mocks `useEventSource` entirely; captures handler         |

### Coverage Gaps (confirmed absences)

- **useRoomStream hook lifecycle:** NOT TESTED — no EventSource creation, no listener registration, no cleanup on unmount
- **onerror handler:** NOT TESTED — no test verifies `isConnected` becomes false on error
- **onopen handler:** NOT TESTED — no test verifies `isConnected` becomes true on open
- **Reconnect/retry logic:** NOT TESTED — does not exist yet
- **EventSource mock utility:** NOT FOUND — no `MockEventSource`, no `vi.mock("global.EventSource")`, no SSE simulation helper
- **E2E SSE scenarios:** NOT FOUND — Playwright specs in `tests/joined-game/` do not mock `**/room/*/stream`

### Testing Patterns Available (for use in new tests)

- `vi.useFakeTimers()` + `vi.advanceTimersByTimeAsync()` — confirmed in `auth.test.ts`; applicable for testing exponential backoff timeouts
- Deferred promise pattern (`createDeferred<T>()`) — confirmed in `useGameState.test.ts`, `useAuthenticatedUser.test.ts`
- Handler capture pattern — confirmed in `useGamePlayers.test.tsx` (mock hook, store handler reference, call manually)
- `renderHook()` + `unmount()` — confirmed in `useAuthenticatedUser.test.ts` for cleanup verification
- Vitest environment: global default is `jsdom` (vite.config.ts:38); hook files can override with `@vitest-environment node` docblock

## Missing — Required for This Ticket

- **Reconnect function (`connect()`):** Not found — must be extracted from useEffect body into a reusable inner function
- **Retry timer ref:** Not found — `useRef<ReturnType<typeof setTimeout> | null>(null)` must be added
- **Retry delay tracking:** Not found — local mutable variable or ref for current delay (1000ms → 30000ms max)
- **Exponential backoff logic:** Not found — `Math.min(retryDelay * 2, 30_000)` must be added
- **Cleanup of retry timer in effect return:** Not found — `clearTimeout(retryTimeout)` must be added
- **`eventSource.close()` in onerror:** Not found — currently onerror does NOT close the source before retry
- **`isReconnecting` state (optional):** Not present — may be needed if consumers want to display reconnecting status
- **Test: EventSource mock:** Not found — must be created (vi.fn() constructor mock or class mock)
- **Test: reconnect fires after delay:** Not found — must be written using `vi.useFakeTimers()`
- **Test: cleanup cancels pending retry:** Not found — must verify clearTimeout called on unmount
- **Test: backoff doubles on repeated failures:** Not found — must be written
- **Test: backoff caps at 30s:** Not found — must be written
- **Test: reconnect resets delay on successful open:** Not found — must be written (if reset behavior is specified)

## File Reference Index

**MUST READ before implementation:**

- src/shared/hooks/useRoomStream.ts
- src/shared/hooks/useRoomStream.test.ts
- src/shared/hooks/useAuthenticatedUser.ts (AbortController + setTimeout reference pattern)
- src/shared/api/auth.ts (setTimeout abort pattern)
- src/pages/GamePage/useGameLogic.ts (primary consumer)
- src/shared/api/client.ts (API_BASE_URL)
- vite.config.ts (Vitest environment config)

**NOT FOUND (confirmed absent):**

- Any reconnect/retry logic: searched `retry`, `reconnect`, `backoff` across `src/**` — 0 matches
- EventSource mock utility: searched `MockEventSource`, `vi.mock.*EventSource`, `global.EventSource` across `src/**` — 0 matches
- `isReconnecting` state or type: searched `isReconnecting`, `reconnecting` across `src/**` — 0 matches
- setInterval usage: searched `setInterval` across `src/**` — 0 matches

## Constraints Observed

Facts the implementation MUST respect (confirmed in codebase):

- "Functional components only — confirmed across all src/pages/ and src/shared/"
- "Effect cleanup mandatory — confirmed; all hooks return cleanup functions"
- "No silent catch blocks — confirmed; all catch blocks have explicit handling"
- "AbortController NOT used in useRoomStream — EventSource.close() is the cancellation mechanism; no AbortSignal applies to EventSource in the Web API"
- "setTimeout refs stored as `useRef<ReturnType<typeof setTimeout> | null>(null)` — confirmed in ViewToogleBtn.tsx, NavigationBar.tsx"
- "vi.useFakeTimers() is available and used in tests — confirmed in auth.test.ts"
- "Vitest default environment: jsdom (vite.config.ts:38) — hook integration tests should use jsdom"
- "`isConnected` returned from useRoomStream but NOT consumed by any caller — changing shape is low-risk for callers"
- "Cookie-based auth (withCredentials: true) — no token refresh needed on reconnect; cookie persists"
- "useGamePlayers hardcodes /api prefix instead of using API_BASE_URL — pre-existing inconsistency, not in scope"
- "Raw DTOs never passed to UI — confirmed; SSE data parsed to unknown, then typed at event handler boundary"
- "Mappers are pure functions at shared/api/ or shared/lib/ boundary — confirmed"
