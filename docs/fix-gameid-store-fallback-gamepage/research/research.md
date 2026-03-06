# Research: Fix gameId Store Fallback in GamePage

**Date:** 2026-03-06
**Ticket:** High — gameId from store as fallback in GamePage. When `gameIdParam` is undefined or non-numeric, `gameId` falls back to `invitation?.gameId` from the store, causing URL-to-game mismatch and hiding invalid-param errors.
**Feature folder:** docs/fix-gameid-store-fallback-gamepage/

## Current State

The fallback exists and is active: `useGameLogic.ts` lines 62–66 return `invitation?.gameId ?? null` when `gameIdParam` is absent or fails `Number.isFinite()` parse. The `!gameId` error path in `GamePage/index.tsx` lines 179–190 is fully implemented and renders a user-safe `ErrorState`. No test covers the `useMemo` resolution logic directly.

## Domain Types and Stores

### Invitation

**File:** src/shared/store/game-session.ts:3–6
**Kind:** interface
**Fields/Shape:**

```
gameId: number
invitationLink: string
```

**Used by:** src/pages/GamePage/useGameLogic.ts, src/pages/StartPage/useStartPage.ts

### $invitation

**File:** src/shared/store/game-session.ts:99
**Kind:** nanostore atom — `atom<Invitation | null>`
**Initialized from:** `getStoredInvitation()` — reads `sessionStorage["darts_current_invitation"]` on app init
**Used by:** GamePage (useGameLogic), StartPage (useStartPage)

### setInvitation

**File:** src/shared/store/game-session.ts:117–131
**Signature:** `setInvitation(invitation: Invitation | null): void`
**Side effect:** calls `setCurrentGameId(invitation.gameId)` when `invitation` is non-null — syncs `$currentGameId` atom
**Used by:** useGameLogic (handleExitGame after rematch), useGameSummaryPage (handlePlayAgain)

### $currentGameId

**File:** src/shared/store/game-session.ts
**Kind:** nanostore atom
**Synced via:** `setInvitation()` and `setCurrentGameId()` actions
**Used by:** `getActiveGameId()` utility

### Types with `gameId: number`

| Type                 | File                                 | Purpose                         |
| -------------------- | ------------------------------------ | ------------------------------- |
| `Invitation`         | src/shared/store/game-session.ts:3–6 | Store interface                 |
| `CreateRoomResponse` | src/shared/types/api.ts:13–16        | API response — room creation    |
| `RematchResponse`    | src/shared/types/api.ts:42–46        | API response — rematch creation |

## Architecture and Patterns

**Folder structure (GamePage):**

```
src/pages/GamePage/
  index.tsx
  useGameLogic.ts
  useGameState.ts
  useThrowHandler.ts
  useGameSounds.ts
  usePlayerThrowsDisplay.ts
  Game.module.css
  GamePage.test.tsx
  useGameLogic.test.ts
  useGameState.test.ts
  useThrowHandler.test.ts
  usePlayerThrowsDisplay.test.tsx
  components/
    game-player-item/
      GamePlayerItem.tsx
      GamePlayerItemList.tsx
      FinishedGamePlayerItemList.tsx
      GamePlayerItem.module.css
      GamePlayerItemList.test.tsx
      FinishedGamePlayerItemList.test.tsx
    Keyboard.tsx
    Keyboard.module.css
    NumberButton.tsx
    SettingsOverlay.tsx
    SettingsOverlay.module.css
```

**Patterns CONFIRMED — must be respected in implementation:**

- Component pattern: functional component with explicit return type — confirmed
- CSS: CSS Modules co-located — confirmed
- Hooks: `use` prefix, effect cleanup mandatory — confirmed
- Stores: `$` prefix, mutations via explicit actions only — confirmed
- Network: AbortController for cancellation — confirmed (useGameState.test.ts)
- Error handling: no silent catch — confirmed
- `any` type: not used in gameId-related code — confirmed

**Naming conventions observed:**

- Hooks: `use` prefix, co-located with page (`useGameLogic.ts`)
- DTOs: `Dto` suffix (`PlayerDto`)
- Mappers: verb-first (`mapPlayersToUI`)
- Constants: `UPPER_SNAKE_CASE`

**Import rules confirmed:**

- `app → pages → shared` direction — no violations observed in GamePage

## Related Components and Pages

### useGameLogic (directly affected)

**File:** src/pages/GamePage/useGameLogic.ts
**Signature:** `export const useGameLogic = () => { ... }`
**gameId resolution (lines 59–66):**

```typescript
const { id: gameIdParam } = useParams<{ id?: string }>();
const invitation = useStore($invitation);

const gameId = useMemo(() => {
  if (!gameIdParam) return invitation?.gameId ?? null;
  const parsed = Number(gameIdParam);
  return Number.isFinite(parsed) ? parsed : (invitation?.gameId ?? null);
}, [gameIdParam, invitation?.gameId]);
```

**Other uses of `invitation` in this file:**

- `handleExitGame` (lines ~234–253): calls `createRematch`, then `setInvitation({ gameId: newGameId, ... })`, then navigates — uses `setInvitation` action, NOT `invitation` value directly
  **Returns:** `gameId` in hook return value

### GamePage (directly affected)

**File:** src/pages/GamePage/index.tsx
**gameId usage:** destructured from `useGameLogic()` at line 177
**Lines 179–190 — ErrorState when `!gameId`:**

