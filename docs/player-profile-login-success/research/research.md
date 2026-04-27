# Research: Player Profile Login Success

## Task

Research frontend support for the updated `GET /api/login/success` behavior after a
successful login. The frontend must handle redirect responses for admin and invite flows,
profile responses for ordinary players without an invite link, and `success: false` as an
authorization error.

## Scope Boundary

- In scope: current login-success API consumption, auth bootstrap, route guards, existing
  player profile route/page, redirect handling, and related tests.
- Out of scope: production implementation, UI design, backend statistics calculation,
  migrations, dependency changes, and refactoring decisions.

## Relevant Project Rules

- `docs/convention/coding-standards.md`: backend API contract source-of-truth is
  `docs/backend-api-contract.json`; use `docs/convention/api.md` for frontend API
  conventions. Evidence: `docs/convention/coding-standards.md:5`,
  `docs/convention/coding-standards.md:8`.
- `docs/convention/architecture.md`: the app is pages-based with dependency direction
  `app -> pages -> shared`; routing is centralized in `src/app/App.tsx` and route paths
  come from `ROUTES`. Evidence: `docs/convention/architecture.md:31`,
  `docs/convention/architecture.md:46`, `docs/convention/architecture.md:159`,
  `docs/convention/architecture.md:175`.
- `docs/convention/api.md`: every `apiClient` call must pass a full response-shape
  validator; domain functions re-check validated responses and throw `ApiError` on
  unexpected shapes. Evidence: `docs/convention/api.md:35`,
  `docs/convention/api.md:57`, `docs/convention/api.md:74`.
- `docs/convention/typescript.md`: production code must use full runtime validation
  before casts and exported functions/components require explicit return types. Evidence:
  `docs/convention/typescript.md:23`, `docs/convention/typescript.md:37`,
  `docs/convention/typescript.md:55`.
- `docs/convention/react.md`: page-private hooks live next to the page, cross-page hooks
  live under `src/shared/hooks/`, and `ProtectedRoutes` owns role-based route behavior.
  Evidence: `docs/convention/react.md:55`, `docs/convention/react.md:132`.
- `docs/convention/errors.md`: user-facing auth errors go through `mapAuthErrorMessage`;
  raw error messages must not be rendered directly. Evidence: `docs/convention/errors.md:82`,
  `docs/convention/errors.md:90`.
- `docs/convention/testing.md`: API tests use shared API test helpers, Vitest tests are
  co-located, and Playwright specs live under `tests/<domain>/`. Evidence:
  `docs/convention/testing.md:12`, `docs/convention/testing.md:15`,
  `docs/convention/testing.md:16`.

## Facts

### Architecture

- [F-ARCH-001] Router construction is centralized in `createAppRouter` with
  `createBrowserRouter` and `createRoutesFromElements`. Evidence: `src/app/App.tsx:73`,
  `src/app/App.tsx:74`, `src/app/App.tsx:75`.
- [F-ARCH-002] `LoginPage` and `PlayerProfilePage` are lazy-loaded route pages from
  `@/pages/LoginPage` and `@/pages/PlayerProfilePage`. Evidence: `src/app/App.tsx:28`,
  `src/app/App.tsx:38`.
- [F-ARCH-003] Public route constants include `ROUTES.login` as `/`, `ROUTES.joined` as
  `/joined`, and `ROUTES.playerProfile` as `/playerprofile`. Evidence:
  `src/shared/lib/router/routes.ts:2`, `src/shared/lib/router/routes.ts:14`,
  `src/shared/lib/router/routes.ts:15`.
- [F-ARCH-004] Admin routes are nested under `ProtectedRoutes` with
  `allowedRoles={["ROLE_ADMIN"]}`; player routes are nested under `ProtectedRoutes` with
  `allowedRoles={["ROLE_PLAYER"]}`. Evidence: `src/app/App.tsx:88`,
  `src/app/App.tsx:89`, `src/app/App.tsx:134`, `src/app/App.tsx:135`.
- [F-ARCH-005] The player profile route is currently protected by the player-role route
  group and uses `ROUTES.playerProfile`. Evidence: `src/app/App.tsx:143`,
  `src/app/App.tsx:144`, `src/app/App.tsx:145`.
