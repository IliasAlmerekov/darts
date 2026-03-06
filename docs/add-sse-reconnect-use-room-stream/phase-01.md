# Phase 01: Hook — Reconnect Logic + Tests

**Layer:** shared/hooks
**Depends on:** none
**Can be tested in isolation:** Yes — pure hook with mocked EventSource

## Goal

Refactor `useRoomStream` to extract EventSource setup into an inner `connect()` function and add exponential-backoff reconnect on `onerror`; write integration tests covering all new behaviors.

---

## Files to MODIFY

### src/shared/hooks/useRoomStream.ts

**Current exports (DO NOT CHANGE):**

- `parseRoomStreamEventData(rawData: string): unknown | null` — keep signature and behavior identical
- `useRoomStream(gameId: number | null): { event: RoomStreamEvent | null; isConnected: boolean }` — keep return shape identical

**Confirmed at:** research.md — "useRoomStream (directly affected)" section, lines 91-99

---

#### ADD: two module-level constants (before the `parseRoomStreamEventData` function)

```
INITIAL_RETRY_DELAY_MS  = 1000
MAX_RETRY_DELAY_MS      = 30_000
```

Pattern source: `UPPER_SNAKE_CASE` constants confirmed — `SSE_STREAM_ENDPOINT` already in this file (research.md line 84).

---

#### MODIFY: the `useEffect` body inside `useRoomStream`

Replace the current effect body with the following structure. **Do not alter anything outside `useEffect`.**

**New internal variables (all `let`, scoped to the effect closure):**

| Variable        | Type                                    | Initial value            | Purpose                                          |
| --------------- | --------------------------------------- | ------------------------ | ------------------------------------------------ |
| `retryDelay`    | `number`                                | `INITIAL_RETRY_DELAY_MS` | current wait before next reconnect attempt       |
| `retryTimerId`  | `ReturnType<typeof setTimeout> \| null` | `null`                   | handle for pending retry timer                   |
| `currentSource` | `EventSource \| null`                   | `null`                   | always points to the latest EventSource instance |

**New inner function `connect(): void`** — defined inside `useEffect`, called once at start and recursively on retry:

Logic steps in `connect()`:

1. `const eventSource = new EventSource(url, { withCredentials: true })` — same URL as today
2. `currentSource = eventSource` — update shared reference
3. `eventSource.onopen = () => { setIsConnected(true); retryDelay = INITIAL_RETRY_DELAY_MS; }` — reset delay on success (design decision 3)
4. Register the same 6 `addEventListener` calls as today via `setEventFrom` — no change to event names or handler logic
5. `eventSource.onerror = () => { setIsConnected(false); eventSource.close(); retryTimerId = setTimeout(() => { retryDelay = Math.min(retryDelay * 2, MAX_RETRY_DELAY_MS); connect(); }, retryDelay); }` — close before retry to prevent native SSE double-reconnect (design decision 5, risk R-002)

**Call `connect()` once** at the end of the effect body (before `return`).

**New cleanup function** (the `return` from `useEffect`):

```
return () => {
  if (retryTimerId !== null) clearTimeout(retryTimerId);
  currentSource?.close();
};
```

Reference: data-flow.md — "Cleanup Path: Component Unmount"; design-summary.md — Decision 2 (`currentSource`).

---

#### DO NOT CHANGE:

- `parseRoomStreamEventData` — signature, logic, export
- `SSE_STREAM_ENDPOINT` constant
- `setEventFrom` helper function (inner function inside effect) — keep as-is
- Return statement of `useRoomStream`: `return { event, isConnected }`
- Import list — no new imports needed (`useState`, `useEffect` already imported; `API_BASE_URL`, `RoomStreamEvent` already imported)

---

### src/shared/hooks/useRoomStream.test.ts

**Confirmed at:** research.md — "Tests and Coverage" section; current file tests only `parseRoomStreamEventData` in `@vitest-environment node`

---

#### CHANGE: Vitest environment docblock

Replace `@vitest-environment node` with `@vitest-environment jsdom` at the top of the file.

Reason: `renderHook` from `@testing-library/react` requires DOM. Existing `parseRoomStreamEventData` tests are pure-function tests — they work in jsdom too (risk R-001 mitigation).

---

#### ADD: imports at top of test file

```ts
import { renderHook, act } from "@testing-library/react";
// vi, describe, it, expect, beforeEach, afterEach already available via vitest globals
```

---

#### ADD: `MockEventSource` class (inside test file, before test suites)

A test-only class that replaces `globalThis.EventSource`. Must capture:

- `onopen` and `onerror` callbacks (so tests can trigger them)
- `addEventListener` calls by event name (so tests can emit events)
- `close` as `vi.fn()` (so tests can assert it was called)
- Static `instances: MockEventSource[]` array (so tests can access the latest instance)

Fields required:

```
static instances: MockEventSource[]
onopen: (() => void) | null
onerror: (() => void) | null
close: vi.fn()
url: string
withCredentials: boolean
```

Methods required:

- `constructor(url: string, options?: { withCredentials?: boolean })` — push `this` to `MockEventSource.instances`
- `addEventListener(type: string, handler: (e: MessageEvent<string>) => void): void` — store in internal map
- `emit(type: string, data: string): void` — retrieve handler from map and call with `new MessageEvent(type, { data })`
- `simulateOpen(): void` — call `this.onopen?.()`
- `simulateError(): void` — call `this.onerror?.()`

---

#### ADD: `beforeEach` / `afterEach` setup (shared across all new test suites)

```
beforeEach(() => {
  MockEventSource.instances = [];
  vi.stubGlobal("EventSource", MockEventSource);
  vi.useFakeTimers();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
```

---

#### KEEP: existing `parseRoomStreamEventData` tests unchanged

