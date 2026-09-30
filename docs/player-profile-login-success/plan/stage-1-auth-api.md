# Stage 1: Auth API Response Handling

## Objective

Accept the updated `GET /api/login/success` response shapes at the API boundary while
preserving existing redirect responses and changing `success: false` into an authorization
failure.

## Inputs

- `docs/player-profile-login-success/research/research.md`
- `docs/player-profile-login-success/design/design.md`
- `docs/convention/api.md`
- `docs/convention/typescript.md`
- `docs/convention/errors.md`
- `docs/backend-api-contract.json`

## Exact File Scope

- `src/shared/api/auth.ts`
- `src/shared/api/auth.test.ts`

No other files may be changed in this stage.

## Allowed Changes

- Add explicit interfaces for profile login-success data:
  - profile id
  - nickname
  - stats.gamesPlayed
  - stats.scoreAverage
- Add full runtime guards for the task-provided profile envelope.
- Extend the existing `getAuthenticatedUser` validator to accept:
  - existing `{ success: true, user: AuthenticatedUser }`
  - existing direct `AuthenticatedUser`
  - new `{ success: true, profile: ... }`
  - existing malformed shapes must still fail validation.
- Normalize the profile envelope into the existing authenticated-user flow with:
  - `roles: ["ROLE_PLAYER"]`
  - `redirect: "/playerprofile"` via the canonical route constant if imported in scope
  - profile data preserved for `PlayerProfilePage`
- Throw `ApiError` for `{ success: false }`; do not return `null` for this payload.
- Keep `UnauthorizedError` transport handling mapped to `null`.
- Keep `ApiValidationError` rewrapped as `ApiError("Unexpected response shape for authenticated user")`.

## Required Tests

- `getAuthenticatedUser` returns a normalized player user for the profile envelope.
- The normalized player user includes profile stats and redirects to `/playerprofile`.
- Existing wrapped authenticated-user response still returns the wrapped user.
- Existing direct authenticated-user response still returns the direct user.
- `{ success: false }` rejects with `ApiError`.
- Malformed profile envelopes reject as an unexpected response shape.

## Verification Commands

```bash
npm run test -- src/shared/api/auth.test.ts
npm run typecheck
npm run eslint
```

## Rollback Notes

Revert only `src/shared/api/auth.ts` and `src/shared/api/auth.test.ts` to restore the
previous login-success API contract. Do not proceed to later stages if this rollback is
needed.
