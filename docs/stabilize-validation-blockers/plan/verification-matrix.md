# Verification Matrix

| Phase | Title                             | Files Changed                                                                       | Required Checks                                                                                                                            | Agent Pipeline                             |
| ----- | --------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------ |
| 01    | Prettier blocker cleanup          | exact files reported by `npx prettier --check .`                                    | `npx prettier --check .`                                                                                                                   | `worker -> reviewer -> tester -> explorer` |
| 02    | Logout re-login E2E stabilization | `tests/joined-game/logout-relogin-flow.spec.ts` optional `specs/login-test-plan.md` | `npm run test:e2e -- tests/joined-game/logout-relogin-flow.spec.ts` or `npx playwright test tests/joined-game/logout-relogin-flow.spec.ts` | `worker -> reviewer -> tester -> explorer` |
| 03    | Final validation rerun            | none                                                                                | `npm run eslint` `npm run stylelint` `npm run test` `npm run typecheck` `npx prettier --check .` `npm run test:e2e`                        | `worker -> reviewer -> tester -> explorer` |

## Notes

- Design is skipped for this task; planning relies on `docs/stabilize-validation-blockers/research/research.md`.
- Phase 01 must keep the file list explicit and minimal because the repository has unrelated in-progress work.
- Phase 02 may update `specs/login-test-plan.md` only to align the documented file path or documented expectation with the implemented test.
- Phase 03 is the only phase that may declare the task complete.
