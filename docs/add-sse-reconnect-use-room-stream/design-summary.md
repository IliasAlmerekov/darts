# Design: Add SSE Reconnect Logic to useRoomStream

**Date:** 2026-03-06
**Research:** docs/add-sse-reconnect-use-room-stream/research.md
**Ticket:** SSE connection drops silently on error. Add exponential backoff reconnect: 1s → 2s → 4s → … → 30s max.

## Current State

`useRoomStream` creates an `EventSource`, registers 6 event listeners, and on `onerror` only calls `setIsConnected(false)` — the connection dies permanently until the next page navigation or gameId change.

## Problem Statement

- `onerror` handler at `useRoomStream.ts:50` has no reconnect logic (research: "Missing — Required for This Ticket").
- No retry timer, no backoff state, no `connect()` function to re-invoke.
- The browser's native `EventSource` reconnect is disabled because the source is never explicitly closed on error, which can cause a double-reconnect race condition.
- `isConnected` returned by the hook is unused by any consumer, but the hook's reconnect state is observable through it.

## Proposed Solution

Refactor `useRoomStream` to extract EventSource setup into an inner `connect()` function. On `onerror`:

1. Call `setIsConnected(false)`
2. Close the current EventSource explicitly (`eventSource.close()`)
3. Schedule a `setTimeout(connect, retryDelay)` call
4. After the timer fires, double `retryDelay` before reconnecting (capped at 30 s)

On `onopen`, reset `retryDelay` back to the initial value so the next disconnection starts from 1 s again.

The effect cleanup cancels any pending retry timer and closes the current connection. This is the only change — no new files, no new exports, no store changes.

## Key Decisions

### Decision 1: Local mutable variables vs useRef for retry state

**Choice:** Use `let retryTimerId` and `let retryDelay` as local variables inside `useEffect`, not `useRef`.
**Rationale:** Both the timer setter (`onerror`) and the cleanup function are in the same effect closure, so a plain local variable is sufficient. Using `useRef` would persist values across `gameId` changes — but when `gameId` changes we WANT a full reset (fresh delay = 1 s, no dangling timer). Local vars give us that reset for free when the effect re-runs. Confirmed pattern: NavigationBar.tsx and ViewToogleBtn.tsx also use local `let timerRef` inside effects [research: "setTimeout/clearTimeout pattern"].
**Alternative considered:** `useRef<ReturnType<typeof setTimeout> | null>(null)` — rejected because it would persist `retryDelay` across `gameId` changes, breaking the "fresh start on new game" expectation.

### Decision 2: `currentSource` variable to track active EventSource

**Choice:** Introduce a `let currentSource: EventSource | null = null` local variable, updated inside `connect()`, read in cleanup.
**Rationale:** `connect()` is called recursively from the retry timer. The cleanup function must close whichever `EventSource` instance is active at the time of unmount, not the one from the initial call. A shared local variable solves this cleanly.
**Alternative considered:** Return the `EventSource` from `connect()` and chain — rejected because recursive invocation makes return-value chaining awkward and error-prone.

### Decision 3: Reset retryDelay on successful reconnect

**Choice:** In `onopen`, reset `retryDelay` to `INITIAL_RETRY_DELAY_MS` (1000 ms).
**Rationale:** After a successful reconnection the next error should start from the shortest delay again, not from where the backoff left off. This matches standard backoff behavior for transient network issues.
**Alternative considered:** Never reset — rejected because a client that had a 16 s backoff and reconnected successfully would wait 16 s on the next (possibly brief) glitch, which is a poor user experience.

### Decision 4: No `isReconnecting` flag

**Choice:** Do NOT add `isReconnecting: boolean` to the hook's return value.
**Rationale:** `isConnected` is already ignored by all consumers (research: "NOT consumed anywhere"). Adding `isReconnecting` would be YAGNI. The behavior changes transparently; if UI needs to show a reconnecting banner it can derive it from `isConnected === false` already.
**Alternative considered:** Add `isReconnecting` — rejected (YAGNI, no consumer, no design requirement).

### Decision 5: Named constants for delay bounds

**Choice:** Define `INITIAL_RETRY_DELAY_MS = 1000` and `MAX_RETRY_DELAY_MS = 30_000` as module-level constants in `useRoomStream.ts`.
**Rationale:** Magic numbers in a timeout are fragile and hard to test. Named constants make the backoff limits explicit and testable. Matches `UPPER_SNAKE_CASE` convention confirmed in research.
**Alternative considered:** Inline magic numbers — rejected (violates project naming convention, hard to change).

## Impact on Existing Architecture

- **Files modified:** `src/shared/hooks/useRoomStream.ts` (only)
- **Public API changes:** Return shape `{ event, isConnected }` is unchanged. No new exports.
- **Breaking changes:** NONE. `isConnected` semantics change slightly: it now goes `false → true` on reconnect instead of staying `false` permanently, which is an improvement.

## Rejected Approaches

1. **Modify `useEventSource` instead** — rejected because `useEventSource` is a generic single-event hook; reconnect logic would pollute its interface. `useRoomStream` is the right boundary.
2. **Store connection state in Nanostores** — rejected because connection state is local to the hook and not shared across pages (research: "No `$connectionState` store exists").
3. **Use the browser's native EventSource auto-reconnect** — rejected because native reconnect requires a `retry:` field from the server (not present in our SSE responses) and we cannot control the delay. Explicit `eventSource.close()` in `onerror` is required to prevent a native + custom double-reconnect race.

## Open Questions — human must answer before Planning

- [ ] [Q-001] Should the delay reset to 1 s on `onopen`, or should it carry over across reconnects? (This design assumes YES — reset. Confirm or override.)
- [ ] [Q-002] Should a maximum retry count exist (e.g. stop after 10 attempts)? Ticket does not mention it; this design has no limit.

---

## Human Review Checklist

!! DO NOT PROCEED TO PLANNING UNTIL CHECKLIST COMPLETE !!

Architecture:

- [x] Layer boundaries respected — `useRoomStream` is in `shared/hooks/`, no imports added
- [x] No raw DTOs passed to UI — unchanged, SSE data parsed via `parseRoomStreamEventData`
- [x] Nanostores NOT added — local state only (confirmed appropriate)
- [x] AbortController N/A — EventSource uses `.close()`, not AbortSignal (Web API constraint)
- [x] Effect cleanup specified — clearTimeout + currentSource.close()

Data:

- [x] No new DTO or domain types needed
- [x] Mapper `parseRoomStreamEventData` unchanged

Errors:

- [x] onerror path documented (data-flow.md, sequence.md)
- [x] No user-facing error message — reconnect is silent (by design, isConnected signals state)
- [x] No silent catch — onerror sets isConnected(false) and schedules retry

Open Questions:

- [ ] [Q-001] Confirm delay-reset behavior on reconnect
- [ ] [Q-002] Confirm no max retry count

Decisions:

- [x] All 5 decisions have rationale
- [x] All rationale references research facts
- [x] Rejected alternatives documented
