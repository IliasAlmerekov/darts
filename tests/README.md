# Playwright E2E Tests

The Playwright suite is organized by scenario instead of storing every spec in one folder.

## Structure

- `auth/` — login, redirects, auth errors, and registration navigation
- `accessibility/` — keyboard, screen-reader, and focus indicator coverage
- `responsive/` — responsive layout checks across login/start/game flows
- `joined-game/` — joined-game confirmation route behavior
- `start/` — room creation, player management, and start-page scenarios
- `game/` — in-game throw mechanics and gameplay flows
- `shared/` — reusable Playwright helpers and the seed spec

## Running tests

```bash
npm run test:e2e
npx playwright test tests/auth
npx playwright test tests/start/create-game-successfully.spec.ts
```
