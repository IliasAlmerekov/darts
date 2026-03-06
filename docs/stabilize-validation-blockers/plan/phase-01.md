# Phase 01: Prettier Blocker Cleanup

**Layer:** repo/tests  
**Depends on:** none  
**Can be tested in isolation:** Yes

## Goal

Identify the exact files currently breaking `npx prettier --check .` and normalize only those files so the formatting gate becomes green without widening the change set.

## Files to MODIFY

### Explicit target set

- `CLAUDE.md` only if it is still reported by the current Prettier run.
- `specs/login-test-plan.md` only if it is still reported by the current Prettier run.
- Only the `tests/joined-game/*.spec.ts` files that are reported by the current Prettier run.
- `docs/stabilize-validation-blockers/implementation/*` artifacts created during later implementation phases.

## Planned change

- Run `npx prettier --check .` and capture the exact current list of failing files.
- Apply formatting only to the reported files in the approved target set.
- Do not opportunistically reformat unrelated files that are not part of the current failing set.
- Keep content changes out of this phase unless Prettier itself changes whitespace, quotes, or wrapping.

## Do not change

- Application source files under `src/`.
- Playwright test behavior.
- Repository scripts or Prettier configuration.

## Verification Commands

```bash
npx prettier --check .
```

## Accessibility Notes

- This phase is formatting-only and does not change runtime accessibility behavior.

## Rollback Notes

- Revert only the formatted files touched in this phase.
- If the Prettier output changes while the phase is in progress because of unrelated user work, stop and refresh the failing file list before proceeding.
