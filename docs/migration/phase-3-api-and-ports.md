# Phase 3 — Move `shared/lib/api/{game,room}` and `ports/providers` into features

## Goal

After this phase, `shared/lib/api/` should contain only infrastructure files:
`client.ts`, `errors.ts`, `types.ts`, `index.ts`.

Domain-specific APIs (`game.ts`, `room.ts`) and the ports (`game-flow.ts`, `GameFlowPortProvider.tsx`)
are relocated into their respective features.

## Analysis

### What already exists in features

The `game` and `room` features already have their own `api/` folders with several functions:

**`features/game/api/`** contains:

- `abort-game.ts` — imports `apiClient` from `@/lib/api`
- `finish-game.ts`
- `game-settings.ts`
- `get-game.ts`
- `record-throw.ts`
- `rematch.ts`
- `reopen-game.ts`
- `start-game.ts`
- `undo-throw.ts`

All of them import `apiClient` from `@/lib/api` (the plain HTTP client), which is correct and will remain.

**`features/room/api/`** contains:

- `add-guest.ts`
- `create-room.ts`
- `leave-room.ts`
- `update-player-order.ts`

### Problem with `shared/lib/api/game.ts` and `shared/lib/api/room.ts`

These files are a **redundant layer**: they declare endpoints and functions already present in
`features/game/api/` and `features/room/api/`.

The difference is that `shared/lib/api/game.ts` also exports **types** (`GameThrowsResponse`,
`FinishedPlayerResponse`, `CreateGameSettingsPayload`, etc.) which are needed by multiple features.

## Tasks

### 3.1 — Move types from `shared/lib/api/game.ts`

Move shared types used across features into `shared/types/`:

- [ ] Add to `shared/types/game.ts` (or create `shared/types/api-game.ts`):
  ```ts
  export type { GameThrowsResponse } from "../lib/api/game-types";
  export type FinishedPlayerResponse = { ... };
  export type CreateGameSettingsPayload = { ... };
  ```
- [ ] Update type consumers:

| Consumer                                            | What it imports          | From where after |
| --------------------------------------------------- | ------------------------ | ---------------- |
| `features/game-summary/hooks/useGameSummaryPage.ts` | `FinishedPlayerResponse` | `@/shared/types` |
| `features/statistics/hooks/useGameDetailPage.ts`    | `FinishedPlayerResponse` | `@/shared/types` |
| `shared/ports/game-flow.ts`                         | several types            | `@/shared/types` |

### 3.2 — Verify function duplication

Compare `shared/lib/api/game.ts` vs files in `features/game/api/`:

- [ ] Is `getGameThrows` present in `features/game/api/get-game.ts`? If not, move it there.
- [ ] Is there an equivalent of `getFinishedGame`? If not, add it to `features/game/api/finish-game.ts` or a new file.
- [ ] Ensure `features/game/api/index.ts` exports all necessary functions.

Compare `shared/lib/api/room.ts` vs `features/room/api/`:

- [ ] Does `getInvitation` exist? If not, add it to `features/room/api/`.
- [ ] Is `createRoom` duplicated? Sync the implementations.

### 3.3 — Move `shared/ports/game-flow.ts`

`game-flow.ts` is a DI interface that aggregates calls from the game and room APIs. In a feature-
based architecture it belongs to the layer that orchestrates them, i.e. `features/game`.

- [ ] Move `shared/ports/game-flow.ts` → `features/game/ports/game-flow.ts`
- [ ] Update imports inside the file (types now from `@/shared/types`, functions from `./api/` and `@/features/room`)
- [ ] **Important:** replace import from `shared/lib/api/room` with
      `features/room/api/`:
  ```ts
  // before:
  import { createRoom, addGuestPlayer, ... } from "@/lib/api/room";
  // after:
  import { createRoom, addGuestPlayer, ... } from "@/features/room";
  ```

### 3.4 — Move `shared/providers/GameFlowPortProvider.tsx`

- [ ] Move it to `features/game/providers/GameFlowPortProvider.tsx`
- [ ] Update the internal import:
  ```ts
  // before:
  import { defaultGameFlowPort } from "@/shared/ports/game-flow";
  // after:
  import { defaultGameFlowPort } from "../ports/game-flow";
  ```
- [ ] Export it from `features/game/index.ts`:
  ```ts
  export { GameFlowPortProvider, useGameFlowPort } from "./providers/GameFlowPortProvider";
  ```

### 3.5 — Update consumers of `shared/providers/GameFlowPortProvider`

| Consumer                                               | New import        |
| ------------------------------------------------------ | ----------------- |
| `features/game-summary/hooks/useGameSummaryPage.ts`    | `@/features/game` |
| `features/settings/routes/Settings.tsx`                | `@/features/game` |
| `features/start/hooks/useStartPage.ts`                 | `@/features/game` |
| `features/statistics/hooks/useGameDetailPage.ts`       | `@/features/game` |
| `features/room/hooks/useGamePlayers.ts` (from Phase 2) | `@/features/game` |
| `src/index.tsx`                                        | `@/features/game` |

### 3.6 — Update consumers of `shared/ports/game-flow` (types)

| Consumer                               | What it imports         | New import                             |
| -------------------------------------- | ----------------------- | -------------------------------------- |
| `features/start/hooks/useStartPage.ts` | `AddGuestErrorResponse` | `@/features/game` or `@/features/room` |

### 3.7 — Delete empty files from `shared/lib/api/`

- [ ] After moving types, delete `shared/lib/api/game.ts`
- [ ] Delete `shared/lib/api/room.ts`
- [ ] Update `shared/lib/api/index.ts` — remove game/room re-exports
- [ ] Delete the `shared/ports/` folder
- [ ] Delete the `shared/providers/` folder

## Phase readiness check

```bash
npm run typecheck
npm run eslint
npm run test
npm run test:e2e
```

## Important notes

- `features/game` will now import from `features/room` (via `@/features/room`) — this is fine for the
  feature-based layout (unlike FSD, there is no strict prohibition).
- Do **not** touch `shared/lib/api/client.ts` and `errors.ts` — they remain infrastructure.
