# Verification Matrix

| Phase | Title                                      | Files Changed                                                                 | Required Checks                                                                                                                                                 | Agent Pipeline                             |
| ----- | ------------------------------------------ | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| 01    | Config reconciliation and regression guard | `eslint.config.mjs` (conditional) `src/shared/lib/eslint-flat-config.test.ts` | `npm run test -- src/shared/lib/eslint-flat-config.test.ts` `npm run eslint` `npx prettier --check eslint.config.mjs src/shared/lib/eslint-flat-config.test.ts` | `worker -> reviewer -> tester -> explorer` |
| 02    | Full repository validation rerun           | none                                                                          | `npm run eslint` `npm run stylelint` `npm run test` `npm run typecheck` `npx prettier --check .` `npm run test:e2e`                                             | `worker -> reviewer -> tester -> explorer` |

## Notes

- Design is skipped for this task; planning relies on `docs/eslint-config-global-ignores/research/research.md`.
- Phase 01 must treat `eslint.config.mjs` as conditional-edit scope because research found the requested global-ignore structure already present.
- Phase 01 keeps the existing `src/shared` scoped ignore override in scope only for preservation checks.
- Phase 02 is the only phase that may declare the task complete.
