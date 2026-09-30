# Plan: Player Profile Login Success

## Inputs

- Research: `docs/player-profile-login-success/research/research.md`
- Approved design: `docs/player-profile-login-success/design/design.md`
- Coding standards: `docs/convention/coding-standards.md`
- API conventions: `docs/convention/api.md`
- Architecture conventions: `docs/convention/architecture.md`
- React conventions: `docs/convention/react.md`
- State conventions: `docs/convention/state.md`
- TypeScript conventions: `docs/convention/typescript.md`
- Error conventions: `docs/convention/errors.md`
- Testing conventions: `docs/convention/testing.md`

## Implementation Boundary

Implementation must not start until this plan is approved by the human.

`docs/backend-api-contract.json` does not currently document the profile envelope. Unless
an updated backend contract is supplied before implementation, use only the task-provided
shape from research: `{ success: true, profile: { id, nickname, stats: { gamesPlayed,
scoreAverage } } }`. Do not infer extra backend fields.

## Stages

1. Stage 1: Auth API response handling
   - Stage file: `docs/player-profile-login-success/plan/stage-1-auth-api.md`
   - Objective: accept the profile envelope, preserve existing redirect shapes, and treat
     `success: false` as an authorization failure.
   - Exact file scope:
     - `src/shared/api/auth.ts`
     - `src/shared/api/auth.test.ts`
   - Allowed changes:
     - Add explicit profile/stat interfaces and full runtime validators.
     - Extend `/login/success` response validation to include the profile envelope.
     - Normalize the profile envelope into the existing authenticated-user flow without
       removing current admin, invite, or direct-user response support.
     - Change `success: false` handling from unauthenticated `null` to a typed `ApiError`
       authorization failure.
   - Required tests:
     - Profile envelope is accepted and normalized with player role and `/playerprofile`
       redirect.
     - Existing wrapped and direct authenticated-user shapes still pass.
     - Malformed profile envelopes fail validation.
     - `success: false` rejects with `ApiError`.
   - Verification commands:
     - `npm run test -- src/shared/api/auth.test.ts`
     - `npm run typecheck`
     - `npm run eslint`

2. Stage 2: Login and auth-bootstrap consumers
   - Stage file: `docs/player-profile-login-success/plan/stage-2-login-consumers.md`
   - Objective: ensure login and already-authenticated login-page flows store profile
     results and navigate through the existing safe redirect path.
   - Exact file scope:
     - `src/pages/LoginPage/useLogin.ts`
     - `src/pages/LoginPage/useLogin.test.ts`
     - `src/pages/LoginPage/useLoginPage.ts`
     - `src/pages/LoginPage/useLoginPage.test.ts`
     - `src/shared/hooks/useAuthenticatedUser.ts`
     - `src/shared/hooks/useAuthenticatedUser.test.ts`
     - `src/shared/store/auth.ts`
     - `src/shared/store/auth.test.ts`
     - `src/shared/store/auth.state.ts`
   - Allowed changes:
     - Keep non-`/api` redirect behavior unchanged.
     - Keep external redirect sanitization through `resolveSafeLoginRedirect`.
     - Store profile-backed authenticated users through existing auth store actions.
     - Route profile-backed users to the safe authenticated redirect supplied by Stage 1.
     - Map authorization failures through existing auth error handling.
     - Do not introduce a second auth store or parallel auth bootstrap path.
   - Required tests:
     - `/api/*` login success with profile data stores the user and navigates to
       `/playerprofile`.
     - `success: false` from the login-success call displays the mapped authorization
       error.
     - Already-authenticated profile-backed users are redirected away from login to
       `/playerprofile`.
     - Existing admin and invite redirect tests continue to pass.
   - Verification commands:
     - `npm run test -- src/pages/LoginPage/useLogin.test.ts`
     - `npm run test -- src/pages/LoginPage/useLoginPage.test.ts`
     - `npm run test -- src/shared/hooks/useAuthenticatedUser.test.ts`
     - `npm run test -- src/shared/store/auth.test.ts`
     - `npm run typecheck`
     - `npm run eslint`

3. Stage 3: Player profile rendering
   - Stage file: `docs/player-profile-login-success/plan/stage-3-player-profile-ui.md`
   - Objective: display profile envelope data on the existing `/playerprofile` page while
     preserving current fallback rendering.
   - Exact file scope:
     - `src/pages/PlayerProfilePage/index.tsx`
     - `src/pages/PlayerProfilePage/index.test.tsx`
   - Allowed changes:
     - Render profile nickname and stats when profile data exists on the authenticated
       user.
     - Preserve current username/email/roles fallback behavior when profile data is not
       present.
     - Keep the page on the existing `ROUTES.playerProfile` route.
     - Do not add a new route or rename `/playerprofile`.
   - Required tests:
     - Profile nickname, games played, and score average render for profile-backed users.
     - Existing username/email fallback behavior still passes.
     - Existing hook error rendering still passes.
   - Verification commands:
     - `npm run test -- src/pages/PlayerProfilePage/index.test.tsx`
     - `npm run typecheck`
     - `npm run eslint`

4. Stage 4: Browser-flow coverage and final validation
   - Stage file: `docs/player-profile-login-success/plan/stage-4-browser-validation.md`
   - Objective: cover the cross-route browser behavior for profile login success without
     weakening existing admin or invite flows.
   - Exact file scope:
     - `tests/shared/auth-route-mocks.ts`
     - `tests/auth/successful-login.spec.ts`
     - `tests/player-profile/login-success-profile.spec.ts`
   - Allowed changes:
     - Add Playwright route mocks for profile login-success payloads.
     - Add a browser flow proving ordinary player login reaches `/playerprofile` and
       renders profile data.
     - Keep existing admin successful-login behavior intact.
     - Do not add sleeps or bypass auth helpers.
   - Required tests:
     - Successful admin login still reaches `/start`.
     - Profile login-success response reaches `/playerprofile`.
     - Profile page renders nickname, games played, and score average from mocked
       login-success profile data.
   - Verification commands:
     - `npm run test:e2e -- tests/auth/successful-login.spec.ts`
     - `npm run test:e2e -- tests/player-profile/login-success-profile.spec.ts`
     - `npm run validate:push`

## Rollback Notes

- Revert Stage 4 first to remove only browser-flow coverage changes.
- Revert Stage 3 next to restore previous profile page rendering.
- Revert Stage 2 next to restore previous login/auth consumer behavior.
- Revert Stage 1 last; it owns the API response shape and `success: false` semantic
  change.
- Do not partially revert shared auth type changes while consumers still reference the new
  profile fields.

## Final Verification

- `npm run build`
- `npm run eslint`
- `npm run stylelint`
- `npm run prettier:check`
- `npm run test`
- `npm run typecheck`
- `npm run secrets:check`
- `npm run test:e2e`
- `npm run validate:push`
