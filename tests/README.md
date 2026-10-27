# Playwright E2E Tests

The Playwright suite is organized by scenario instead of storing every spec in one folder.
The Markdown test plans the specs trace to live in `docs/test-plans/`.

## Structure

- `auth/` — login, redirects, auth errors, and registration navigation
- `accessibility/` — keyboard, screen-reader, and focus indicator coverage
- `responsive/` — responsive layout checks across login/start/game flows
- `joined-game/` — joined-game confirmation route behavior
- `start/` — room creation, player management, and start-page scenarios
- `game/` — in-game throw mechanics and gameplay flows
- `live/` — opt-in scenarios against a real backend, plus their preflight
- `harness/` — self-tests for the shared Playwright fixtures
- `shared/` — reusable Playwright helpers and the seed spec

## Mocked and live suites

`npm run test:e2e` runs the mocked suite. It needs no secrets and no backend. Every spec
outside `live/` imports `{ test, expect }` from `tests/shared/test.ts`, whose fixture aborts
any `/api` request that no route mock answers and fails the test with the request name.
Mock the requests a scenario makes with the helpers in `shared/`.

`npm run test:e2e:live` runs `live/` against a running backend. It needs
`PLAYWRIGHT_TEST_EMAIL`, `PLAYWRIGHT_TEST_PASSWORD`, and `VITE_API_TARGET` pointing at the
backend. A preflight checks them and `GET /api/health` first, and fails the run with a message
naming what is missing. CI runs it only on demand: the `E2E live` GitHub workflow and the
GitLab `e2e_live` job in "Run pipeline" pipelines.

`PLAYWRIGHT_BASE_URL` sets the app URL for both suites, and Playwright starts the dev server on
its host and port. Navigate with relative paths only.

The docker compose stack already serves the app on port 5173, and a local run reuses whatever
answers there. Run `PLAYWRIGHT_BASE_URL=http://127.0.0.1:5174 npm run test:e2e` so Playwright
starts its own dev server from your working tree.

## Running tests

```bash
npm run test:e2e
npm run test:e2e:live
npx playwright test --project=mocked tests/auth
npx playwright test --project=mocked tests/start/create-game-successfully.spec.ts
```