- [F-ARCH-006] `ProtectedRoutes` redirects unauthenticated users to `ROUTES.login` and
  redirects authenticated users without required roles to `/start` for admin or `/joined`
  for player roles. Evidence: `src/app/ProtectedRoutes.tsx:15`,
  `src/app/ProtectedRoutes.tsx:17`, `src/app/ProtectedRoutes.tsx:20`,
  `src/app/ProtectedRoutes.tsx:21`, `src/app/ProtectedRoutes.tsx:43`,
  `src/app/ProtectedRoutes.tsx:44`, `src/app/ProtectedRoutes.tsx:50`,
  `src/app/ProtectedRoutes.tsx:51`.
- [F-ARCH-007] `PlayerProfilePage` reads from `useAuthenticatedUser`; it is not fed by a
  route loader or route params. Evidence: `src/pages/PlayerProfilePage/index.tsx:1`,
  `src/pages/PlayerProfilePage/index.tsx:37`, `src/pages/PlayerProfilePage/index.tsx:38`.

### Domain And Data

- [F-DATA-001] `LoginResponse` currently contains optional `redirect`, `success`,
  `error`, and `last_username` fields. Evidence: `src/shared/api/auth.ts:9`,
  `src/shared/api/auth.ts:10`, `src/shared/api/auth.ts:11`,
  `src/shared/api/auth.ts:12`, `src/shared/api/auth.ts:13`.
- [F-DATA-002] `AuthenticatedUser` currently requires `success`, `roles`, `id`, and
  `redirect`, with optional `email`, `username`, and `gameId`. Evidence:
  `src/shared/api/auth.ts:38`, `src/shared/api/auth.ts:39`,
  `src/shared/api/auth.ts:40`, `src/shared/api/auth.ts:41`,
  `src/shared/api/auth.ts:42`, `src/shared/api/auth.ts:43`,
  `src/shared/api/auth.ts:44`, `src/shared/api/auth.ts:45`.
- [F-DATA-003] Current authenticated-user validation accepts a direct authenticated user
  only when `success === true`, roles are a valid role array, `id` is finite, and
  `redirect` is a string. Evidence: `src/shared/api/auth.ts:102`,
  `src/shared/api/auth.ts:104`, `src/shared/api/auth.ts:105`,
  `src/shared/api/auth.ts:106`, `src/shared/api/auth.ts:107`,
  `src/shared/api/auth.ts:108`.
- [F-DATA-004] The auth store holds `AuthenticatedUser | null` in `userAtom`; setting an
  authenticated user clears auth error and marks auth as checked. Evidence:
  `src/shared/store/auth.state.ts:4`, `src/shared/store/auth.ts:17`,
  `src/shared/store/auth.ts:18`, `src/shared/store/auth.ts:19`,
  `src/shared/store/auth.ts:20`.
- [F-DATA-005] `PlayerProfilePage` currently displays username/email fallback and roles
  from `AuthenticatedUser`; it does not display `gamesPlayed` or `scoreAverage`.
  Evidence: `src/pages/PlayerProfilePage/index.tsx:10`,
  `src/pages/PlayerProfilePage/index.tsx:47`,
  `src/pages/PlayerProfilePage/index.tsx:48`,
  `src/pages/PlayerProfilePage/index.tsx:49`.

### Integrations

- [F-INT-001] `loginWithCredentials` posts URL-encoded credentials to `/login` with
  `skipAuthRedirect: true` and validates through `isLoginResponse`. Evidence:
  `src/shared/api/auth.ts:128`, `src/shared/api/auth.ts:129`,
  `src/shared/api/auth.ts:133`, `src/shared/api/auth.ts:135`,
  `src/shared/api/auth.ts:136`.
- [F-INT-002] `getAuthenticatedUser` calls `GET /login/success` through `apiClient.get`
  with `skipAuthRedirect: true`, a timeout, an optional signal, and a validator. Evidence:
  `src/shared/api/auth.ts:201`, `src/shared/api/auth.ts:213`,
  `src/shared/api/auth.ts:214`, `src/shared/api/auth.ts:215`,
  `src/shared/api/auth.ts:216`, `src/shared/api/auth.ts:217`.
- [F-INT-003] `getAuthenticatedUser` accepts three current response shapes:
  `{ success: true, user: AuthenticatedUser }`, direct `AuthenticatedUser`, or
  `{ success: false }`. Evidence: `src/shared/api/auth.ts:205`,
  `src/shared/api/auth.ts:208`, `src/shared/api/auth.ts:209`,
  `src/shared/api/auth.ts:210`.