---

#### ADD: new test suites

**Suite: "useRoomStream — connection lifecycle"**

| Test case                                                 | Setup                     | Action                | Expected                               |
| --------------------------------------------------------- | ------------------------- | --------------------- | -------------------------------------- |
| `should set isConnected to true when EventSource opens`   | renderHook(gameId=1)      | act → simulateOpen()  | result.current.isConnected === true    |
| `should set isConnected to false when EventSource errors` | renderHook → open → error | act → simulateError() | result.current.isConnected === false   |
| `should not create EventSource when gameId is null`       | renderHook(null)          | —                     | MockEventSource.instances.length === 0 |
| `should create EventSource with withCredentials: true`    | renderHook(gameId=1)      | —                     | instances[0].withCredentials === true  |

---

**Suite: "useRoomStream — event delivery"**

| Test case                                                                  | Setup             | Action                                        | Expected                                       |
| -------------------------------------------------------------------------- | ----------------- | --------------------------------------------- | ---------------------------------------------- |
| `should deliver throw event when SSE emits throw type`                     | renderHook → open | emit("throw", JSON.stringify({score:20}))     | result.current.event?.type === "throw"         |
| `should deliver player-joined event`                                       | renderHook → open | emit("player-joined", JSON.stringify({id:1})) | result.current.event?.type === "player-joined" |
| `should not update event and log warning when SSE payload is invalid JSON` | renderHook → open | emit("throw", "not-json")                     | event stays null; console.warn called          |

---

**Suite: "useRoomStream — reconnect backoff"**

All tests use `vi.useFakeTimers()`.

| Test case                                                                 | Setup                         | Action                                          | Expected                                                                             |
| ------------------------------------------------------------------------- | ----------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------ |
| `should close EventSource and schedule reconnect after 1000ms on onerror` | renderHook → open → error     | act → simulateError(); advanceTimersByTime(999) | instances.length === 1 (no new yet); advanceTimersByTime(1) → instances.length === 2 |
| `should close first EventSource before creating second`                   | renderHook → error            | simulateError()                                 | instances[0].close called before instances[1] created                                |
| `should double retryDelay on each consecutive error`                      | renderHook → 3× errors        | simulate 3 errors with timer advances           | waits: 1000ms, 2000ms, 4000ms                                                        |
| `should cap retryDelay at 30000ms after many errors`                      | renderHook → 10× errors       | simulate 10 errors                              | no timer advance > 30000ms; all subsequent advances === 30000ms                      |
| `should reset retryDelay to 1000ms when reconnect succeeds after errors`  | renderHook → 2× errors → open | simulate error, error, then open on 3rd source  | 4th error triggers 1000ms wait (not 8000ms)                                          |

For "double retryDelay" test — suggested approach:

```
// After each simulateError(), call advanceTimersByTime(currentDelay) and verify
// a new MockEventSource.instances entry was added, then check timing of next one.
```

---

**Suite: "useRoomStream — cleanup"**

| Test case                                                                 | Setup                              | Action                                                  | Expected                                                       |
| ------------------------------------------------------------------------- | ---------------------------------- | ------------------------------------------------------- | -------------------------------------------------------------- |
| `should close EventSource on unmount`                                     | renderHook → open                  | unmount()                                               | instances[0].close called                                      |
| `should cancel pending retry timer on unmount`                            | renderHook → error (timer pending) | unmount() before timer fires; advanceTimersByTime(5000) | no new EventSource created after unmount                       |
| `should cancel pending retry and open new connection when gameId changes` | renderHook(1) → error              | rerender with gameId=2; advanceTimersByTime(5000)       | old retry cancelled; new EventSource with gameId=2 URL created |
| `should create new EventSource with updated gameId URL on rerender`       | renderHook(1) → rerender(2)        | —                                                       | instances[1].url contains "/room/2/stream"                     |

---

## Verification Commands

```bash
npm run typecheck
npm run eslint
npm run test -- --reporter=verbose useRoomStream
npx prettier --check src/shared/hooks/useRoomStream.ts src/shared/hooks/useRoomStream.test.ts
```

No stylelint (no CSS changes). No E2E (internal resilience change, no visible UI change).

---

## Done Criteria

- [ ] `npm run typecheck` passes with 0 errors
- [ ] `npm run eslint` passes with 0 errors
- [ ] `npm run test -- useRoomStream` — all tests pass (existing `parseRoomStreamEventData` tests + all new tests)
- [ ] `npx prettier --check .` passes
- [ ] Only `useRoomStream.ts` and `useRoomStream.test.ts` modified — no other files touched
- [ ] Return shape `{ event: RoomStreamEvent | null; isConnected: boolean }` unchanged
- [ ] `parseRoomStreamEventData` export unchanged
- [ ] `isConnected` goes `true` on `onopen`, `false` on `onerror` — same as before
- [ ] `retryDelay` resets to `INITIAL_RETRY_DELAY_MS` on `onopen`
- [ ] Cleanup cancels timer and closes current source

---

## Human Review Checkpoint

Before running `/implement_feature 2` (N/A — this is the only phase):

- [ ] `INITIAL_RETRY_DELAY_MS` and `MAX_RETRY_DELAY_MS` are module-level constants?
- [ ] `connect()` is defined inside `useEffect`, not outside the hook?
- [ ] `currentSource` is a `let` variable inside `useEffect` (not `useRef`)?
- [ ] `eventSource.close()` is called in `onerror` BEFORE `setTimeout`?
- [ ] Cleanup calls `clearTimeout` THEN `currentSource?.close()`?
- [ ] `@vitest-environment jsdom` docblock present in test file?
- [ ] `MockEventSource.instances` reset in `beforeEach`?
- [ ] `vi.useRealTimers()` called in `afterEach`?
