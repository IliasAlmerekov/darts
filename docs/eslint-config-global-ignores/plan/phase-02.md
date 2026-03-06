# Phase 02: Full Repository Validation Rerun

**Layer:** repo  
**Depends on:** Phase 01  
**Can be tested in isolation:** Yes

## Goal

Confirm that the repository validation suite remains green after the targeted ESLint config reconciliation work.

## Files to MODIFY

- none

## Files to ADD

- none

## Planned Change

- Run the mandatory validation commands in repository root after Phase 01 is complete.
- Capture exact pass/fail results in the implementation report.
- If any command fails outside the planned scope, stop and report the failure instead of widening implementation without approval.

## Do Not Change

- source files
- test files
- configuration files

## Verification Commands

```bash
npm run eslint
npm run stylelint
npm run test
npm run typecheck
npx prettier --check .
npm run test:e2e
```

## Accessibility Notes

- Validation-only phase; no direct accessibility impact.

## Rollback Notes

- No code rollback is required because this phase is command-only.
- If a command failure is unrelated to Phase 01 scope, stop and document it as a blocker or residual risk.
