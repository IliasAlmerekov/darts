# Testing

Use this file when adding or changing Vitest, Testing Library, or Playwright
tests.

## Source layout

Rules:

- Put Vitest tests next to the source file as `*.test.ts` or `*.test.tsx`.
- Use `*.test.ts` for pure logic, API, store, and non-JSX hooks.
- Use `*.test.tsx` for React components, JSX, and render-based hook tests.
- Put Vitest setup and test-only runtime shims in `src/test/`.
- Put shared DTO builders in `src/shared/types/*.test-support.ts`.
- Put shared API test helpers in `src/shared/api/test-utils.ts`.
- Put Playwright specs under `tests/<domain>/*.spec.ts`.
- Put reusable Playwright helpers under `tests/shared/`.
- Put ticket and manual test plans under `specs/*.md`.
- Do not create `__tests__` folders.
- Do not export test-only helpers from production barrels.

Rationale:

Vitest is configured to include only `src/**/*.test.{ts,tsx}`. Playwright is
configured to run `tests/**/*.spec.ts` and ignore `tests/shared/**`.

## Vitest files

Rules:

- Declare `// @vitest-environment node` for pure logic, API contract, mapper, route, and store tests that do not need DOM APIs.
- Declare `// @vitest-environment jsdom` for React components, browser APIs, router behavior, and DOM-visible hooks.
- Rely on the Vite default `jsdom` environment only for test-infra and architecture checks where the environment is not part of the behavior.
- Use `describe()` and `it()` in `src/**/*.test.{ts,tsx}`.
- Do not use `test()` in Vitest files.
- Place `vi.mock()` calls before importing the module under test.
- Use `vi.mocked()` when configuring mocked module functions.
- Reset mocks in `beforeEach`.
- Use `afterEach` only for mandatory cleanup such as restoring spies or browser globals.
- Keep test names behavior-focused and specific.

Example:

```ts
// @vitest-environment node
vi.mock("@/shared/api/client", () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

import { describe, expect, it, vi } from "vitest";
import { apiClient } from "@/shared/api/client";
import { getGameThrows } from "./get-game";

describe("getGameThrows", () => {
  it("returns validated game state", async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce(validResponse);

    await expect(getGameThrows(1)).resolves.toEqual(validResponse);
  });
});
```

## Testing Library

Rules:

- Use Testing Library for React component and render-based hook behavior.
- Prefer `screen` over destructuring queries from `render()`.
- Prefer role, label, text, and accessible-name queries over CSS selectors.
- Use `findBy*` or `waitFor()` for async UI changes.
- Use `act()` only when Testing Library does not flush the update by itself.
- Assert visible behavior, route changes, store state, or API calls at the public boundary.
- Do not assert implementation details of third-party components.
- Do not use `screen.debug()` in committed tests.

## Mock boundaries

Rules:

- Mock API domain modules when testing pages, hooks, and components.
- Mock `apiClient` when testing API domain functions.
- Mock `fetch` only when testing `apiClient` itself or auth bootstrap code that intentionally bypasses `apiClient`.
- Mock browser APIs at the boundary: `EventSource`, `Audio`, `Storage`, `scrollTo`, wake lock, clipboard, and timers.
- Mock router hooks only when the test owns navigation behavior.
- Do not mock pure business logic from the same domain under test.
- Do not spy on Nanostore atom `.set()` methods.
- Assert Nanostore effects through exported actions, final store state, or rendered output.
- Use `createMockResponse` for mocked `Response` objects.

Rationale:

The codebase tests domain behavior through public seams. Spying on atom internals or
mocking pure logic makes tests pass against implementation details instead of behavior.

## Test data

Rules:

- Use `src/shared/types/*.test-support.ts` builders for shared DTOs.
- Extend existing builders before duplicating large backend response shapes inline.
- Keep small local object literals inline when they are narrower than a shared DTO.
- Keep page-specific fixtures inside the test file until they are reused.
- Keep invalid payload fixtures explicit in validation tests.
- Do not import `*.test-support.ts` from production code.

## Async and timers

Rules:

- Prefer awaited user actions, `findBy*`, and `waitFor()` over manual polling.
- Do not add arbitrary wall-clock sleeps to unit or component tests.
- Use fake timers or injected schedulers for timer-driven unit behavior.
- Use controlled Playwright route delays only when the scenario depends on a pending network state.
- Clean up pending promises, spies, and replaced globals before the next test observes them.

## API tests

Rules:

- Test each public API function against valid and invalid response shapes.
- Assert validation errors for malformed response payloads.
- Assert request method, endpoint, body, and options when they are part of the contract.
- Keep mapper tests co-located with mapper files.
- Do not couple API domain tests to rendered UI.

## Playwright

Rules:

- Put each E2E scenario under the matching `tests/<domain>/` folder.
- Import `{ test, expect }` from `@playwright/test`.
- Use shared helpers from `tests/shared/` for login, game creation, auth credentials, and route mocks.
- Call `skipWhenAuthCredentialsMissing()` in auth-dependent specs.
- Prefer `getByRole`, `getByLabel`, and `getByText` locators.
- Use `page.locator()` only for generated markup, CSS-module checks, or layout checks that have no accessible target.
- Wait through Playwright assertions instead of fixed sleeps.
- Keep `// spec:` and `// seed:` comments when a spec is derived from a test plan.
- Do not commit `playwright-report/` or `test-results/`.

## Coverage

Rules:

- Keep coverage at or above the configured thresholds.
- Add unit tests for new pure logic, mappers, API functions, and store actions.
- Add component tests for new conditional rendering, user input, loading states, and error states.
- Add Playwright coverage for cross-route flows, auth, responsive regressions, and browser-only behavior.
- Do not replace unit coverage with E2E coverage when the behavior is local and deterministic.

Thresholds:

```text
lines: 75
functions: 70
branches: 65
statements: 75
```

## Verification

Run:

```bash
npm run test
npm run test:e2e
npm run coverage
rg --files src tests | rg '(^|[/\\])__tests__([/\\]|$)'
rg -n '^\s*test\(' src --glob '*.{test,spec}.{ts,tsx}'
rg -n '\b(describe|it|test)\.only\b|\bfit\b|\bfdescribe\b' src tests --glob '*.{test,spec}.{ts,tsx}'
rg -n 'test-support' src --glob '!**/*.test.{ts,tsx}' --glob '!**/*.test-support.ts'
rg -n 'spyOn.*\.set|spyOn.*atom|screen\.debug' src --glob '*.test.{ts,tsx}'
```

Expected:

- `npm run test`, `npm run test:e2e`, and `npm run coverage` pass.
- The `rg` commands produce no project matches.
