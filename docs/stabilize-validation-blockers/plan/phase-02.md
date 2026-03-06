# Phase 02: Logout Re-login E2E Stabilization

**Layer:** tests/specs  
**Depends on:** none  
**Can be tested in isolation:** Yes

## Goal

Stabilize the failing Playwright logout/re-login scenario so it reflects the documented auth-flow expectation and passes reliably without changing unrelated test coverage.

## Files to MODIFY

### `tests/joined-game/logout-relogin-flow.spec.ts`

**Current state confirmed by research**

- The failing assertion is at `tests/joined-game/logout-relogin-flow.spec.ts:50`.
- The test logs in, clears cookies, revisits `/start`, and branches based on URL and page content.

**Planned change**

- Re-check the scenario against the current application behavior using the existing accessible indicators already used elsewhere in the suite:
  - authenticated state -> `Selected Players`
  - unauthenticated state -> `Sign in`
- Tighten the branch logic or assertions so the test verifies one of the supported post-logout outcomes deterministically.
- Keep the scenario focused on logout/re-login behavior rather than layout details.

### `specs/login-test-plan.md` (optional)

**Current state confirmed by research**

- The test plan references `tests/auth/logout-relogin-flow.spec.ts`, while the repository file is `tests/joined-game/logout-relogin-flow.spec.ts`.

**Planned change**

- Update the referenced file path only if Phase 02 touches the spec document to keep documentation aligned with the implemented test location.
- Do not rewrite the broader test plan.

## Do not change

- Other Playwright specs unless the failing test imports shared helpers from them and a minimal shared fix is required.
- Application production code under `src/` unless the failing scenario proves a product bug and implementation is explicitly re-approved.

## Verification Commands

```bash
npm run test:e2e -- tests/joined-game/logout-relogin-flow.spec.ts
```

If the project runner does not accept the path suffix, use:

```bash
npx playwright test tests/joined-game/logout-relogin-flow.spec.ts
```

## Accessibility Notes

- Continue to assert on headings and labeled inputs rather than brittle CSS or DOM-only selectors.

## Rollback Notes

- Revert only the updated spec file and optional spec-document path fix.
- If the scenario reveals an application bug, stop and record a blocker instead of rewriting expectations to hide it.
