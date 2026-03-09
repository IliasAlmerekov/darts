# Playwright E2E Tests for Joined Game

## Scope

This folder now contains only the specs for the dedicated joined-game feature:

- `display-confirmation.spec.ts`
- `page-layout.spec.ts`
- `unauthenticated-access.spec.ts`

Other Playwright scenarios now live in scenario-based folders under `tests/`, such as:

- `tests/auth/`
- `tests/accessibility/`
- `tests/responsive/`
- `tests/start/`
- `tests/game/`
- `tests/shared/`

## Fixing Version Conflicts

If tests fail with version conflict errors, clear the caches and reinstall:

```bash
# Clear npm cache
npm cache clean --force

# Clear npx cache (Windows PowerShell)
Remove-Item -Recurse -Force "$env:LOCALAPPDATA\npm-cache\_npx"

# Or for Command Prompt
rd /s /q %LOCALAPPDATA%\npm-cache\_npx

# Reinstall dependencies
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install

# Install Playwright browsers
npx playwright install chromium
```

## Running Tests

```bash
# Start the dev server first
npm run dev

# In another terminal, run all tests
npm run test:e2e

# Run a specific joined-game test
npx playwright test tests/joined-game/display-confirmation.spec.ts

# Run with UI mode
npx playwright test --ui
```

## Joined-game Test Files

- `display-confirmation.spec.ts` - Verifies joined-game confirmation content and headings
- `page-layout.spec.ts` - Tests joined-game layout structure and overflow behavior
- `unauthenticated-access.spec.ts` - Tests redirect behavior for unauthorized users

## Test Credentials

Use environment variables for credentials in local/CI runs. The auth-dependent
specs use them when available and are skipped with an explicit reason when they
are missing:

- `PLAYWRIGHT_TEST_EMAIL`
- `PLAYWRIGHT_TEST_PASSWORD`

Example (PowerShell):

```bash
$env:PLAYWRIGHT_TEST_EMAIL="tester@example.com"
$env:PLAYWRIGHT_TEST_PASSWORD="change-me"
npm run test:e2e
```

Local alternative:

```bash
# .env.local
PLAYWRIGHT_TEST_EMAIL=tester@example.com
PLAYWRIGHT_TEST_PASSWORD=change-me
```

## Debugging Commands

```bash
# Run in headed mode (visible browser)
npx playwright test --headed

# Debug with step-by-step execution
npx playwright test --debug

# Generate HTML report
npx playwright test --reporter=html
npx playwright show-report
```
