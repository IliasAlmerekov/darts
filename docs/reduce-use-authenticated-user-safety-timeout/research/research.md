# Research: Reduce safety timeout in useAuthenticatedUser

**Date:** 2026-03-06

**Ticket:** Reduce safety timeout in `useAuthenticatedUser` from `10000` to `5000`, or replace it with AbortController timeout as part of task 3.2.

**Task slug:** `reduce-use-authenticated-user-safety-timeout`

## Current State

`useAuthenticatedUser` already exists, already creates an `AbortController`, and already calls an auth API function that has its own timeout-based abort path.

## Facts

- [F1] `useAuthenticatedUser` returns `{ user, loading, error }`, initializes `loading` with `true`, creates an `AbortController`, and starts a `window.setTimeout` safety timeout with `10000` milliseconds. Evidence: `src/shared/hooks/useAuthenticatedUser.ts:18`, `src/shared/hooks/useAuthenticatedUser.ts:20`, `src/shared/hooks/useAuthenticatedUser.ts:24`, `src/shared/hooks/useAuthenticatedUser.ts:25`, `src/shared/hooks/useAuthenticatedUser.ts:30`.
- [F2] The hook calls `getAuthenticatedUser` with `controller.signal`, clears the safety timeout in the async `finally` block, and also clears the timeout plus aborts the controller in the effect cleanup. Evidence: `src/shared/hooks/useAuthenticatedUser.ts:34`, `src/shared/hooks/useAuthenticatedUser.ts:56`, `src/shared/hooks/useAuthenticatedUser.ts:66`, `src/shared/hooks/useAuthenticatedUser.ts:67`.
- [F3] When the fetched authenticated user contains a numeric `gameId`, the hook calls `setCurrentGameId(userData.gameId)`. Evidence: `src/shared/hooks/useAuthenticatedUser.ts:3`, `src/shared/hooks/useAuthenticatedUser.ts:42`.
- [F4] `getAuthenticatedUser` accepts `signal?: AbortSignal` and `timeoutMs?: number`, and its default timeout constant is `AUTH_CHECK_TIMEOUT_MS = 8000`. Evidence: `src/shared/api/auth.ts:112`, `src/shared/api/auth.ts:114`, `src/shared/api/auth.ts:116`, `src/shared/api/auth.ts:166`, `src/shared/api/auth.ts:170`.
- [F5] `getAuthenticatedUser` creates its own `AbortController`, forwards abort events from an incoming `options.signal`, performs the `/login/success` fetch with `controller.signal`, and clears its timeout in `finally`. Evidence: `src/shared/api/auth.ts:169`, `src/shared/api/auth.ts:179`, `src/shared/api/auth.ts:187`, `src/shared/api/auth.ts:193`, `src/shared/api/auth.ts:197`.
- [F6] On a successful response, `getAuthenticatedUser` returns `data.user ?? data`; otherwise it returns `null`. Evidence: `src/shared/api/auth.ts:203`, `src/shared/api/auth.ts:207`.
- [F7] `ProtectedRoutes` maps `useAuthenticatedUser().loading` to `checking` and renders `StartPageSkeleton`, `LoginSuccessSkeleton`, or `UniversalSkeleton` while `checking` is `true`. Evidence: `src/app/ProtectedRoutes.tsx:12`, `src/app/ProtectedRoutes.tsx:15`, `src/app/ProtectedRoutes.tsx:17`, `src/app/ProtectedRoutes.tsx:20`, `src/app/ProtectedRoutes.tsx:22`.
- [F8] `ProtectedRoutes` tests cover the three loading branches by mocking `useAuthenticatedUser` with `loading: true` for `/start`, `/joined`, and an unrelated route. Evidence: `src/app/ProtectedRoutes.test.tsx:36`, `src/app/ProtectedRoutes.test.tsx:37`, `src/app/ProtectedRoutes.test.tsx:46`, `src/app/ProtectedRoutes.test.tsx:47`, `src/app/ProtectedRoutes.test.tsx:56`, `src/app/ProtectedRoutes.test.tsx:57`.
- [F9] `useLoginPage` reads `loading: checking` from `useAuthenticatedUser`, returns `checking`, and `LoginPage` passes `loading || checking` into `LoginForm`. `LoginForm` disables both inputs, the remember-me checkbox, and the submit button when `loading` is true, and changes the submit label to `Signing in...`. Evidence: `src/pages/LoginPage/useLoginPage.ts:16`, `src/pages/LoginPage/useLoginPage.ts:59`, `src/pages/LoginPage/useLoginPage.ts:62`, `src/pages/LoginPage/index.tsx:9`, `src/pages/LoginPage/index.tsx:28`, `src/pages/LoginPage/LoginForm.tsx:50`, `src/pages/LoginPage/LoginForm.tsx:69`, `src/pages/LoginPage/LoginForm.tsx:93`, `src/pages/LoginPage/LoginForm.tsx:100`, `src/pages/LoginPage/LoginForm.tsx:101`.
- [F10] `PlayerProfilePage` uses `useAuthenticatedUser`, but it reads only `user` and `error`; no loading state from this hook is read in that page. Evidence: `src/pages/PlayerProfilePage/index.tsx:5`, `src/pages/PlayerProfilePage/index.tsx:7`.

