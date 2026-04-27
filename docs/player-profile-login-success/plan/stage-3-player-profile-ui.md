# Stage 3: Player Profile Rendering

## Objective

Render profile envelope data on the existing player profile page while preserving current
fallback behavior for older authenticated-user shapes.

## Inputs

- `docs/player-profile-login-success/research/research.md`
- `docs/player-profile-login-success/design/design.md`
- `docs/convention/react.md`
- `docs/convention/typescript.md`
- `docs/convention/testing.md`
- Stage 1 implementation
- Stage 2 implementation

## Exact File Scope

- `src/pages/PlayerProfilePage/index.tsx`
- `src/pages/PlayerProfilePage/index.test.tsx`

No route, API, store, or CSS files may be changed in this stage unless a test proves the
existing page file cannot render the required data without them.

## Allowed Changes

- Read profile data from the authenticated user returned by `useAuthenticatedUser`.
- Display profile nickname when present.
- Display `gamesPlayed` and `scoreAverage` when present.
- Preserve current username/email fallback when profile data is absent.
- Preserve current role rendering when profile data is absent.
- Preserve existing error rendering through the hook result.
- Do not create a new `/profile` route.
- Do not rename `ROUTES.playerProfile` or `/playerprofile`.

## Required Tests

- Profile-backed authenticated user renders nickname.
- Profile-backed authenticated user renders games played.
- Profile-backed authenticated user renders score average.
- Existing authenticated display formatting test still passes.
- Existing username/email fallback test still passes.
- Existing hook error rendering test still passes.

## Verification Commands

```bash
npm run test -- src/pages/PlayerProfilePage/index.test.tsx
npm run typecheck
npm run eslint
```

## Rollback Notes

Revert only the page and its test to return to the previous display. Keep Stage 1 and
Stage 2 if profile-backed users should still authenticate but not display stats yet.
