# Research: Stabilize Validation Blockers

## Task

Investigate the repository-level blockers that currently prevent the validation suite from passing:

- `npx prettier --check .`
- `npm run test:e2e`

## Facts

- [F1] The workflow requires a separate `docs/<task-slug>/` folder for each task, requires research artifacts to be written in English, and requires the lead agent to stop after producing `research.md`. Evidence: `.codex/WORKFLOW.md:22`, `.codex/WORKFLOW.md:23`, `.codex/WORKFLOW.md:55`, `.codex/WORKFLOW.md:63`, `.codex/WORKFLOW.md:66`.

- [F2] The workflow lists `npx prettier --check .` and `npm run test:e2e` among the mandatory validation commands. Evidence: `.codex/WORKFLOW.md:153`, `.codex/WORKFLOW.md:158`, `.codex/WORKFLOW.md:159`.

- [F3] The repository defines `test:e2e` as `playwright test`. Evidence: `package.json:19`, `package.json:28`.

- [F4] The current blocker report for the previous task states that `npx prettier --check .` fails and that the reported files include `CLAUDE.md`, `docs/lazy-load-login-and-register-pages/plan/implementation-plan.md`, `docs/lazy-load-login-and-register-pages/plan/verification-matrix.md`, `specs/login-test-plan.md`, and multiple files in `tests/joined-game/*.spec.ts`. Evidence: `docs/lazy-load-login-and-register-pages/implementation/blocker-phase-02-validation.md:8`, `docs/lazy-load-login-and-register-pages/implementation/blocker-phase-02-validation.md:15`, `docs/lazy-load-login-and-register-pages/implementation/blocker-phase-02-validation.md:17`, `docs/lazy-load-login-and-register-pages/implementation/blocker-phase-02-validation.md:18`, `docs/lazy-load-login-and-register-pages/implementation/blocker-phase-02-validation.md:19`, `docs/lazy-load-login-and-register-pages/implementation/blocker-phase-02-validation.md:20`, `docs/lazy-load-login-and-register-pages/implementation/blocker-phase-02-validation.md:21`, `docs/lazy-load-login-and-register-pages/implementation/blocker-phase-02-validation.md:22`.

- [F5] The current blocker report for the previous task states that `npm run test:e2e` fails on `tests/joined-game/logout-relogin-flow.spec.ts:50` with the message that `getByRole('heading', { name: 'Selected Players' })` was not found. Evidence: `docs/lazy-load-login-and-register-pages/implementation/blocker-phase-02-validation.md:9`, `docs/lazy-load-login-and-register-pages/implementation/blocker-phase-02-validation.md:26`, `docs/lazy-load-login-and-register-pages/implementation/blocker-phase-02-validation.md:27`, `docs/lazy-load-login-and-register-pages/implementation/blocker-phase-02-validation.md:28`, `docs/lazy-load-login-and-register-pages/implementation/blocker-phase-02-validation.md:29`.

- [F6] The failing Playwright test performs a login, expects `/start`, asserts that the `Selected Players` heading is visible, clears cookies, visits `/start` again, and then branches between login-page assertions and a second `Selected Players` assertion based on URL or page HTML content. Evidence: `tests/joined-game/logout-relogin-flow.spec.ts:7`, `tests/joined-game/logout-relogin-flow.spec.ts:9`, `tests/joined-game/logout-relogin-flow.spec.ts:20`, `tests/joined-game/logout-relogin-flow.spec.ts:21`, `tests/joined-game/logout-relogin-flow.spec.ts:24`, `tests/joined-game/logout-relogin-flow.spec.ts:27`, `tests/joined-game/logout-relogin-flow.spec.ts:31`, `tests/joined-game/logout-relogin-flow.spec.ts:32`, `tests/joined-game/logout-relogin-flow.spec.ts:34`, `tests/joined-game/logout-relogin-flow.spec.ts:36`, `tests/joined-game/logout-relogin-flow.spec.ts:45`, `tests/joined-game/logout-relogin-flow.spec.ts:49`, `tests/joined-game/logout-relogin-flow.spec.ts:50`.

- [F7] Another Playwright test in the same folder also treats the `Selected Players` heading as a visible indicator for a successful authenticated redirect to `/start`. Evidence: `tests/joined-game/authenticated-redirect.spec.ts:29`.

- [F8] Another Playwright test in the same folder treats the login page heading `Sign in` as a visible indicator of unauthenticated access. Evidence: `tests/joined-game/success-message-after-exit.spec.ts:15`, `tests/joined-game/csrf-token-handling.spec.ts:12`, `tests/joined-game/empty-fields-validation.spec.ts:15`.

- [F9] The login test plan describes the logout and re-login flow as: log in, clear browser storage and cookies, navigate to a protected route, expect redirect to the login page, then log in again and expect authentication success. Evidence: `specs/login-test-plan.md:177`, `specs/login-test-plan.md:181`, `specs/login-test-plan.md:184`, `specs/login-test-plan.md:186`, `specs/login-test-plan.md:187`, `specs/login-test-plan.md:189`, `specs/login-test-plan.md:190`.

- [F10] The login test plan points this scenario at `tests/auth/logout-relogin-flow.spec.ts`, while the current implementation file in the repository is `tests/joined-game/logout-relogin-flow.spec.ts`. Evidence: `specs/login-test-plan.md:179`, `tests/joined-game/logout-relogin-flow.spec.ts:1`.

## Unknowns

- [U1] The root cause of the failing Playwright assertion is NOT FOUND. The current evidence confirms the failing assertion site, but does not yet prove whether the issue is in the test logic, the seed/setup data, authentication persistence, or application behavior.

- [U2] The complete current list of files failing `npx prettier --check .` is NOT FOUND in repository files. The previous blocker artifact records examples and a wildcard group, but not a canonical full list.

- [U3] The exact reason why the files currently reported by Prettier are unformatted is NOT FOUND.