- [F-INT-004] `getAuthenticatedUser` returns the envelope user, direct user, or `null`
  for explicit unauthenticated payloads; unexpected validated fallthrough throws
  `ApiError`. Evidence: `src/shared/api/auth.ts:220`, `src/shared/api/auth.ts:221`,
  `src/shared/api/auth.ts:224`, `src/shared/api/auth.ts:225`,
  `src/shared/api/auth.ts:228`, `src/shared/api/auth.ts:229`,
  `src/shared/api/auth.ts:232`.
- [F-INT-005] `getAuthenticatedUser` maps `UnauthorizedError` to `null` and maps
  `ApiValidationError` to `ApiError("Unexpected response shape for authenticated user")`.
  Evidence: `src/shared/api/auth.ts:237`, `src/shared/api/auth.ts:238`,
  `src/shared/api/auth.ts:241`, `src/shared/api/auth.ts:242`.
- [F-INT-006] `apiClient` triggers the global unauthorized handler on 401 only when
  `skipAuthRedirect` is false, then throws `UnauthorizedError`. Evidence:
  `src/shared/api/client.ts:179`, `src/shared/api/client.ts:180`,
  `src/shared/api/client.ts:181`, `src/shared/api/client.ts:183`.
- [F-INT-007] `useLogin` follows `/api/*` login redirects by calling
  `getAuthenticatedUser`, storing the returned user, and navigating to the user's
  redirect. Evidence: `src/pages/LoginPage/useLogin.ts:75`,
  `src/pages/LoginPage/useLogin.ts:76`, `src/pages/LoginPage/useLogin.ts:77`,
  `src/pages/LoginPage/useLogin.ts:78`, `src/pages/LoginPage/useLogin.ts:79`,
  `src/pages/LoginPage/useLogin.ts:80`.
- [F-INT-008] `useLogin` invalidates cached auth state before navigating on non-API
  redirect responses. Evidence: `src/pages/LoginPage/useLogin.ts:75`,
  `src/pages/LoginPage/useLogin.ts:85`, `src/pages/LoginPage/useLogin.ts:86`.
- [F-INT-009] `useLoginPage` redirects already-authenticated users from the login page
  to active game route when available, otherwise to a safe `user.redirect` fallback.
  Evidence: `src/pages/LoginPage/useLoginPage.ts:51`,
  `src/pages/LoginPage/useLoginPage.ts:52`,
  `src/pages/LoginPage/useLoginPage.ts:53`,
  `src/pages/LoginPage/useLoginPage.ts:55`,
  `src/pages/LoginPage/useLoginPage.ts:56`,
  `src/pages/LoginPage/useLoginPage.ts:60`,
  `src/pages/LoginPage/useLoginPage.ts:63`,
  `src/pages/LoginPage/useLoginPage.ts:65`.
- [F-INT-010] Local backend contract still documents `GET /api/login/success` 200 as
  requiring `success` and `redirect` and listing roles/id/email/username fields; it does
  not document `profile`. Evidence: `docs/backend-api-contract.json:1734`,
  `docs/backend-api-contract.json:1740`, `docs/backend-api-contract.json:1745`,
  `docs/backend-api-contract.json:1751`, `docs/backend-api-contract.json:1758`,
  `docs/backend-api-contract.json:1763`, `docs/backend-api-contract.json:1768`,
  `docs/backend-api-contract.json:1773`.

### Tests

- [F-TEST-001] API auth tests cover `getAuthenticatedUser` success, 401, timeout,
  malformed authenticated payload, and `{ success: false }` paths for `/api/login/success`.
  Evidence: `src/shared/api/auth.test.ts:24`, `src/shared/api/auth.test.ts:49`,
  `src/shared/api/auth.test.ts:62`, `src/shared/api/auth.test.ts:86`,
  `src/shared/api/auth.test.ts:111`.
- [F-TEST-002] `useLogin` tests cover session fallback after login request failure,
  redirect response navigation, protected-source route navigation, and external redirect
  fallback. Evidence: `src/pages/LoginPage/useLogin.test.ts:53`,
  `src/pages/LoginPage/useLogin.test.ts:91`,
  `src/pages/LoginPage/useLogin.test.ts:108`,
  `src/pages/LoginPage/useLogin.test.ts:131`.
- [F-TEST-003] `useLoginPage` tests cover authenticated-user redirect behavior from
  login page mount. Evidence: `src/pages/LoginPage/useLoginPage.test.ts:65`,
  `src/pages/LoginPage/useLoginPage.test.ts:84`,
  `src/pages/LoginPage/useLoginPage.test.ts:104`.
