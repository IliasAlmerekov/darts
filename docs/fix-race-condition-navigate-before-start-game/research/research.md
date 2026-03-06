# Research: Fix Race Condition — Navigate Before startGame Completes

**Date:** 2026-03-06
**Ticket:**

```
Severity: Critical
Component/Path: useGameSummaryPage.ts:129
Risk: Race condition: navigate to Game before startGame() completes — game still in lobby
Evidence: navigate(ROUTES.game(rematch.gameId)) → void startGame(...) without await
Recommendation: Await startGame() before navigating
```

**Feature folder:** docs/fix-race-condition-navigate-before-start-game/

---

## Current State

The race condition exists. `handlePlayAgain()` in `useGameSummaryPage.ts` navigates to `/game/{id}` at line 129 synchronously, before firing `startGame()` as a void fire-and-forget call at line 131. The game is in `lobby` status at the moment of navigation. `GamePage` has no guard against lobby status.

---

## Domain Types and Stores

### `GameStatus`

**File:** `src/shared/types/game.ts`
**Kind:** enum
**Values:** `Lobby = "lobby"`, `Started = "started"`, `Finished = "finished"`
**Used by:** `useGameLogic.ts`, `useStartPage.ts`, navigation guard in `shouldNavigateToSummary()`

### `GameState`

**File:** `src/shared/types/game.ts`
**Kind:** interface
**Fields:** `gameId: number`, `status: GameStatus`, `startScore: number`, `doubleOut: boolean`, `tripleOut: boolean`, `currentRound: number`, `currentPlayerId: number`, `winner: GamePlayer | null`, `players: GamePlayer[]`, `throws: ThrowRecord[]`

### `GameThrowsResponse`

**File:** `src/shared/types/game.ts`
**Kind:** type (raw API response shape, used in store)
**Fields:** `id: number`, `status: string`, `currentRound: number`, `activePlayerId: number`, `currentThrowCount: number`, `players: [...]`, `winnerId: number | null`, `settings: { startScore, doubleOut, tripleOut }`
**Used by:** `$gameData` store

### `RematchResponse`

**File:** `src/shared/types/api.ts`
**Kind:** interface
**Fields:** `success: boolean`, `gameId: number`, `invitationLink: string`
**Used by:** `useGameSummaryPage.ts`

### `StartGameRequest`

**File:** `src/shared/types/api.ts`
**Kind:** interface
**Fields:** `startScore: number`, `doubleOut: boolean`, `tripleOut: boolean`, `round?: number`, `status?: string`

### `Invitation`

**File:** `src/shared/store/game-session.ts`
**Kind:** interface
**Fields:** `gameId: number`, `invitationLink: string`
**Used by:** `$invitation` store, `setInvitation()` action

### `$gameData`

**File:** `src/shared/store/game-state.ts`
**Kind:** nanostore atom — `atom<GameThrowsResponse | null>(null)`
**Actions:** `setGameData()`, `resetGameStore()`
**Used by:** `useGameLogic.ts`, `useGameState.ts`

### `$gameSettings`

**File:** `src/shared/store/game-state.ts`
**Kind:** nanostore computed — derives `settings` from `$gameData`
**Used by:** `useGameSummaryPage.ts` (reads `startScore`, `doubleOut`, `tripleOut` for `startGame` config)

### `$invitation`

**File:** `src/shared/store/game-session.ts`
**Kind:** nanostore atom, persisted in `sessionStorage`
**Actions:** `setInvitation()` (also calls `setCurrentGameId()`)
**Used by:** `useGameSummaryPage.ts`

### `$currentGameId`

**File:** `src/shared/store/game-session.ts`
**Kind:** nanostore atom, persisted in `sessionStorage`
**Actions:** `setCurrentGameId()`

### `$lastFinishedGameId`

**File:** `src/shared/store/game-session.ts`
**Kind:** nanostore atom, transient (not persisted)
**Actions:** `setLastFinishedGameId()`

---

## Architecture and Patterns

### Folder structure (relevant)

