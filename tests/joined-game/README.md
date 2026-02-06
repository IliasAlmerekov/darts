# Playwright E2E Tests for Joined Game Feature

## Current Status

✅ **Test files generated**: 3 comprehensive test files covering key scenarios from the test plan  
✅ **Playwright installed**: `@playwright/test` is in package.json  
⚠️ **Version conflict**: If you see "Playwright Test did not expect test() to be called here" errors, follow the fix below

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

# Run a specific test
npx playwright test tests/joined-game/display-confirmation.spec.ts

# Run with UI mode
npx playwright test --ui
```

## Generated Test Files

### 1. Page Display Tests

- `display-confirmation.spec.ts` - Verifies page content and headings
- `page-layout.spec.ts` - Tests CSS styling, layout structure, and responsive design
- `unauthenticated-access.spec.ts` - Tests redirect behavior for unauthorized users

## Test Credentials

Use environment variables for credentials in local/CI runs:

- `PLAYWRIGHT_TEST_EMAIL`
- `PLAYWRIGHT_TEST_PASSWORD`

Example (PowerShell):

```bash
$env:PLAYWRIGHT_TEST_EMAIL="tester@example.com"
$env:PLAYWRIGHT_TEST_PASSWORD="change-me"
npm run test:e2e
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
