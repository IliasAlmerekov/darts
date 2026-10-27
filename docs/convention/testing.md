# Testing

Use this file when adding or changing Vitest, Testing Library, or Playwright tests.

## Source layout

```text
src/**/<name>.test.ts(x)            # Vitest, next to the source file
src/test/loaderArgs.ts              # makeLoaderArgs() for calling a route loader in a test
src/test/QueryClientWrapper.tsx     # render/renderHook wrapper with a fresh query client per mount
src/test/architecture/              # repo-wide checks (import aliases, ESLint/Stylelint config, clientLogger adoption)
src/test/playwright/                # Playwright helper logic that needs unit tests (credentials, live preflight)
src/shared/types/*.test-support.ts  # shared DTO builders
src/shared/api/test-utils.ts        # shared API test helpers (createMockResponse)
tests/<domain>/*.spec.ts            # mocked Playwright specs (auth, start, game, joined-game, player-profile, ...)
tests/shared/                       # reusable Playwright fixtures, route mocks, seed spec
tests/harness/                      # self-tests for the tests/shared fixtures
tests/live/                         # specs against a real backend, plus preflight.setup.ts
docs/test-plans/*.md                # ticket and manual test plans
```

Rules:

- Use `*.test.ts` for pure logic, API, store, and non-JSX hooks; `*.test.tsx` for React
  components, JSX, and render-based hook tests.
- Put Playwright helper logic that needs a unit test in `src/test/playwright/` and import
  it from `tests/`; Vitest only collects `src/**/*.test.{ts,tsx}`.
- Do not create `__tests__` folders.
- Do not export test-only helpers from production barrels.

Rationale:

The Playwright `mocked` project runs `tests/**/*.spec.ts` and ignores `tests/shared/**`
and `tests/live/**`. The `live` project runs `tests/live/**/*.spec.ts` after
`tests/live/preflight.setup.ts`.

## Vitest files

Rules:

- Declare `// @vitest-environment node` for pure logic, API contract, mapper, route, and
  store tests that do not need DOM APIs.
- Declare `// @vitest-environment jsdom` for React components, browser APIs, router
  behavior, and DOM-visible hooks.
- Rely on the Vite default `jsdom` environment only for test-infra and architecture checks
  where the environment is not part of the behavior.
- Use `describe()` and `it()`; no `test()` in Vitest files.
- Use `vi.mocked()` when configuring mocked module functions.
- Reset mocks in `beforeEach`. Use `afterEach` only for mandatory cleanup such as
  restoring spies or browser globals.

Example:

```ts
// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { apiClient } from "@/shared/api/client";
import { getGameThrows } from "./get-game";

vi.mock("@/shared/api/client", () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

describe("getGameThrows", () => {
  it("returns validated game state", async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce(validResponse);

    await expect(getGameThrows(1)).resolves.toEqual(validResponse);
  });
});
```

## Testing Library

Rules:

- Query through `screen`, not through queries destructured from `render()`.
- Assert visible behavior, route changes, store state, or API calls at the public boundary.
- Do not use `screen.debug()` in committed tests.

## Mock boundaries

Rules:

- Mock API domain modules when testing pages, hooks, and components.
- Mock `apiClient` when testing API domain functions.
- Mock `fetch` only when testing `apiClient` itself or auth bootstrap code that
  intentionally bypasses `apiClient`.
- Mock browser APIs at the boundary: `EventSource`, `Audio`, `Storage`, `scrollTo`, wake
  lock, clipboard, and timers.
- Mock router hooks only when the test owns navigation behavior.
- Do not mock pure business logic from the same domain under test.
- Do not spy on Nanostore atom `.set()` methods. Assert Nanostore effects through exported
  actions, final store state, or rendered output.
- Use `createMockResponse` for mocked `Response` objects.

Rationale:

The codebase tests domain behavior through public seams. Spying on atom internals or
mocking pure logic makes tests pass against implementation details instead of behavior.

## Test data

Rules:

- Use and extend the `src/shared/types/*.test-support.ts` builders before duplicating large
  backend response shapes inline.
- Keep page-specific fixtures inside the test file until they are reused.
- Do not import `*.test-support.ts` from production code.

## Async and timers

Rules:

- Use fake timers or injected schedulers for timer-driven unit behavior.
- Use controlled Playwright route delays only when the scenario depends on a pending
  network state.

## API tests

Rules:

- Test each public API function against valid and invalid response shapes.
- Assert validation errors for malformed response payloads.
- Assert request method, endpoint, body, and options when they are part of the contract.

## Playwright

Rules:

- Import `{ test, expect }` from `@playwright/test` only in `tests/live/`.
- Import `{ test, expect }` from `tests/shared/test.ts` in every spec outside
  `tests/live/`; its fixture fails the test on any `/api` request without a route mock.
- Mock every API request a mocked spec makes with the helpers in `tests/shared/`. Do not
  skip a spec for missing credentials or backend.
- Put scenarios that need a real backend under `tests/live/`; they run with
  `npm run test:e2e:live`, behind a preflight that fails when credentials or the backend
  are missing.
- Navigate with paths relative to `baseURL`; do not hardcode a host or port.
- ESLint enforces the shared `test` import and relative URLs; `npm run typecheck` covers
  `tests/`.
- Use `page.locator()` only for generated markup, CSS-module checks, or layout checks that
  have no accessible target.
- Keep `// spec:` and `// seed:` comments when a spec is derived from a test plan.

## Coverage

`npm run coverage` fails below the thresholds in `vite.config.ts` (`test.coverage.thresholds`).

Rules:

- Add Playwright coverage for cross-route flows, auth, responsive regressions, and
  browser-only behavior.
- Do not replace unit coverage with E2E coverage when the behavior is local and
  deterministic.

## Verification

Run:

```bash
npm run test
npm run test:e2e
npm run test:e2e:live   # when tests/live/ changes; needs a backend and credentials
npm run coverage
rg --files src tests | rg '(^|[/\\])__tests__([/\\]|$)'
rg -n '^\s*test\(' src --glob '*.test.{ts,tsx}'
rg -n '\b(describe|it|test)\.only\b|\bfit\b|\bfdescribe\b' src tests --glob '*.{test,spec}.{ts,tsx}'
rg -n 'test-support' src --glob '!**/*.test.{ts,tsx}' --glob '!**/*.test-support.ts'
rg -n "spyOn\([^,]+,\s*[\"']set[\"']|screen\.debug" src --glob '*.test.{ts,tsx}'
```

Expected:

- `npm run test`, `npm run test:e2e`, and `npm run coverage` pass.
- The `rg` commands produce no project matches.
