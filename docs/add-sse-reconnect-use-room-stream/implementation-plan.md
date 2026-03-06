# Implementation Plan: Add SSE Reconnect Logic to useRoomStream

**Date:** 2026-03-06
**Design:** docs/add-sse-reconnect-use-room-stream/design-summary.md
**Research:** docs/add-sse-reconnect-use-room-stream/research.md

## Summary

This plan implements exponential-backoff reconnect for `useRoomStream`. The change is limited to a single source file (`src/shared/hooks/useRoomStream.ts`) and its test file. No new types, API functions, stores, or components are needed. The hook's public API (`{ event, isConnected }`) is preserved; the only behavioral change is that a dropped SSE connection now automatically recovers instead of staying dead.

## Phase Overview

| #   | Phase name                     | Layer        | New files | Modified files | Complexity |
| --- | ------------------------------ | ------------ | --------- | -------------- | ---------- |
| 01  | Hook — reconnect logic + tests | shared/hooks | 0         | 2              | Medium     |

Only one phase. No type phase (no new exported types). No API phase (no server calls). No state phase (no Nanostores). No UI phase (no components). No routing phase.

## Dependency Order

Phase 01 has no dependencies — it is the only phase.

## Conventions Confirmed from Research

- Hook naming: `use` prefix, camelCase — confirmed: `src/shared/hooks/useRoomStream.ts`
- Effect cleanup mandatory — confirmed: every hook in `src/shared/hooks/` returns a cleanup function
- `setTimeout`/`clearTimeout` via local `let` inside `useEffect` — confirmed: `NavigationBar.tsx`, `ViewToogleBtn.tsx`
- No `useRef` needed for timer when both setter and cleanup are in the same effect closure — confirmed pattern
- Constants: `UPPER_SNAKE_CASE` at module level — confirmed: `SSE_STREAM_ENDPOINT`, `API_BASE_URL` in `useRoomStream.ts`
- No silent `onerror` — confirmed: hook already calls `setIsConnected(false)` in onerror; no silent swallow
- `vi.useFakeTimers()` available — confirmed: `src/shared/api/auth.test.ts`
- `renderHook()` + `unmount()` for lifecycle testing — confirmed: `src/shared/hooks/useAuthenticatedUser.test.ts`
- Vitest env override via docblock: `@vitest-environment jsdom` — confirmed: multiple test files
- `vi.stubGlobal` for browser API mocking — confirmed: test pattern used across project

## Open Questions / Flags

- [Q-001] Should `retryDelay` reset to `INITIAL_RETRY_DELAY_MS` on `onopen`? Design assumes YES. No human override received — proceed with YES.
- [Q-002] Should a maximum retry count exist? Design assumes NO limit. No human override received — proceed with no limit.

Both questions were surfaced in `design-summary.md`. No response from human → proceed with design defaults per "simplest approach" rule.

## Risks

- [R-001] **Vitest environment mismatch** — `useRoomStream.test.ts` currently uses `@vitest-environment node` (no DOM). Moving to `jsdom` is required for `renderHook`. Mitigation: add `@vitest-environment jsdom` docblock at top of test file; existing `parseRoomStreamEventData` tests are pure functions and work in both environments.
- [R-002] **Double-reconnect race** — browser's native EventSource may also attempt reconnect if the source is not explicitly closed in `onerror`. Mitigation: call `eventSource.close()` in `onerror` before scheduling the timer (per design decision 5).
- [R-003] **Stale closure on recursive `connect()`** — cleanup must close whichever EventSource is current, not the original one. Mitigation: `currentSource` local variable updated on every `connect()` call; cleanup reads `currentSource`.