```typescript
if (!gameId) {
  return (
    <div className={styles.gamePageHeader}>
      <ErrorState
        variant="page"
        title="Game not available"
        message="Game identifier is missing. Reopen the room or return to start."
        primaryAction={{ label: "Back to start", to: ROUTES.start() }}
      />
    </div>
  );
}
```

**Routes:** `/game/:id` — defined in src/app/App.tsx:88

### useStartPage (reference pattern — similar fallback, NOT in scope)

**File:** src/pages/StartPage/useStartPage.ts
**gameId resolution (lines 104–110):** URL param first (`if (gameIdParam) parse it`), then `invitation?.gameId ?? null` as explicit fallback
**Note:** Inverted priority order from GamePage — URL param is checked first in `if` branch

### GameSummaryPage / GameDetailPage (reference — no `$invitation` fallback)

- `useGameSummaryPage.ts`: resolves from `location.state` first, then URL param; no `$invitation` fallback
- `useGameDetailPage.ts`: URL param only; no `$invitation` fallback

## API Layer and Data Mapping

### useParams pattern

**Consistent across all pages:**

```typescript
const { id: gameIdParam } = useParams<{ id?: string }>();
```

Typed as optional string. Numeric parsing happens inside each hook's `useMemo`.

### Route definition

**File:** src/app/App.tsx:88

```typescript
<Route path="/game/:id" element={<GamePage />} />
```

The `:id` segment is always present in normal navigation flows (StartPage calls `navigate(ROUTES.game(gameId))`). It can be absent only if a user manually constructs an invalid URL.

### ROUTES.game

**File:** src/shared/lib/routes.ts
**Signature:** `game: (id: number) => `/game/${id}``
All in-app navigation to GamePage passes a numeric id.

### game API endpoints

**File:** src/shared/api/game.ts
All functions require `gameId: number` as first parameter. No function accepts `null` or `undefined`. AbortController used — confirmed via useGameState.test.ts.

## Tests and Coverage

### Existing Tests

| Test file                                          | Kind        | What it covers                                                                                          |
| -------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------- |
| src/pages/GamePage/GamePage.test.tsx               | integration | ErrorState UI when `gameId === null`; error state for API failures — mocks entire `useGameLogic` hook   |
| src/pages/GamePage/useGameLogic.test.ts            | unit        | Pure exported functions: `areAllPlayersAtStartScore`, `shouldAutoFinishGame`, `shouldNavigateToSummary` |
| src/pages/GamePage/useGameState.test.ts            | integration | gameId lifecycle: reset on change, stale response ignore, AbortSignal cancellation                      |
| src/pages/GamePage/useThrowHandler.test.ts         | integration | Throw/undo queue, optimistic updates, 409 conflict resolution                                           |
| src/pages/GamePage/usePlayerThrowsDisplay.test.tsx | unit        | UI display mapping logic                                                                                |
| tests/joined-game/basic-throw.spec.ts              | E2E         | Throw recording, modifiers, bust, checkout, undo, keyboard                                              |
| tests/joined-game/start-game-redirect.spec.ts      | E2E         | Redirect to `/game/{gameId}` after start                                                                |

### Coverage Gaps (confirmed absences)

- `useMemo` gameId resolution block (lines 62–66): NO test
  - Searched: `useGameLogic.test.ts` — contains only pure function tests, not hook behavior
  - Scenario NOT tested: `gameIdParam = undefined`, invitation has `gameId` → currently returns `invitation.gameId`, after fix should return `null`
  - Scenario NOT tested: `gameIdParam = "abc"` (non-numeric), invitation has `gameId` → currently returns `invitation.gameId`, after fix should return `null`
  - Scenario NOT tested: valid `gameIdParam = "42"` → should return `42` (unchanged, confirmed working)
- E2E: no test for `/game/` (no param) or `/game/abc` (invalid param) navigation
- `GamePage.test.tsx` mocks `useGameLogic` entirely — does not test actual resolution

## Missing — Required for This Ticket

- Test for `useMemo` in `useGameLogic`: behavior when `gameIdParam` is `undefined`
- Test for `useMemo` in `useGameLogic`: behavior when `gameIdParam` is non-numeric string
- Test for `useMemo` in `useGameLogic`: behavior when `gameIdParam` is valid numeric string

## File Reference Index

**MUST READ before implementation:**

- src/pages/GamePage/useGameLogic.ts (lines 56–70: gameId resolution; lines 234–253: handleExitGame)
- src/pages/GamePage/index.tsx (lines 177–190: ErrorState guard)
- src/shared/store/game-session.ts (lines 3–6: Invitation interface; lines 99, 117–131: $invitation, setInvitation)
- src/pages/GamePage/useGameLogic.test.ts (existing test structure to follow)

**NOT FOUND (confirmed absent):**

- Test for gameId useMemo hook behavior: no file in `src/pages/GamePage/*.test.ts` tests this

## Constraints Observed

- Functional components only — confirmed across all src/pages/
- CSS Modules co-located — confirmed
- Hooks: effect cleanup mandatory — confirmed (useGameLogic sound unlock effect)
- Stores: `$` prefix, mutations via explicit actions only — confirmed (`setInvitation`, `resetRoomStore`)
- `any` type — not used in gameId-related code; FORBIDDEN by project rules
- AbortController for all network calls — confirmed
- No silent catch blocks — confirmed
- Raw DTOs never passed to UI — confirmed
- `$invitation` import in useGameLogic remains after the fix (used by `handleExitGame` via `setInvitation`)
- `invitation?.gameId` dependency removed from `useMemo` deps array after fix
- ErrorState path (`!gameId`) already handles the null case — no new UI component needed
