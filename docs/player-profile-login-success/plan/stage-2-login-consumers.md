# Stage 2: Login And Auth-Bootstrap Consumers

## Objective

Ensure login and auth-bootstrap consumers handle the Stage 1 profile-backed authenticated
user without adding a second auth flow.

## Inputs

- `docs/player-profile-login-success/research/research.md`
- `docs/player-profile-login-success/design/design.md`
- `docs/convention/react.md`
- `docs/convention/state.md`
- `docs/convention/errors.md`
- Stage 1 implementation

## Exact File Scope

- `src/pages/LoginPage/useLogin.ts`
- `src/pages/LoginPage/useLogin.test.ts`
- `src/pages/LoginPage/useLoginPage.ts`
- `src/pages/LoginPage/useLoginPage.test.ts`
- `src/shared/hooks/useAuthenticatedUser.ts`
- `src/shared/hooks/useAuthenticatedUser.test.ts`
- `src/shared/store/auth.ts`
- `src/shared/store/auth.test.ts`
- `src/shared/store/auth.state.ts`

Do not change route declarations, page components, Playwright specs, or API validators in
this stage.

## Allowed Changes

- Keep direct non-`/api` login redirects using `invalidateAuthState()` and
  `resolveSafeLoginRedirect`.
- Keep `/api/*` login redirects using `getAuthenticatedUser`.
- Store profile-backed users with the existing auth store action.
- Navigate profile-backed users through the same safe redirect path as existing
  authenticated users.
- Preserve active-game redirect precedence in `useLoginPage`.
- For users without an active game, allow the profile-backed redirect to send them to
  `/playerprofile`.
- Map Stage 1 authorization failures with `mapAuthErrorMessage`.
- Do not render raw backend or error messages.

## Required Tests

- `useLogin` stores a profile-backed user and navigates to `/playerprofile`.
- `useLogin` displays a mapped authorization error when `getAuthenticatedUser` rejects for
  `success: false`.
- `useLogin` preserves existing admin and invite redirect behavior.
- `useLoginPage` redirects an already-authenticated profile-backed player to
  `/playerprofile` when there is no active game route.
- Auth store and `useAuthenticatedUser` tests cover profile-backed user retention if type
  changes affect those boundaries.

## Verification Commands

```bash
npm run test -- src/pages/LoginPage/useLogin.test.ts
npm run test -- src/pages/LoginPage/useLoginPage.test.ts
npm run test -- src/shared/hooks/useAuthenticatedUser.test.ts
npm run test -- src/shared/store/auth.test.ts
npm run typecheck
npm run eslint
```

## Rollback Notes

Revert this stage before reverting Stage 1. Leaving profile API support in place is safe
only if consumers still compile and tests pass.