```
src/
  pages/
    GameSummaryPage/
      index.tsx                     — component (renders buttons, podium, leaderboard)
      useGameSummaryPage.ts         — PRIMARY FILE (race condition here)
      useGameSummaryPage.test.ts    — unit tests (gap: no ordering assertion)
      GameSummaryPage.test.tsx      — integration tests (no rematch coverage)
      GameSummaryPage.module.css
    GamePage/
      index.tsx                     — GamePage component (no lobby-status guard)
      useGameLogic.ts               — navigates to summary when status === "finished"
      useGameLogic.test.ts          — tests shouldNavigateToSummary helper
      useGameState.ts               — AbortController, ETag fetch
    StartPage/
      useStartPage.ts               — REFERENCE: correct await-then-navigate pattern
      useStartPage.actions.test.ts  — REFERENCE: tests navigate-after-startGame ordering
  shared/
    api/
      game.ts                       — startGame(), createRematch(), and all game endpoints
      client.ts                     — HTTP client with AbortController + 30s timeout
      errors.ts                     — typed error classes
    lib/
      routes.ts                     — ROUTES constant
      error-to-user-message.ts      — toUserErrorMessage() utility
      player-mappers.ts             — mapPlayerToUI(), mapPlayersToUI()
    store/
      game-state.ts                 — $gameData, $gameSettings, $isLoading, $error
      game-session.ts               — $invitation, $currentGameId, $lastFinishedGameId
      auth.ts                       — $user, $authChecked, $authError
    types/
      game.ts                       — GameStatus, GameState, GameThrowsResponse, WinnerPlayerProps
      api.ts                        — StartGameRequest, RematchResponse, FinishedPlayerResponse
```

### Patterns CONFIRMED — must be respected in implementation

- **Component pattern:** functional component with explicit return type — confirmed across all pages
- **CSS:** CSS Modules co-located at `ComponentName.module.css` — confirmed
- **Hooks:** `use` prefix, effect cleanup mandatory — confirmed
- **Stores:** `$` prefix, mutations via explicit actions only — confirmed
- **Network:** AbortController for cancellation — confirmed in `client.ts` (internal) and `useGameState.ts`, `useAuthenticatedUser.ts` (effect-level)
- **Error handling:** no silent catch — confirmed; all catches use `toUserErrorMessage()` or rethrow typed error
- **Raw DTOs in UI:** FORBIDDEN — confirmed, mapping happens at API or hook boundary

### Naming conventions observed

- Files: `{domain}.{type}.ts` (e.g., `useGameSummaryPage.ts`, `game.ts`)
- Stores: `$` prefix with camelCase (`$gameData`, `$invitation`)
- DTOs/Response types: `Response` suffix (`RematchResponse`, `FinishedPlayerResponse`) — NOT `Dto` suffix (no `Dto` suffix found in this domain)
- Mappers: verb-first (`mapPlayerToUI`, `mapPlayersToUI`)
- Constants: `UPPER_SNAKE_CASE` (`START_GAME_ENDPOINT`, `ROUTES`)

### Import rules confirmed

- `app → pages → shared` direction — no violations found

---

## Related Components and Pages

### `useGameSummaryPage` (PRIMARY — directly affected)

**File:** `src/pages/GameSummaryPage/useGameSummaryPage.ts`
**Signature:** `export function useGameSummaryPage(): { error, podiumData, newList, leaderBoardList, loadSummary, handleUndo, handlePlayAgain, handleBackToStart }`
**Local state:** `useState<string | null>` for error
**Stores read:** `$gameSettings` (for startScore/doubleOut/tripleOut), `$invitation`
**Store actions called:** `setInvitation()`
**Key flow — `handlePlayAgain()` (lines 109–145):**

1. `createRematch(finishedGameIdFromRoute)` — awaited
2. `setInvitation({ gameId: rematch.gameId, invitationLink: rematch.invitationLink })` — synchronous store update
3. **Line 129:** `navigate(ROUTES.game(rematch.gameId))` — synchronous navigate, game is in `lobby` status
4. **Lines 131–140:** `void startGame(rematch.gameId, { startScore, doubleOut, tripleOut, round: 1, status: "started" }).catch(...)` — fire-and-forget, NOT awaited

**Key flow — `handleBackToStart()` (line 163):**

- `navigate(ROUTES.start(rematch.gameId))` — navigates to StartPage (not GamePage); no race condition

