# Phase 02: Consumer-Risk Review + Full Validation Gate

**Layer:** verification

**Depends on:** Phase 01

**Can be tested in isolation:** Yes — this phase is verification-only and does not require additional production code changes.

## Goal

Confirm that the shared-hook timeout change is safe for existing consumers and pass the full repository validation suite required by the repo and workflow.

## Files to CREATE

None.

## Files to MODIFY

None planned.

## Verification Focus

Primary validation targets:

- `src/shared/hooks/useAuthenticatedUser.ts` — changed in Phase 01
- `src/shared/hooks/useAuthenticatedUser.test.ts` — changed in Phase 01
- `src/app/ProtectedRoutes.test.tsx` — existing consumer coverage should continue to pass via the full test suite
- `src/pages/LoginPage/useLoginPage.ts` and `src/pages/LoginPage/index.tsx` — consumer behavior is reviewed indirectly; no production edits are planned

## LoginPage Coverage Decision

Current planning decision:

- `LoginPage` coverage is **optional**, not required in the baseline implementation scope.

Why:

- The approved design keeps `LoginPage` unchanged.
- Research found no existing direct `checking`-path test for `LoginPage` or `useLoginPage` ([U2]).
- This ticket changes the shared auth-check timing policy, not page orchestration.

Escalation rule:

- If Phase 01 review or validation exposes a consumer regression risk that is not sufficiently covered by existing tests, human review may promote a dedicated `LoginPage` regression test into scope before implementation proceeds further.

## Tests for This Phase

| Test case                                                                                 | Condition                                                      | Expected output                                                                | Mocks needed                |
| ----------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------ | --------------------------- |
| should keep protected-route loading branches stable after the timeout-owner change        | run existing `ProtectedRoutes` coverage through the full suite | route-specific skeleton coverage still passes                                  | existing suite mocks only   |
| should keep auth-critical flows green under full validation                               | run repo validation commands                                   | no new lint, type, unit, or E2E failures introduced by the hook change         | none beyond existing suites |
| should treat missing `LoginPage` checking coverage as optional unless review escalates it | perform human review against [Q-001]                           | explicit approve or decline decision recorded before implementation completion | none                        |

## Verification Commands

1. `npm run eslint`
2. `npm run stylelint`
3. `npm run test`
4. `npm run typecheck`
5. `npx prettier --check .`
6. `npm run test:e2e`

## Rollback Notes

- If any mandatory validation command fails because of the Phase 01 change, do not merge the ticket as-is.
- Roll back by restoring the Phase 01 files to their last approved state as a single unit:
  - `src/shared/hooks/useAuthenticatedUser.ts`
  - `src/shared/hooks/useAuthenticatedUser.test.ts`
- Do not add ad-hoc page-level production changes during rollback; if consumer coverage is found insufficient, address that as a follow-up planning decision rather than an emergency scope expansion.

## Done Criteria

- [ ] All mandatory validation commands pass
- [ ] Existing consumer coverage remains green
- [ ] `LoginPage` coverage status is explicitly accepted as optional or promoted by human review
- [ ] No out-of-scope production files were changed during verification
- [ ] The ticket is ready for Phase 4 implementation approval

## Human Review Checkpoint

- [ ] Full validation suite listed above is the final gate for this ticket
- [ ] No hidden scope expansion occurred
- [ ] `LoginPage` coverage decision is explicit, not implied
- [ ] Rollback path restores a single-timeout-owner baseline rather than reintroducing duplicate timeout ownership
