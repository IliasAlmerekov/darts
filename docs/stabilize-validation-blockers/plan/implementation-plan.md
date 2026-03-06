# Implementation Plan: Stabilize Validation Blockers

**Date:** 2026-03-06
**Design:** Skipped for this task. Planning relies on `docs/stabilize-validation-blockers/research/research.md` as the primary input artifact.
**Research:** `docs/stabilize-validation-blockers/research/research.md`

## Summary

This task is a repository-validation stabilization task. The implementation scope should stay limited to the currently failing quality gates: repository formatting drift and one Playwright logout/re-login scenario. The goal is to restore a green final validation suite without changing the lazy-load routing work that triggered the original validation run.

## Phase Overview

| #   | Phase name                        | Layer       | New files | Modified files | Complexity |
| --- | --------------------------------- | ----------- | --------- | -------------- | ---------- |
| 01  | Prettier blocker cleanup          | repo/tests  | 0         | targeted set   | Low        |
| 02  | Logout re-login E2E stabilization | tests/specs | 0         | 1-2            | Medium     |
| 03  | Final validation rerun            | repo        | 0         | 0              | Low        |

## Dependency Order

- Phase 01 has no dependencies.
- Phase 02 has no code dependency on Phase 01, but both must complete before the final rerun in Phase 03.
- Phase 03 depends on Phases 01 and 02.

## Research Facts Driving the Plan

- [F2] `npx prettier --check .` and `npm run test:e2e` are mandatory validation commands.
- [F4] The current blocker set includes formatting drift in repository files outside the lazy-load scope.
- [F5] The current E2E blocker is `tests/joined-game/logout-relogin-flow.spec.ts:50`.
- [F6] The failing Playwright scenario branches on current URL and page content after clearing cookies.
- [F7] Other E2E tests already use the `Selected Players` heading as a successful authenticated `/start` indicator.
- [F8] Other E2E tests already use the `Sign in` heading as an unauthenticated indicator.
- [F9] The test plan expects the protected-route revisit after logout to lead to the login page before re-authentication.
- [F10] The spec document and the actual test file path are currently misaligned.

## Scope

- Format only the files that currently fail `npx prettier --check .`.
- Stabilize the logout/re-login Playwright scenario in `tests/joined-game/logout-relogin-flow.spec.ts`.
- Update the related spec document only if needed to keep the documented test path or behavior aligned with the implemented test.
- Re-run the required repository validation commands after the blockers are addressed.

## Non-Goals

- No changes to `src/app/App.tsx` or `src/app/App.test.tsx`.
- No new routing changes.
- No broad Playwright refactor outside the failing logout/re-login scenario.
- No formatting sweep beyond the files that currently block `npx prettier --check .`.
- No application business-logic changes unless the failing E2E is proven to require them and a separate approval is obtained.

## Risks

- [R-001] Running Prettier on repository files may touch user-owned in-progress work; the implementation must keep the file list explicit and minimal.
- [R-002] The Playwright failure may come from unstable test assumptions rather than application behavior, so the phase must confirm the scenario against existing authenticated and unauthenticated indicators before editing assertions.
- [R-003] If the E2E failure is caused by application behavior rather than test fragility, Phase 02 may need to stop with a blocker instead of widening scope.

## Accessibility and Security Constraints

- Keep E2E assertions based on accessible UI signals such as headings and labeled fields.
- Do not add or expose secrets while touching test files.
- Do not expand the use of hardcoded credentials beyond the existing test data already present in the repository.
