# Stage 4: Browser-Flow Coverage And Final Validation

## Objective

Add browser-level coverage for ordinary player login-success profile responses while
preserving the existing admin successful-login flow.

## Inputs

- `docs/player-profile-login-success/research/research.md`
- `docs/player-profile-login-success/design/design.md`
- `docs/convention/testing.md`
- Stage 1 implementation
- Stage 2 implementation
- Stage 3 implementation

## Exact File Scope

- `tests/shared/auth-route-mocks.ts`
- `tests/auth/successful-login.spec.ts`
- `tests/player-profile/login-success-profile.spec.ts`

Do not change application production files in this stage.

## Allowed Changes

- Add a shared Playwright mock for the profile login-success response.
- Add or extend a browser spec for ordinary player login that reaches `/playerprofile`.
- Assert visible profile page data from the mocked profile response.
- Keep the existing admin login spec proving `/start` navigation.
- Use existing auth credential helpers and route-mocking patterns.
- Do not add arbitrary sleeps.
- Do not bypass route guards or auth bootstrap logic.

## Required Tests

- Existing successful admin login reaches `/start`.
- Ordinary player login with profile login-success reaches `/playerprofile`.
- Profile page renders nickname, games played, and score average in the browser.

## Verification Commands

```bash
npm run test:e2e -- tests/auth/successful-login.spec.ts
npm run test:e2e -- tests/player-profile/login-success-profile.spec.ts
npm run validate:push
```

## Rollback Notes

Revert the Playwright mock/spec changes if browser coverage is unstable. Do not revert
earlier stages unless unit or integration behavior is also incorrect.