## AbortController Status

- `useAuthenticatedUser`: PRESENT. Evidence: `src/shared/hooks/useAuthenticatedUser.ts:24`, `src/shared/hooks/useAuthenticatedUser.ts:27`, `src/shared/hooks/useAuthenticatedUser.ts:34`, `src/shared/hooks/useAuthenticatedUser.ts:67`.
- `getAuthenticatedUser` auth API: PRESENT. Evidence: `src/shared/api/auth.ts:169`, `src/shared/api/auth.ts:179`, `src/shared/api/auth.ts:193`, `src/shared/api/auth.ts:197`.
- Built-in `AbortSignal.timeout(...)` or `AbortController.timeout(...)` usage in `src/**`: NOT FOUND. Search used: `AbortSignal\.timeout|AbortController\.timeout` in `src/**`.

## User-visible loading state depending on this hook

- Protected-route loading UI depends on the hook via `checking` and renders `StartPageSkeleton`, `LoginSuccessSkeleton`, or `UniversalSkeleton`. Evidence: `src/app/ProtectedRoutes.tsx:12`, `src/app/ProtectedRoutes.tsx:15`, `src/app/ProtectedRoutes.tsx:17`, `src/app/ProtectedRoutes.tsx:20`, `src/app/ProtectedRoutes.tsx:22`.
- Login-page form loading depends on the hook indirectly through `checking`: `LoginPage` passes `loading || checking` to `LoginForm`, and `LoginForm` disables form controls and changes the submit label to `Signing in...`. Evidence: `src/pages/LoginPage/useLoginPage.ts:16`, `src/pages/LoginPage/useLoginPage.ts:62`, `src/pages/LoginPage/index.tsx:28`, `src/pages/LoginPage/LoginForm.tsx:50`, `src/pages/LoginPage/LoginForm.tsx:69`, `src/pages/LoginPage/LoginForm.tsx:93`, `src/pages/LoginPage/LoginForm.tsx:100`, `src/pages/LoginPage/LoginForm.tsx:101`.

## Tests and Coverage Found

- `src/shared/hooks/useAuthenticatedUser.test.ts` verifies that the hook aborts the request on unmount and skips late store updates. Evidence: `src/shared/hooks/useAuthenticatedUser.test.ts:40`, `src/shared/hooks/useAuthenticatedUser.test.ts:44`, `src/shared/hooks/useAuthenticatedUser.test.ts:53`.
- `src/shared/api/auth.test.ts` verifies the auth API timeout abort path using `timeoutMs` and fake timers. Evidence: `src/shared/api/auth.test.ts:56`, `src/shared/api/auth.test.ts:73`, `src/shared/api/auth.test.ts:75`.

## Unknowns

- [U1] A test that asserts the hook-local `10000` safety timeout value in `useAuthenticatedUser` is NOT FOUND. Search used: `10000|useFakeTimers|advanceTimersByTime|timeout` in `src/shared/hooks/useAuthenticatedUser.test.ts`.
- [U2] A `LoginPage` or `useLoginPage` test that covers the `checking` path from `useAuthenticatedUser` is NOT FOUND. Search used: `useLoginPage|checking|loading \|\| checking|Signing in\.\.\.` in `src/pages/LoginPage/**/*.test.{ts,tsx}`.
- [U3] Any `AbortSignal.timeout(...)` or `AbortController.timeout(...)` usage in `src/**` is NOT FOUND. Search used: `AbortSignal\.timeout|AbortController\.timeout` in `src/**`.