- [F-TEST-004] `ProtectedRoutes` tests cover `/joined` loading skeleton and role-based
  fallback redirects to `/joined` or `/start`. Evidence:
  `src/app/ProtectedRoutes.test.tsx:57`, `src/app/ProtectedRoutes.test.tsx:86`,
  `src/app/ProtectedRoutes.test.tsx:111`.
- [F-TEST-005] `PlayerProfilePage` tests cover authenticated display formatting,
  username/email fallback, and hook error rendering. Evidence:
  `src/pages/PlayerProfilePage/index.test.tsx:35`,
  `src/pages/PlayerProfilePage/index.test.tsx:57`,
  `src/pages/PlayerProfilePage/index.test.tsx:69`.
- [F-TEST-006] Shared Playwright auth route mocks define `/api/login/success` as
  unauthenticated and `/api/login` as failed login. Evidence:
  `tests/shared/auth-route-mocks.ts:12`, `tests/shared/auth-route-mocks.ts:21`.
- [F-TEST-007] Playwright auth specs cover successful login redirect to `/start`, failed
  credential behavior, and authenticated-route redirects. Evidence:
  `tests/auth/successful-login.spec.ts:13`, `tests/auth/successful-login.spec.ts:37`,
  `tests/auth/wrong-credentials-login.spec.ts:9`,
  `tests/auth/wrong-credentials-login.spec.ts:29`,
  `tests/auth/authenticated-redirect.spec.ts:13`,
  `tests/auth/authenticated-redirect.spec.ts:27`.
- [F-TEST-008] Joined-game Playwright specs mock `/api/login/success` and cover
  authenticated `/joined` rendering plus unauthenticated redirect to login. Evidence:
  `tests/joined-game/display-confirmation.spec.ts:8`,
  `tests/joined-game/display-confirmation.spec.ts:31`,
  `tests/joined-game/unauthenticated-access.spec.ts:10`,
  `tests/joined-game/unauthenticated-access.spec.ts:35`.

### Risks

- [F-RISK-001] The current `getAuthenticatedUser` validator does not accept the new
  user-provided `profile` envelope shape because valid authenticated shapes require
  wrapped or direct `AuthenticatedUser` data, while `{ success: false }` is the only
  non-user success-status shape. Evidence: `src/shared/api/auth.ts:205`,
  `src/shared/api/auth.ts:208`, `src/shared/api/auth.ts:209`,
  `src/shared/api/auth.ts:210`.
- [F-RISK-002] A `{ success: false }` payload from `/login/success` is currently treated
  as `null` authenticated user rather than as a displayed authorization error by
  `getAuthenticatedUser`. Evidence: `src/shared/api/auth.ts:228`,
  `src/shared/api/auth.ts:229`.
- [F-RISK-003] Existing player-role fallback for unauthorized admin routes goes to
  `/joined`, not to `/playerprofile`. Evidence: `src/app/ProtectedRoutes.tsx:20`,
  `src/app/ProtectedRoutes.tsx:21`.
- [F-RISK-004] `resolveSafeLoginRedirect` sanitizes external redirect targets to a
  fallback path. Evidence: `src/pages/LoginPage/lib/safeRedirect.ts:14`,
  `src/pages/LoginPage/lib/safeRedirect.ts:18`,
  `src/pages/LoginPage/lib/safeRedirect.ts:20`,
  `src/pages/LoginPage/lib/safeRedirect.ts:25`,
  `src/pages/LoginPage/lib/safeRedirect.ts:35`.
- [F-RISK-005] Login UI error text is mapped through `mapAuthErrorMessage`, not raw
  backend error text. Evidence: `src/pages/LoginPage/useLogin.ts:66`,
  `src/pages/LoginPage/useLogin.ts:67`, `src/pages/LoginPage/useLogin.ts:105`,
  `src/pages/LoginPage/useLogin.ts:106`.

## Relevant Files