**Key flow — `handleUndo()` (line 100):**

- `navigate(ROUTES.game(finishedGameIdFromRoute), { state: { skipFinishOverlay: true } })` — called AFTER awaiting `undoLastThrow()`; no race condition

### `GameSummaryPage` (directly affected)

**File:** `src/pages/GameSummaryPage/index.tsx`
**Signature:** `function GameSummaryPage(): React.JSX.Element`
**Calls:** `handlePlayAgain()`, `handleUndo()`, `handleBackToStart()` from hook on button clicks

### `GamePage` (reference — receives navigation)

**File:** `src/pages/GamePage/index.tsx`
**Signature:** `function GamePage(): JSX.Element`
**Notes:** No direct status guard; delegates to `useGameLogic`
**No lobby-status redirect** — only redirects `finished` → summary

### `useGameLogic` (reference — lobby status behavior)

**File:** `src/pages/GamePage/useGameLogic.ts`
**Status-based navigation (lines 150–153):**

```
useEffect(() => {
  if (gameId !== null && shouldNavigateToSummary(gameData, gameId)) {
    navigate(ROUTES.summary(gameId), { state: { finishedGameId: gameId } });
  }
}, [gameData, gameId, navigate]);
```

`shouldNavigateToSummary()`: checks `gameData.status === "finished"` only.
**No guard for `status === "lobby"`** — game in lobby renders normally without redirect.

### `useStartPage` (reference pattern — correct behavior)

**File:** `src/pages/StartPage/useStartPage.ts`
**Correct pattern (lines 315–342):**

- Guards with `starting` flag and `startGameInFlightRef` to prevent concurrent calls
- Awaits `startGame()` before calling `navigate()`
- On error: calls `toUserErrorMessage()`, sets error state
- Finally: clears in-flight refs

---

## API Layer and Data Mapping

### `startGame`

**File:** `src/shared/api/game.ts` (lines 180–188)
**Signature:** `export async function startGame(gameId: number, config: StartGameRequest): Promise<void>`
**Endpoint:** `POST /game/{id}/start`
**Payload:** maps camelCase config → snake_case (`startscore`, `doubleout`, `tripleout`)
**Return:** `Promise<void>` — no data returned
**Cancellation:** Internal AbortController via `apiClient.post()` (30s timeout)
**Error handling:** All errors propagate to caller; no internal catch

### `createRematch`

**File:** `src/shared/api/game.ts` (lines 221–242)
**Signature:** `export async function createRematch(previousGameId: number): Promise<RematchResponse>`
**Endpoint:** `POST /room/{id}/rematch` (+ fallback `POST /invite/create/{id}` if link missing)
**Return:** `Promise<RematchResponse>` with `{ success, gameId, invitationLink }`
**Cancellation:** Internal AbortController via `apiClient.post()`
**Error handling:** All errors propagate to caller; no internal catch

### `ROUTES`

**File:** `src/shared/lib/routes.ts`
**Relevant:** `game: (id: number) => \`/game/${id}\``and`start: (id?: number) => string`

### Error hierarchy

**File:** `src/shared/api/errors.ts`
Classes: `ApiError` (base), `UnauthorizedError` (401), `ForbiddenError` (403), `NetworkError`, `TimeoutError`

### `toUserErrorMessage`

**File:** `src/shared/lib/error-to-user-message.ts`
**Signature:** converts `unknown` error → user-safe `string`
**Used by:** all page-level hooks in catch blocks

---

## Tests and Coverage

### Existing Tests

| Test file                                              | Kind             | What it covers                                                                                                    |
| ------------------------------------------------------ | ---------------- | ----------------------------------------------------------------------------------------------------------------- |
| `src/pages/GameSummaryPage/useGameSummaryPage.test.ts` | unit/integration | `handlePlayAgain`: createRematch called, startGame called with correct params, navigate called — but NOT ordering |
| `src/pages/GameSummaryPage/GameSummaryPage.test.tsx`   | integration      | UI rendering, error panel — no rematch/startGame behavior                                                         |
| `src/shared/api/rematch.test.ts`                       | unit             | `createRematch` API function, two request shapes                                                                  |
| `src/pages/StartPage/useStartPage.actions.test.ts`     | unit/integration | `handleStartGame` ordering: navigate called AFTER startGame completes (deferred promise pattern)                  |
| `src/pages/GamePage/useGameLogic.test.ts`              | unit             | `shouldNavigateToSummary`, `shouldAutoFinishGame` helpers — no rematch                                            |
| `src/pages/LoginPage/useLogin.test.ts`                 | unit/integration | login flow + navigate — no fire-and-forget patterns                                                               |

