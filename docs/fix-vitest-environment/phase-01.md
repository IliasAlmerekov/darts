# Phase 01: Config and Docblocks

**Layer:** config + test files
**Depends on:** none
**Can be tested in isolation:** Yes — `npm run test` verifies the full result

## Goal

Change the default Vitest environment to `"jsdom"`, trim the unused `.spec.` include glob, and add
`// @vitest-environment node` to all 15 pure-function/API test files so they continue to run in
the Node environment.

---

## Files to MODIFY

### vite.config.ts (lines 37–42)

Changes:

- MODIFY `environment`: `"node"` → `"jsdom"`
- MODIFY `include`: remove `"src/**/*.spec.{ts,tsx}"` (no such files exist; confirmed in research)

Result block:

```ts
test: {
  environment: "jsdom",
  globals: true,
  include: ["src/**/*.test.{ts,tsx}"],
  exclude: ["specs/**"],
},
```

DO NOT CHANGE: all other properties (`plugins`, `resolve`, `server`)

---

### 15 pure-function/API test files — add `// @vitest-environment node` as line 1

For each file below, prepend exactly this line (before any existing content):

```
// @vitest-environment node
```

Files (in order of directory grouping):

**src/shared/lib/**

1. `src/shared/lib/parseThrowValue.test.ts`
2. `src/shared/lib/player-mappers.test.ts`
3. `src/shared/lib/error-to-user-message.test.ts`
4. `src/shared/lib/auth-error-handling.test.ts`
5. `src/shared/lib/routes.test.ts`

**src/shared/api/** 6. `src/shared/api/rematch.test.ts` 7. `src/shared/api/reopen-game.test.ts` 8. `src/shared/api/room.test.ts` 9. `src/shared/api/get-game.test.ts`

**src/shared/hooks/** 10. `src/shared/hooks/useRoomStream.test.ts`

**src/shared/store/** 11. `src/shared/store/game-state.test.ts`

**src/pages/StartPage/** 12. `src/pages/StartPage/useStartPage.test.ts` 13. `src/pages/StartPage/lib/guestUsername.test.ts`

**src/pages/GamePage/** 14. `src/pages/GamePage/useGameLogic.test.ts`

**src/pages/StatisticsPage/** 15. `src/pages/StatisticsPage/lib/sort-player-stats.test.ts`

DO NOT CHANGE: the 30 files that already have `// @vitest-environment jsdom` — confirmed in research

---

## Tests for This Phase

No new test files are written. The test suite itself is the verification.

| Test case                  | Condition                        | Expected output                        |
| -------------------------- | -------------------------------- | -------------------------------------- |
| All 45 tests pass          | `npm run test` after changes     | 0 failures, 0 environment errors       |
| Node-only tests stay fast  | 15 files annotated with `node`   | No jsdom loaded for pure functions     |
| RTL tests render correctly | 30 files keep `jsdom` annotation | Components render, DOM queries succeed |

---

## Verification Commands

```bash
npm run typecheck
npm run eslint
npm run test
```

`stylelint` and `test:e2e` are not required — no CSS or critical user journey is affected.

---

## Done Criteria

- [ ] `vite.config.ts` test block shows `environment: "jsdom"` and single include pattern
- [ ] All 15 node test files have `// @vitest-environment node` as line 1
- [ ] `npm run test` passes with 0 failures
- [ ] `npm run typecheck` passes
- [ ] `npm run eslint` passes
- [ ] No other files changed

## Human Review Checkpoint

Before closing this feature:

- [ ] Confirmed `// @vitest-environment node` is line 1 (not line 2 or preceded by blank line)?
- [ ] Confirmed none of the 30 jsdom files were touched?
- [ ] `npm run test` output shows correct environment per file (no "environment" error lines)?
