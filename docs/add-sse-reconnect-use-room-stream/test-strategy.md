# Test Strategy: useRoomStream Reconnect

## Environment

`@vitest-environment jsdom` — hook integration tests require DOM (renderHook from @testing-library/react).
`vi.useFakeTimers()` required for exponential backoff timing tests (confirmed available: auth.test.ts).

## EventSource Mock

No global EventSource mock exists in the project. Create a `MockEventSource` class inside the test file:

```ts
class MockEventSource {
  static instances: MockEventSource[] = [];
  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
  private handlers = new Map<string, (e: MessageEvent<string>) => void>();
  readonly url: string;
  readonly withCredentials: boolean;

  constructor(url: string, options?: { withCredentials?: boolean }) {
    this.url = url;
    this.withCredentials = options?.withCredentials ?? false;
    MockEventSource.instances.push(this);
  }

  addEventListener(type: string, handler: (e: MessageEvent<string>) => void): void {
    this.handlers.set(type, handler);
  }

  emit(type: string, data: string): void {
    const handler = this.handlers.get(type);
    if (handler) handler(new MessageEvent(type, { data }));
  }

  simulateOpen(): void {
    this.onopen?.();
  }
  simulateError(): void {
    this.onerror?.();
  }

  close = vi.fn();
}
```

`vi.stubGlobal('EventSource', MockEventSource)` in `beforeEach`.
Reset `MockEventSource.instances = []` in `beforeEach`.

---

## Unit Tests: parseRoomStreamEventData (already exist — keep unchanged)

| Test case                                                | Condition     | Expected     |
| -------------------------------------------------------- | ------------- | ------------ |
| should parse valid JSON when data is a valid JSON string | `'{"foo":1}'` | `{ foo: 1 }` |
| should return null when data is invalid JSON             | `'not-json'`  | `null`       |

---

## Integration Tests: useRoomStream Hook

Test file: `src/shared/hooks/useRoomStream.test.ts`
Vitest environment: jsdom (add `@vitest-environment jsdom` docblock — current file is `node`).

### Connection lifecycle

| Test case                                               | Condition                           | Expected                            | Mocks           |
| ------------------------------------------------------- | ----------------------------------- | ----------------------------------- | --------------- |
| should set isConnected to true when EventSource opens   | simulateOpen()                      | `isConnected === true`              | MockEventSource |
| should set isConnected to false when EventSource errors | simulateOpen() then simulateError() | `isConnected === false`             | MockEventSource |
| should not create EventSource when gameId is null       | `useRoomStream(null)`               | no MockEventSource instance created | MockEventSource |

### Event delivery

| Test case                                                                | Condition                            | Expected                              | Mocks           |
| ------------------------------------------------------------------------ | ------------------------------------ | ------------------------------------- | --------------- |
| should deliver throw event when SSE emits throw                          | emit("throw", JSON.stringify({...})) | `event.type === "throw"`              | MockEventSource |
| should deliver player-joined event                                       | emit("player-joined", ...)           | `event.type === "player-joined"`      | MockEventSource |
| should log warning and not update event when SSE payload is invalid JSON | emit("throw", "bad")                 | event stays null, console.warn called | MockEventSource |

### Reconnect backoff

| Test case                                                 | Condition           | Expected                                                | Mocks                             |
| --------------------------------------------------------- | ------------------- | ------------------------------------------------------- | --------------------------------- |
| should schedule reconnect after 1000ms when onerror fires | simulateError()     | new EventSource created after 1000ms (fakeTimers)       | MockEventSource, vi.useFakeTimers |
| should close EventSource before scheduling reconnect      | simulateError()     | first instance.close called before new instance created | MockEventSource                   |
| should double retryDelay on each consecutive error        | 3× simulateError()  | waits 1000ms, 2000ms, 4000ms                            | MockEventSource, vi.useFakeTimers |
| should cap retryDelay at 30000ms                          | 10× simulateError() | never waits more than 30000ms                           | MockEventSource, vi.useFakeTimers |
| should reset retryDelay to 1000ms when reconnect succeeds | 2× error then open  | next error after open → 1000ms wait                     | MockEventSource, vi.useFakeTimers |

### Cleanup

| Test case                                                         | Condition                                         | Expected                                                | Mocks                             |
| ----------------------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------- | --------------------------------- |
| should close EventSource on unmount                               | unmount()                                         | currentSource.close() called                            | MockEventSource                   |
| should cancel pending retry timer on unmount                      | simulateError() then unmount() before timer fires | no new EventSource created after timer would have fired | MockEventSource, vi.useFakeTimers |
| should cancel pending retry timer on gameId change                | simulateError() then rerender with new gameId     | old retry cancelled, new connection opened              | MockEventSource, vi.useFakeTimers |
| should create new EventSource with new gameId when gameId changes | rerender with gameId=2                            | new EventSource URL contains gameId=2                   | MockEventSource                   |

---

## Mocking Rules

- Mock ONLY `globalThis.EventSource` via `vi.stubGlobal` — do NOT mock internal hook logic
- `vi.useFakeTimers()` in `beforeEach` where timer tests are grouped; `vi.useRealTimers()` in `afterEach`
- Reset `MockEventSource.instances` in `beforeEach`
- Do NOT mock `parseRoomStreamEventData` — it is tested separately and used internally

---

## E2E Tests

No new Playwright tests required. This is an internal resilience change with no visible UI change beyond connection recovery. Existing E2E tests must continue to pass (SSE stream is already mocked in none of the specs — they test UI layout and auth only).

---

## Verification Commands

```bash
npm run typecheck
npm run eslint
npm run test -- useRoomStream
npx prettier --check .
```