### Coverage Gaps (confirmed absences)

- **navigate-before-startGame ordering in handlePlayAgain:** `useGameSummaryPage.test.ts` verifies calls occur but uses synchronous mocks — does NOT assert that `navigate` is called before `startGame` resolves
- **Deferred/pending startGame mock in GameSummaryPage:** No test holds `startGame` as a pending promise to verify `navigate` fires first
- **lobby status guard in GamePage:** No test verifies what GamePage renders/does when game is in `lobby` status
- **E2E: game summary page flow:** NOT FOUND — searched `tests/joined-game/*.spec.ts`, patterns: "summary", "rematch", "finish"
- **E2E: rematch/play-again flow:** NOT FOUND — searched same patterns
- **startGame error → error state when game already navigated:** `useGameSummaryPage.test.ts` lacks test that confirms error state propagates after fire-and-forget `.catch()` when component has already navigated away

---

## Missing — Required for This Ticket

- **Await guard for `startGame` in `handlePlayAgain`:** Currently fire-and-forget (`void`); no await before navigate
- **Loading state for `startGame` call in `handlePlayAgain`:** No `starting` flag or in-flight ref (unlike `useStartPage`)
- **Test: navigate ordering with deferred startGame mock:** No existing test controls timing to verify navigate waits for startGame
- **Test: GamePage behavior when status = "lobby":** No test for the lobby state that the race condition produces
- **E2E test for rematch flow:** No Playwright coverage of game summary → play again → game page

---

## File Reference Index

**MUST READ before implementation:**

- `src/pages/GameSummaryPage/useGameSummaryPage.ts` — primary file with race condition (line 129)
- `src/pages/GameSummaryPage/useGameSummaryPage.test.ts` — existing tests, ordering gap
- `src/pages/StartPage/useStartPage.ts` (lines 315–342) — reference: correct await-then-navigate pattern
- `src/pages/StartPage/useStartPage.actions.test.ts` — reference: deferred promise test pattern
- `src/pages/GamePage/useGameLogic.ts` (lines 150–153, 45–54) — lobby status behavior
- `src/shared/api/game.ts` (lines 180–188, 221–242) — `startGame`, `createRematch` signatures
- `src/shared/store/game-state.ts` — `$gameData`, `$gameSettings`, `$isLoading`
- `src/shared/lib/error-to-user-message.ts` — error-to-string utility

**NOT FOUND (confirmed absent):**

- Loading/in-flight flag for `startGame` in `GameSummaryPage` context (searched `useGameSummaryPage.ts`)
- E2E tests for rematch flow (searched `tests/joined-game/`, patterns: "summary", "rematch", "finish")
- Lobby status redirect guard in `GamePage` or `useGameLogic` (searched both files)
- `handlePlayAgain` ordering test with deferred promise (searched `useGameSummaryPage.test.ts`)

---

## Constraints Observed

- Functional components only — confirmed across all `src/pages/` and `src/shared/`
- CSS Modules co-located — confirmed in all page components
- Mappers are pure functions at `shared/lib/` or `shared/api/` boundary — confirmed
- AbortController used in `apiClient` (internal, per-request) — confirmed; NOT passed explicitly at domain API level
- No silent catch blocks — confirmed; all catches call `toUserErrorMessage()` or rethrow typed errors
- Raw DTOs never passed to UI — confirmed
- Nanostores mutations via explicit actions only — confirmed (`setGameData`, `setInvitation`, etc.)
- Effects must clean up — confirmed (AbortController.abort() in useEffect cleanup)
- Network requests must support cancellation — confirmed at HTTP client level
- `any` FORBIDDEN — confirmed; `unknown` + type guards used instead
