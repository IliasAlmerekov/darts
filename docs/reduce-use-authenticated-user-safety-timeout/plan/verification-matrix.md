# Verification Matrix

| Phase | Title                                             | Files Changed                                                                               | Required Checks                                                                                                                                                                                                                                   | Agent Pipeline                             |
| ----- | ------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| 01    | Hook timeout ownership + focused regression tests | `src/shared/hooks/useAuthenticatedUser.ts`, `src/shared/hooks/useAuthenticatedUser.test.ts` | `npm run typecheck`; `npm run eslint`; `npm run test -- src/shared/hooks/useAuthenticatedUser.test.ts src/shared/api/auth.test.ts`; `npx prettier --check src/shared/hooks/useAuthenticatedUser.ts src/shared/hooks/useAuthenticatedUser.test.ts` | `worker -> reviewer -> tester -> explorer` |
| 02    | Consumer-risk review + full validation gate       | none planned                                                                                | `npm run eslint`; `npm run stylelint`; `npm run test`; `npm run typecheck`; `npx prettier --check .`; `npm run test:e2e`                                                                                                                          | `worker -> reviewer -> tester -> explorer` |

## Notes

- `LoginPage` regression coverage is not part of the baseline file-change matrix for this ticket.
- If human review promotes `LoginPage` coverage into scope, the matrix must be revised before implementation starts.
- `ProtectedRoutes` coverage remains part of the validation safety net through the full test suite, even though no `ProtectedRoutes` file changes are planned.
