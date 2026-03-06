# Implementation Plan: Lazy Load Login and Register Pages

**Date:** 2026-03-06
**Design:** Skipped for this task. Planning relies on `docs/lazy-load-login-and-register-pages/research/research.md` as the primary input artifact.
**Research:** `docs/lazy-load-login-and-register-pages/research/research.md`

## Summary

This task is a small app-layer routing change. The implementation scope is limited to `src/app/App.tsx` and `src/app/App.test.tsx`. The goal is to make `LoginPage` and `RegisterPage` follow the same `React.lazy` loading pattern already used by the other routed pages, while preserving the current route paths, the existing shared `Suspense` fallback, and the existing auth-page public modules.

## Phase Overview

| #   | Phase name                                      | Layer    | New files | Modified files | Complexity |
| --- | ----------------------------------------------- | -------- | --------- | -------------- | ---------- |
| 01  | App routing update and unit regression coverage | app      | 0         | 2              | Low        |
| 02  | Final validation and bundle verification        | app/repo | 0         | 0              | Low        |

## Dependency Order

- Phase 01 has no dependencies.
- Phase 02 depends on Phase 01 completion and uses its built output for bundle inspection.

## Research Facts Driving the Plan

- [F1] `App.tsx` already uses `lazy()` for non-auth routed pages, while `LoginPage` and `RegisterPage` are still eager imports.
- [F2] Both auth routes already sit inside a shared `Suspense` boundary, so no new fallback boundary is required.
- [F3] Route warm-up currently excludes auth pages.
- [F4] Both auth pages have default exports, which is compatible with `React.lazy`.
- [F5] The auth routes remain `/` and `/register`.
- [F7] `App` routing tests do not currently cover login/register route rendering or auth-route lazy loading.
- [F8] The repository uses the standard Vite build pipeline without custom chunk rules.
- [F9] A local build currently places auth-page code in the main application bundle.

## Scope

- Replace eager auth page imports in `src/app/App.tsx` with `lazy(() => import(...))`.
- Keep the current route configuration and route constants unchanged.
- Add unit coverage in `src/app/App.test.tsx` for login and register route rendering under lazy-loaded route modules.
- Run final repository validation and verify that auth-page code is no longer bundled into the main application chunk.

## Non-Goals

- No changes to `src/pages/LoginPage/*` or `src/pages/RegisterPage/*`.
- No changes to `src/shared/lib/routes.ts`.
- No changes to `warmUpRoutes()` unless Phase 01 reveals a correctness issue outside the current ticket scope.
- No CSS changes.
- No routing architecture refactor beyond the two auth page imports.

## Risks

- [R-001] `src/app/App.test.tsx` currently mocks stale `@/features/*` modules while `App.tsx` imports `@/app/*` and `@/pages/*`. Tests should be aligned to the actual import graph to avoid false confidence.
- [R-002] Because auth pages will become lazy modules, route assertions in `App.test.tsx` must use async queries (`findBy*`) instead of synchronous assumptions.
- [R-003] Bundle verification must be based on the generated `dist/assets` output because chunk names are hashed and unstable between builds.

## Accessibility and Security Constraints

- Preserve the existing `Suspense` fallback markup (`aria-hidden="true"`) and do not remove the existing route-level accessibility behavior.
- No external input handling changes are in scope.
- No secrets, credentials, or logging behavior changes are in scope.
