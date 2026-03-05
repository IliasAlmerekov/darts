# Phase 01 Report — Fix window.location in ProtectedRoutes

## Changes Made

- `src/app/ProtectedRoutes.tsx`: added `useLocation` to the react-router-dom import; added `const { pathname } = useLocation()` call inside the component body; replaced both `location.pathname` references with `pathname`
- `src/app/ProtectedRoutes.test.tsx`: new test file with 6 test cases

## Review Findings

- Architecture: APPROVED — hook is called unconditionally at the top level; pattern matches 6 other files in the codebase
- Security: APPROVED — switching the pathname source introduces no vulnerabilities; skeletons do not expose protected content
- Test Gate: PASS — 6/6 tests green

## Commands Run

1. `npm run eslint` → PASS
2. `npm run stylelint` → PASS
3. `npm run typecheck` → PASS
4. `npm run test` (ProtectedRoutes.test.tsx) → PASS (6/6)
5. `npx prettier --check` → PASS (after formatting ProtectedRoutes.tsx)

## Remaining Risks

- Client-side auth guard only — the server must enforce authorization independently (by project architecture)
- `includes("/start")` matches any path containing the "/start" substring — inherited behavior, not a regression
