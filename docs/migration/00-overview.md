# Migration: FSD → Feature-Based Architecture

## Goal

Simplify the project architecture: remove redundant FSD layers (`entities`, `ports`, excessive `shared` structure),
make each feature self-contained, and keep `shared` purely infrastructure.

## Target structure

```
src/
  app/                    # bootstrap, ErrorBoundary, global styles — unchanged
  features/               # business features (each self-sufficient)
    auth/
    game/
    game-summary/
    joined-game/
    player/
    room/
    settings/
    start/
    statistics/
  shared/
    ui/                   # only UI kit (already clean — don't touch)
    lib/
      api/
        client.ts         # HTTP wrapper — stays
        errors.ts         # error types — stays
        types.ts          # base API types — stays
        index.ts          # re-export — stays
      error-to-user-message.ts   # pure utility — stays
      parseThrowValue.ts         # pure utility — stays
      player-mappers.ts          # pure utility — stays
      soundPlayer.ts             # infrastructure — stays
      useEventSource.ts          # SSE infrastructure — moved from shared/hooks
    types/                # only DTO and API contracts — stays
  assets/                 # unchanged
```

### What is removed

| Layer                                       | What happens                                                                      |
| ------------------------------------------- | --------------------------------------------------------------------------------- |
| `src/entities/`                             | Removed entirely (empty type re-exports)                                          |
| `shared/stores/game.ts`                     | Moves to `features/game/store.ts`                                                 |
| `shared/stores/room.ts`                     | Moves to `features/room/store.ts`                                                 |
| `shared/stores/ui.ts`                       | Moves to `features/game/ui-store.ts`                                              |
| `shared/stores/index.ts`                    | Deleted                                                                           |
| `shared/lib/api/game.ts`                    | Moves to `features/game/api/game-api.ts`                                          |
| `shared/lib/api/room.ts`                    | Moves to `features/room/api/room-api.ts`                                          |
| `shared/hooks/useGamePlayers.ts`            | Duplicate — already exists in `features/room/hooks/useGamePlayers.ts`, remove old |
| `shared/hooks/useRoomStream.ts`             | Moves to `features/room/hooks/useRoomStream.ts` (already exists!)                 |
| `shared/hooks/useAuthenticatedUser.ts`      | Moves to `features/auth/hooks/useAuthenticatedUser.ts` (already exists!)          |
| `shared/hooks/useEventSource.ts`            | Moves to `shared/lib/useEventSource.ts`                                           |
| `shared/ports/game-flow.ts`                 | Moves to `features/game/ports/game-flow.ts`                                       |
| `shared/providers/GameFlowPortProvider.tsx` | Moves to `features/game/providers/GameFlowPortProvider.tsx`                       |

## Migration phases

| Phase | File                                                         | Description                                                           | Risk                  |
| ----- | ------------------------------------------------------------ | --------------------------------------------------------------------- | --------------------- |
| 1     | [phase-1-stores.md](./phase-1-stores.md)                     | Move stores from `shared/stores` into features                        | High (many consumers) |
| 2     | [phase-2-hooks.md](./phase-2-hooks.md)                       | Move hooks from `shared/hooks` into features                          | Medium                |
| 3     | [phase-3-api-and-ports.md](./phase-3-api-and-ports.md)       | Move `shared/lib/api/{game,room}` and `ports/providers` into features | Medium                |
| 4     | [phase-4-entities-cleanup.md](./phase-4-entities-cleanup.md) | Remove `entities/` and clean up `shared/stores`                       | Low                   |
| 5     | [phase-5-tsconfig-aliases.md](./phase-5-tsconfig-aliases.md) | Simplify tsconfig paths, final clean-up                               | Low                   |

## Execution principles

1. **One phase = one PR.** Do not mix phases.
2. After each phase run the full set of checks:
   ```bash
   npm run typecheck
   npm run eslint
   npm run test
   npm run test:e2e
   ```
3. Do not rename files or change logic at the same time—first move, then refactor.
4. When moving a file, create the new location first, update imports in consumers, then delete the old file.
5. Change tsconfig aliases only in Phase 5 when all real files have already been moved.

## Affected files (consumer summary)

### Consumers of `@/stores`

| File                                                | Imports                                                                                                       |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `features/auth/hooks/useAuthenticatedUser.ts`       | `setCurrentGameId` from `@/stores/room`                                                                       |
| `features/auth/hooks/useLoginPage.ts`               | `getActiveGameId` from `@/stores/room`                                                                        |
| `features/game/hooks/useGameLogic.ts`               | `closeFinishGameOverlay` from `@/stores/ui`; `$invitation`, `setInvitation`, `resetRoomStore` from `@/stores` |
| `features/game/hooks/useGameState.ts`               | `$gameData`, `$isLoading`, `$error`, `setGameData`, `setLoading`, `setError` from `@/stores`                  |
| `features/game/hooks/useThrowHandler.ts`            | `$gameData`, `setGameData` from `@/stores`                                                                    |
| `features/game-summary/hooks/useGameSummaryPage.ts` | from `@/stores`                                                                                               |
| `features/game-summary/routes/GameSummaryPage.tsx`  | `$gameSettings` from `@/stores`                                                                               |
| `features/settings/routes/Settings.tsx`             | `$currentGameId`, `$gameData`, `$gameSettings`, `setCurrentGameId`, `setGameData` from `@/stores`             |
| `features/start/hooks/useStartPage.ts`              | from `@/stores`; `setGameData` from `@/stores/game`                                                           |
| `shared/hooks/useGamePlayers.ts`                    | `$gameData` from `@/stores`                                                                                   |
| `shared/ui/navigation-bar/NavigationBar.tsx`        | `$currentGameId` from `@/stores`                                                                              |

### Consumers of `@/hooks/`

| File                                                              | Imports                                                    |
| ----------------------------------------------------------------- | ---------------------------------------------------------- |
| `features/game/hooks/useGameLogic.ts`                             | `useRoomStream` from `@/hooks/useRoomStream`               |
| `features/player/routes/PlayerProfile.tsx`                        | `useAuthenticatedUser` from `@/hooks/useAuthenticatedUser` |
| `shared/hooks/useGamePlayers.ts`                                  | `useEventSource` from `@/hooks/useEventSource`             |
| `features/start/components/live-players-list/LivePlayersList.tsx` | `useGamePlayers` from `@/hooks/useGamePlayers`             |
| `features/start/hooks/useStartPage.ts`                            | `useGamePlayers` from `@/hooks/useGamePlayers`             |

### Consumers of `shared/ports` and `shared/providers`

| File                                                | Imports                                                        |
| --------------------------------------------------- | -------------------------------------------------------------- |
| `features/game-summary/hooks/useGameSummaryPage.ts` | `useGameFlowPort`                                              |
| `features/settings/routes/Settings.tsx`             | `useGameFlowPort`                                              |
| `features/start/hooks/useStartPage.ts`              | `useGameFlowPort`, `AddGuestErrorResponse` from `shared/ports` |
| `features/statistics/hooks/useGameDetailPage.ts`    | `useGameFlowPort`                                              |
| `shared/hooks/useGamePlayers.ts`                    | `useGameFlowPort`                                              |
| `src/index.tsx`                                     | `GameFlowPortProvider`                                         |
