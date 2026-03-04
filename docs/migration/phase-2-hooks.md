# Phase 2 — Move hooks from `shared/hooks` into features

## Goal

After this phase `shared/hooks/` should contain only the infrastructure hook `useEventSource`.
All domain-specific hooks live inside their respective features.

## Current state analysis

Important: some hooks in `shared/hooks/` already have **duplicates in features**:

| File in `shared/hooks/`   | Duplicate in feature                          | Action                                   |
| ------------------------- | --------------------------------------------- | ---------------------------------------- |
| `useAuthenticatedUser.ts` | `features/auth/hooks/useAuthenticatedUser.ts` | Verify they are identical, remove shared |
| `useRoomStream.ts`        | `features/room/hooks/useRoomStream.ts`        | Verify they are identical, remove shared |
| `useGamePlayers.ts`       | `features/room/hooks/useGamePlayers.ts`       | Verify they are identical, remove shared |
| `useEventSource.ts`       | no duplicate                                  | Move to `shared/lib/useEventSource.ts`   |

## Tasks

### 2.1 — Verify duplicates are identical

Before deleting ensure that the versions in features contain up-to-date logic.

- [ ] Compare `shared/hooks/useAuthenticatedUser.ts` vs `features/auth/hooks/useAuthenticatedUser.ts`
  - If they differ, port missing logic into the feature version
- [ ] Compare `shared/hooks/useRoomStream.ts` vs `features/room/hooks/useRoomStream.ts`
  - If they differ, port missing logic into the feature version
- [ ] Compare `shared/hooks/useGamePlayers.ts` vs `features/room/hooks/useGamePlayers.ts`
  - If they differ, port missing logic into the feature version

### 2.2 — Move `useEventSource`

`useEventSource` is a pure infrastructure hook (SSE connection) and is not domain-specific.

- [ ] Move `shared/hooks/useEventSource.ts` → `shared/lib/useEventSource.ts`
- [ ] Update the import in `shared/hooks/useGamePlayers.ts` (temporary, it will also move later)
- [ ] Update the import in `features/room/hooks/useGamePlayers.ts`:
  ```ts
  // before:
  import { useEventSource } from "@/hooks/useEventSource";
  // after:
  import { useEventSource } from "@/shared/lib/useEventSource";
  ```

### 2.3 — Update consumers of `@/hooks/useRoomStream`

| Consumer                              | Old import              | New import                                                                         |
| ------------------------------------- | ----------------------- | ---------------------------------------------------------------------------------- |
| `features/game/hooks/useGameLogic.ts` | `@/hooks/useRoomStream` | `@/features/room` or via relative `../hooks/useRoomStream` inside the room feature |

> Resolution: make `features/room/index.ts` export `useRoomStream`, then:
>
> ```ts
> import { useRoomStream } from "@/features/room";
> ```

### 2.4 — Update consumers of `@/hooks/useAuthenticatedUser`

| Consumer                                   | Old import                     | New import        |
| ------------------------------------------ | ------------------------------ | ----------------- |
| `features/player/routes/PlayerProfile.tsx` | `@/hooks/useAuthenticatedUser` | `@/features/auth` |

- [ ] Ensure `features/auth/index.ts` exports `useAuthenticatedUser`

### 2.5 — Update consumers of `@/hooks/useGamePlayers`

| Consumer                                                          | Old import               | New import        |
| ----------------------------------------------------------------- | ------------------------ | ----------------- |
| `features/start/components/live-players-list/LivePlayersList.tsx` | `@/hooks/useGamePlayers` | `@/features/room` |
| `features/start/hooks/useStartPage.ts`                            | `@/hooks/useGamePlayers` | `@/features/room` |

- [ ] Ensure `features/room/index.ts` exports `useGamePlayers`

### 2.6 — Pay down `shared/ui/NavigationBar.tsx`

`NavigationBar.tsx` imports `$currentGameId` from `@/stores` (after Phase 1 this resolves to `@/features/room`).

This is a violation: `shared/ui` should not depend on features.

**Options:**

- **Preferred**: pass `currentGameId` as a prop to `NavigationBar`
  ```tsx
  // in a feature route or layout:
  import { useStore } from "@nanostores/react";
  import { $currentGameId } from "@/features/room";
  <NavigationBar currentGameId={useStore($currentGameId)} />;
  ```
- [ ] Add a `currentGameId?: number | null` prop to `NavigationBar`
- [ ] Remove the direct store import from `NavigationBar.tsx`
- [ ] Update all renders of `NavigationBar` to supply the value from above

### 2.7 — Delete `shared/hooks/`

- [ ] Ensure `grep -r '@/hooks/' src/` returns 0 results
- [ ] Delete `shared/hooks/useAuthenticatedUser.ts`
- [ ] Delete `shared/hooks/useRoomStream.ts` and `useRoomStream.test.ts`
- [ ] Delete `shared/hooks/useGamePlayers.ts`
- [ ] Delete `shared/hooks/useEventSource.ts` (already moved to `shared/lib/`)
- [ ] Delete the `shared/hooks/` folder

## Phase readiness check

```bash
npm run typecheck
npm run eslint
npm run test
npm run test:e2e
```

## Note on aliases

The alias `@/hooks/*` in `tsconfig.json` **should not be removed** yet — it will be dropped in Phase 5.
