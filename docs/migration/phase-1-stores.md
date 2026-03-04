# Phase 1 — Move stores from `shared/stores` into features

## Goal

Remove domain logic from `shared/stores`. After this phase `shared/stores/` no longer exists.
Each feature owns its own store.

## Affected files (sources)

| File                             | Destination                       |
| -------------------------------- | --------------------------------- |
| `src/shared/stores/game.ts`      | `src/features/game/store.ts`      |
| `src/shared/stores/game.test.ts` | `src/features/game/store.test.ts` |
| `src/shared/stores/room.ts`      | `src/features/room/store.ts`      |
| `src/shared/stores/room.test.ts` | `src/features/room/store.test.ts` |
| `src/shared/stores/ui.ts`        | `src/features/game/ui-store.ts`   |
| `src/shared/stores/index.ts`     | Delete after updating all imports |

## Tasks

### 1.1 — Move game store

- [ ] Copy `shared/stores/game.ts` → `features/game/store.ts` (contents unchanged)
- [ ] Copy `shared/stores/game.test.ts` → `features/game/store.test.ts`
- [ ] Update import in the test: replace `@/stores` with a relative path
- [ ] Export from `features/game/index.ts` whatever other features need:
  ```ts
  // features/game/index.ts — add:
  export {
    $gameData,
    $gameSettings,
    $isGameFinished,
    $winnerId,
    setGameData,
    resetGameStore,
  } from "./store";
  ```

### 1.2 — Move room store

- [ ] Copy `shared/stores/room.ts` → `features/room/store.ts`
- [ ] Copy `shared/stores/room.test.ts` → `features/room/store.test.ts`
- [ ] Update import in the test
- [ ] Export needed items from `features/room/index.ts`:
  ```ts
  export {
    $currentGameId,
    $invitation,
    setCurrentGameId,
    setInvitation,
    resetRoomStore,
    getActiveGameId,
  } from "./store";
  ```

### 1.3 — Move ui store

`shared/stores/ui.ts` contains overlay flags and `$activeTab` which are only used in the context of the `game` feature.

- [ ] Copy `shared/stores/ui.ts` → `features/game/ui-store.ts`
- [ ] `$isNewPlayerOverlayOpen` is used only by `features/start` → either export it from `features/game/index.ts` or move to `features/start/store.ts` (the latter is preferred)

### 1.4 — Update all `@/stores` consumers

Replace imports according to the table:

| Consumer                                            | Old import                     | New import                              |
| --------------------------------------------------- | ------------------------------ | --------------------------------------- |
| `features/auth/hooks/useAuthenticatedUser.ts`       | `@/stores/room`                | `@/features/room`                       |
| `features/auth/hooks/useLoginPage.ts`               | `@/stores/room`                | `@/features/room`                       |
| `features/game/hooks/useGameLogic.ts`               | `@/stores/ui`                  | `../ui-store`                           |
| `features/game/hooks/useGameLogic.ts`               | `@/stores`                     | `../store` and `@/features/room`        |
| `features/game/hooks/useGameState.ts`               | `@/stores`                     | `../store`                              |
| `features/game/hooks/useThrowHandler.ts`            | `@/stores`                     | `../store`                              |
| `features/game-summary/hooks/useGameSummaryPage.ts` | `@/stores`                     | `@/features/game`                       |
| `features/game-summary/routes/GameSummaryPage.tsx`  | `@/stores`                     | `@/features/game`                       |
| `features/settings/routes/Settings.tsx`             | `@/stores`                     | `@/features/game` and `@/features/room` |
| `features/start/hooks/useStartPage.ts`              | `@/stores` and `@/stores/game` | `@/features/game` and `@/features/room` |
| `shared/hooks/useGamePlayers.ts`                    | `@/stores`                     | `@/features/game`                       |
| `shared/ui/navigation-bar/NavigationBar.tsx`        | `@/stores`                     | `@/features/room`                       |

> **Note:** `shared/ui/NavigationBar.tsx` imports from `@/features/room` — this is acceptable only temporarily.
> In Phase 2 `useGamePlayers` will move, and we'll handle NavigationBar at that time.

### 1.5 — Update tests

All tests that `vi.mock("@/stores", ...)`:

| Test                                                     | Change                                                                                               |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `features/game/hooks/useThrowHandler.test.ts`            | `vi.mock("@/stores", ...)` → `vi.mock("../store", ...)`                                              |
| `features/game-summary/hooks/useGameSummaryPage.test.ts` | `vi.mock("@/stores", ...)` → `vi.mock("@/features/game", ...)`                                       |
| `features/start/hooks/useStartPage.actions.test.ts`      | `vi.mock("@/stores", ...)` → `vi.mock("@/features/game", ...)` and `vi.mock("@/features/room", ...)` |
| `features/start/hooks/useStartPage.actions.test.ts`      | `vi.mock("@/stores/game", ...)` → `vi.mock("@/features/game", ...)`                                  |

### 1.6 — Delete `shared/stores/`

- [ ] Ensure `grep -r '@/stores' src/` yields no results
- [ ] Delete `src/shared/stores/game.ts`
- [ ] Delete `src/shared/stores/game.test.ts`
- [ ] Delete `src/shared/stores/room.ts`
- [ ] Delete `src/shared/stores/room.test.ts`
- [ ] Delete `src/shared/stores/ui.ts`
- [ ] Delete `src/shared/stores/index.ts`
- [ ] Delete the `src/shared/stores/` folder

## Phase readiness check

```bash
npm run typecheck
npm run eslint
npm run test
npm run test:e2e
```

All commands should succeed without errors.

## Note on aliases

The `@/stores` alias in `tsconfig.json` **should not be removed** in this phase — it will be removed in Phase 5
once all imports have been updated and grep confirms 0 usages.
