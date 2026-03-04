# Phase 4 — Remove `entities/` and final shared cleanup

## Goal

Remove the empty `entities/` layer. Ensure that `shared/` contains only
infrastructure and no domain logic.

## `entities/` analysis

Current contents are just type re-exports:

```ts
// entities/game/index.ts
export { GameStatus, GameMode } from "./types";
export type { GamePlayer, ThrowRecord, GameState } from "./types";

// entities/player/index.ts
export type { PlayerProfile, PlayerStats, PlayerOverviewItem } from "./types";

// entities/room/index.ts
export type { RoomStreamEvent, RoomState } from "./types";

// entities/index.ts — general re-export
```

The only consumer of `@/entities` is:

- `shared/types/event.ts`: `export type { RoomStreamEvent, RoomState } from "@/entities/room";`

## Tasks

### 4.1 — Re-distribute types from `entities/` into features

| From                                                                                | To                                                        |
| ----------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `entities/game/types.ts` (GameStatus, GameMode, GamePlayer, ThrowRecord, GameState) | `features/game/types.ts` (file may already exist, verify) |
| `entities/player/types.ts` (PlayerProfile, PlayerStats, PlayerOverviewItem)         | `features/player/types.ts` (file already exists)          |
| `entities/room/types.ts` (RoomStreamEvent, RoomState)                               | `features/room/types.ts` (file already exists)            |

**For types needed in multiple features** (e.g. `GameState` is used in `statistics` and `game`):
move them into `shared/types/game.ts`.

### 4.2 — Update `shared/types/event.ts`

```ts
// before:
export type { RoomStreamEvent, RoomState } from "@/entities/room";

// after:
export type { RoomStreamEvent, RoomState } from "@/features/room";
```

### 4.3 — Check all consumers of `@/entities`

```bash
grep -r '@/entities' src/
```

Expected: only `shared/types/event.ts` (updated in step 4.2). After updating there should be 0 results.

### 4.4 — Delete `entities/`

- [ ] Delete `src/entities/game/types.ts`
- [ ] Delete `src/entities/game/index.ts`
- [ ] Delete `src/entities/player/types.ts`
- [ ] Delete `src/entities/player/index.ts`
- [ ] Delete `src/entities/room/types.ts`
- [ ] Delete `src/entities/room/index.ts`
- [ ] Delete `src/entities/index.ts`
- [ ] Delete the `src/entities/` folder

### 4.5 — Audit `shared/` after phases 1–3

Run a check to see what's left in `shared/` and ensure nothing extraneous remains.

```bash
find src/shared -type f -name "*.ts" -o -name "*.tsx"
```

After phases 1–3, `shared/` should contain only:

```
shared/
  ui/                          # UI kit — do not touch
  lib/
    api/
      client.ts               ✅ infrastructure
      errors.ts               ✅ infrastructure
      types.ts                ✅ infrastructure
      index.ts                ✅ re-export
    error-to-user-message.ts  ✅ utility
    parseThrowValue.ts        ✅ utility
    player-mappers.ts         ✅ utility (but verify whether only shared needs it)
    soundPlayer.ts            ✅ infrastructure
    useEventSource.ts         ✅ infrastructure (moved from hooks in Phase 2)
  types/                      ✅ DTO / API contracts
```

### 4.6 — Check `shared/lib/player-mappers.ts`

- [ ] Find all consumers of `player-mappers`:
  ```bash
  grep -r 'player-mappers' src/
  ```

````
- [ ] If only used within `features/player/` → move it there
- [ ] If used across multiple features → keep it in `shared/lib/`

### 4.7 — Audit `shared/types/`

- [ ] Confirm that `shared/types/game.ts`, `player.ts`, `player-ui.ts`, `event.ts`, `game-throws.ts` are DTOs and API contracts, not domain logic
- [ ] Types needed only by a single feature should be moved into that feature

## Phase readiness check

```bash
# No references to @/entities
grep -r '@/entities' src/ # → 0 results

npm run typecheck
npm run eslint
npm run test
npm run test:e2e
````
