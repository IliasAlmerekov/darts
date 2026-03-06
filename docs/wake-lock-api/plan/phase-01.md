# Phase 01: Wake Lock Hook Implementation + Browser-API Tests

**Layer:** `pages/GamePage`

**Depends on:** none

**Can be tested in isolation:** Yes. This phase only introduces the new hook and its browser-boundary tests.

## Goal

Create `useWakeLock` as a page-scoped hook that requests a screen wake lock when enabled, safely no-ops when the API is unavailable or request fails, and always releases the held sentinel during cleanup.

## Files to CREATE

### `src/pages/GamePage/useWakeLock.ts`

Changes:

- ADD an exported hook with an explicit signature equivalent to `useWakeLock(isEnabled: boolean): void`.
- IMPLEMENT browser support detection before any API call.
- REQUEST a `"screen"` wake lock only when `isEnabled` is `true`.
- STORE the returned `WakeLockSentinel` in hook-local state or refs only; do not leak it outside the hook.
- RELEASE the sentinel when:
  - the hook disables wake lock after previously enabling it
  - the component using the hook unmounts
- HANDLE request and release failures explicitly within the hook, while keeping the allowed silent-failure behavior for unsupported or rejected wake-lock acquisition.
- KEEP the hook free of app-level state, shared-store writes, and user-facing error messages.

### `src/pages/GamePage/useWakeLock.test.ts`

Changes:

- ADD deterministic jsdom hook coverage using mocked `navigator.wakeLock`.
- MOCK the browser boundary instead of the hook internals.
- COVER the unsupported-browser path where `navigator.wakeLock` is absent.
- COVER the enabled path where `request("screen")` resolves with a sentinel mock.
- COVER cleanup behavior by asserting `sentinel.release()` on unmount or disable transition.
- COVER the failure path where `request("screen")` rejects and the hook keeps the page stable without throwing.

## Files to MODIFY

None.

## Tests for This Phase

| Test case                                                             | Condition                                            | Expected output                                                         | Mocks needed                                 |
| --------------------------------------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------- | -------------------------------------------- |
| should not request wake lock when feature is unsupported              | hook renders with `isEnabled = true`, no API present | no exception, no request attempt                                        | none beyond removing `navigator.wakeLock`    |
| should request `screen` wake lock when enabled and API is supported   | hook renders with `isEnabled = true`                 | `navigator.wakeLock.request("screen")` called once                      | mocked `navigator.wakeLock.request`          |
| should release the sentinel when the hook is disabled after acquiring | rerender from `true` to `false`                      | sentinel `release()` called exactly once                                | mocked sentinel with `release`               |
| should release the sentinel on unmount                                | unmount after successful request                     | sentinel `release()` called during cleanup                              | mocked sentinel with `release`               |
| should swallow request rejection and keep rendering stable            | `request("screen")` rejects                          | hook does not throw and no extra retries happen unless explicitly coded | mocked rejected `navigator.wakeLock.request` |

## Verification Commands

1. `npm run typecheck`
2. `npm run eslint`
3. `npm run test -- src/pages/GamePage/useWakeLock.test.ts`
4. `npx prettier --check src/pages/GamePage/useWakeLock.ts src/pages/GamePage/useWakeLock.test.ts`

Notes:

- No `stylelint` in this phase because no CSS files are touched.
- No `test:e2e` in this phase because the work is isolated to one page hook and its unit coverage.

## Rollback Notes

- If validation fails, remove both created files together:
  - `src/pages/GamePage/useWakeLock.ts`
  - `src/pages/GamePage/useWakeLock.test.ts`
- Do not keep the hook without its test coverage.
- If browser API handling proves more complex than planned, stop after rollback and reopen planning instead of adding ad-hoc shared abstractions.

## Done Criteria

- [ ] `useWakeLock` exists under `src/pages/GamePage/`
- [ ] The hook requests wake lock only when enabled
- [ ] Unsupported-browser and rejected-request paths are handled safely
- [ ] Cleanup releases any held sentinel
- [ ] Focused hook tests are deterministic and passing
- [ ] No existing production files are modified in this phase

## Human Review Checkpoint

- [ ] Browser API feature detection is present before calling `navigator.wakeLock`
- [ ] Cleanup path releases the sentinel exactly once per acquisition
- [ ] No shared-store or UI error side effects were introduced
- [ ] Tests mock only the browser boundary and remain deterministic
