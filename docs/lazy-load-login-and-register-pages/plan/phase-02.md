# Phase 02: Final Validation and Bundle Verification

**Layer:** app/repo
**Depends on:** Phase 01
**Can be tested in isolation:** No, it validates the integrated result of Phase 01

## Goal

Validate the completed routing change at repository level, confirm the standard quality gates remain green, and verify from the generated build output that auth-page code no longer resides in the main application chunk.

## Files to MODIFY

- None.

## Verification Work

- Run the repository validation commands required by the project instructions and workflow.
- Run a production build and inspect `dist/assets` using content markers already confirmed in research:
  - `"You have successfully left the game"`
  - `"Create an account"`
- Confirm those auth markers are no longer present in the main `dist/assets/index-*.js` application chunk.
- Record the emitted chunk evidence in the phase report during implementation.

## Verification Commands

```bash
npm run eslint
npm run stylelint
npm run test
npm run typecheck
npx prettier --check .
npm run test:e2e
npm run build
rg -n "You have successfully left the game|Create an account" dist/assets
```

## Accessibility Notes

- The final verification pass must confirm that the auth routes still resolve to visible login/register content after lazy loading.
- No new accessibility behavior is introduced in this phase; this is a regression-safety pass.

## Rollback Notes

- If bundle verification fails, return to Phase 01 scope and adjust the route-loading implementation rather than widening the solution.
- If repository-level checks fail for unrelated pre-existing issues, document the blocker in the implementation phase report instead of changing out-of-scope code.
