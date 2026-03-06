# Phase 01: Config Reconciliation and Regression Guard

**Layer:** repo/test  
**Depends on:** none  
**Can be tested in isolation:** Yes

## Goal

Ensure the repository either keeps or restores the approved ESLint flat-config global-ignore structure, and add regression coverage that will fail if that structure regresses later.

## Files to MODIFY

- `eslint.config.mjs` only if the file no longer matches the researched baseline at implementation time.

## Files to ADD

- `src/shared/lib/eslint-flat-config.test.ts`

## Planned Change

- Re-open `eslint.config.mjs` and compare it to the researched baseline before making any edit.
- If the file still matches the researched baseline, leave `eslint.config.mjs` unchanged.
- If the file has regressed to the task's broken state, move the global ignore patterns back into the standalone first config object and keep the later `src/shared` scoped ignore override intact.
- Add a Vitest regression test in `src/shared/lib/eslint-flat-config.test.ts` that imports the flat config and asserts:
  - the first exported config item exposes the approved global ignore patterns,
  - the global ignore pattern list matches `["**/*.config.ts", "**/*.config.js", "**/*.config.mjs", "dist/**"]`,
  - the main `files: ["**/*.ts", "**/*.tsx"]` block does not define those global ignore patterns,
  - the `src/shared/**/*.{ts,tsx}` override still keeps the scoped ignore entries for `src/shared/types/game.ts` and `src/shared/types/player.ts`.

## Do Not Change

- `package.json`
- `vite.config.ts`
- application source files unrelated to the new regression test
- scoped lint rules unrelated to global ignores

## Verification Commands

```bash
npm run test -- src/shared/lib/eslint-flat-config.test.ts
npm run eslint
npx prettier --check eslint.config.mjs src/shared/lib/eslint-flat-config.test.ts
```

## Accessibility Notes

- This phase has no runtime accessibility impact.
- Test names should describe the config behavior clearly enough to support future maintenance.

## Rollback Notes

- Revert only `eslint.config.mjs` and `src/shared/lib/eslint-flat-config.test.ts` if this phase needs to be rolled back.
- If implementation discovers that the test cannot run under the current Vitest configuration, stop and record a blocker instead of broadening the config scope.