| Path                                               | Why It Matters                                                                                                     |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------ |
| `docs/backend-api-contract.json`                   | Current repository API source-of-truth for `/api/login/success`; does not yet show the provided `profile` payload. |
| `docs/convention/api.md`                           | Frontend API validation and error-handling conventions for any login-success DTO change.                           |
| `docs/convention/architecture.md`                  | Route and layer-boundary rules for login/profile page changes.                                                     |
| `docs/convention/react.md`                         | Hook, effect, and `ProtectedRoutes` conventions for login/profile flows.                                           |
| `docs/convention/typescript.md`                    | Type guard and explicit type requirements for new response shapes.                                                 |
| `docs/convention/errors.md`                        | User-facing error mapping requirements for authorization failures.                                                 |
| `docs/convention/testing.md`                       | Test placement and API/Playwright coverage expectations.                                                           |
| `src/shared/api/auth.ts`                           | Owns `LoginResponse`, `AuthenticatedUser`, `/login`, and `/login/success` validators/functions.                    |
| `src/shared/api/auth.test.ts`                      | Existing API-level auth response coverage.                                                                         |
| `src/shared/hooks/useAuthenticatedUser.ts`         | Cross-page auth bootstrap consumer of `getAuthenticatedUser`.                                                      |
| `src/shared/store/auth.ts`                         | Central auth cache actions and state transition behavior.                                                          |
| `src/shared/store/auth.state.ts`                   | Auth atom data shape currently tied to `AuthenticatedUser                                                          | null`. |
| `src/pages/LoginPage/useLogin.ts`                  | Login action branching for direct redirects, `/api/*` redirects, fallback session checks, and auth errors.         |
| `src/pages/LoginPage/useLoginPage.ts`              | Redirects authenticated users away from login based on active game or safe user redirect.                          |
| `src/pages/LoginPage/lib/safeRedirect.ts`          | Internal/same-origin redirect allowlist logic.                                                                     |
| `src/pages/PlayerProfilePage/index.tsx`            | Existing player profile UI route target and current displayed fields.                                              |
| `src/pages/PlayerProfilePage/index.test.tsx`       | Existing profile display tests.                                                                                    |
| `src/app/App.tsx`                                  | Route tree, role groups, lazy page registration, and unauthorized navigation bridge.                               |
| `src/app/ProtectedRoutes.tsx`                      | Role-based route authorization, loading skeletons, and fallback route decisions.                                   |
| `src/app/ProtectedRoutes.test.tsx`                 | Current route guard behavior coverage.                                                                             |
| `src/shared/lib/router/routes.ts`                  | Canonical frontend route constants including `/joined` and `/playerprofile`.                                       |
| `tests/shared/auth-route-mocks.ts`                 | Shared Playwright auth endpoint mocks.                                                                             |
| `tests/auth/successful-login.spec.ts`              | Existing login-success E2E coverage for admin `/start` redirect.                                                   |
| `tests/joined-game/display-confirmation.spec.ts`   | Existing joined-flow E2E coverage with mocked login-success response.                                              |
| `tests/joined-game/unauthenticated-access.spec.ts` | Existing unauthenticated `/joined` guard coverage.                                                                 |

## Unknowns

- [U-001] `NOT FOUND`: the current repository `docs/backend-api-contract.json` does not
  document the provided `profile` response shape for `GET /api/login/success`; searched
  `/api/login/success` schema in `docs/backend-api-contract.json`.
- [U-002] `NOT FOUND`: no current production type or validator for
  `{ success: true, profile: { id, nickname, stats: { gamesPlayed, scoreAverage } } }`
  was found in `src/shared/api/auth.ts`, `src/shared/hooks/useAuthenticatedUser.ts`,
  or `src/pages/PlayerProfilePage`.
- [U-003] `NOT FOUND`: no frontend route constant named `/profile` exists; current
  player profile route constant is `/playerprofile`. Evidence:
  `src/shared/lib/router/routes.ts:15`.
- [U-004] `NOT FOUND`: no tests were found for `/api/login/success` returning the new
  `profile` envelope in `src/**/*.test.{ts,tsx}` or `tests/**/*.spec.ts`.
- [U-005] `NOT FOUND`: no tests were found for `/api/login/success` returning a redirect
  specifically to `ROUTES.playerProfile` or `/playerprofile`.

## Context For Next Phase

Design must use these minimum facts:

- `/api/login/success` is already consumed through `getAuthenticatedUser` and
  `useAuthenticatedUser`; both currently model authenticated data as
  `AuthenticatedUser | null`.
- Existing login flow already distinguishes direct redirect values from `/api/*`
  redirects and already sanitizes redirect targets.
- Existing `PlayerProfilePage` is present at `/playerprofile`, protected for
  `ROLE_PLAYER`, and currently renders only username/email/roles from
  `AuthenticatedUser`.
- The local backend contract has not yet been updated with the provided `profile`
  envelope, so the new shape is currently task-provided input rather than contract-file
  evidence.
- Existing tests cover admin redirect, joined redirect/guards, auth bootstrap failures,
  and current profile rendering, but not the new profile envelope.
