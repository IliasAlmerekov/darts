# Verification Matrix

| Phase | Title                                           | Files Changed                            | Required Checks                                                                                                                                                                 | Agent Pipeline                             |
| ----- | ----------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------ |
| 01    | App routing update and unit regression coverage | `src/app/App.tsx` `src/app/App.test.tsx` | `npm run typecheck` `npm run eslint` `npm run test -- src/app/App.test.tsx` `npx prettier --check src/app/App.tsx src/app/App.test.tsx`                                         | `worker -> reviewer -> tester -> explorer` |
| 02    | Final validation and bundle verification        | none                                     | `npm run eslint` `npm run stylelint` `npm run test` `npm run typecheck` `npx prettier --check .` `npm run test:e2e` `npm run build` `rg -n "You have successfully left the game | Create an account" dist/assets`            | `worker -> reviewer -> tester -> explorer` |

## Notes

- Design is skipped for this task; planning relies on `docs/lazy-load-login-and-register-pages/research/research.md`.
- Phase 02 is the final phase, so it carries the full repository validation suite.
- No CSS changes are planned, but `stylelint` remains required in the final phase because the project instructions require the full validation suite before completion.
