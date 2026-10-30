# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0),
and this project does **not** yet follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html), but will adopt it in the future.

## [Unreleased]

### Added

- Code review: `.coderabbit.yaml` sets CodeRabbit up as a senior reviewer that follows `## Review guidelines` in `AGENTS.md`. It reviews every push of a ready PR, keeps the PR body untouched, and runs only the scanners CI lacks. Each finding has five parts (Severity, Location, Evidence, Impact, Fix), and the new `## Review feedback` tells agents to reproduce a finding before they act on it (#264)
- Tests: regression tests for the throw sync rules of ADR 0003, ahead of the game page refactor. A Playwright spec covers auto-finish from the winning throw to the summary. Expected failures cover a late throw response from the previous game (#95), `/finish` before the winning throw is acknowledged (#96), a failed sync with Retry (#98), competing summary actions (#100), a queue of six throws (#105), a rejected throw that rolls back the next player's throws, undo of an unsent throw, and taps that change the scoreboard within 200 ms on a 1500 ms backend (#123)
- Logging: a render error that no route boundary catches goes to `clientLogger` as `root.render.failed`, and an error React recovers from goes as the warning `root.render.recovered` with its `cause`. Both carry the React component stack under `context`. Route errors stay logged once by the route `ErrorBoundary` as `route_error_boundary_crash` (#307)

### Changed

- API: the room create and rematch responses follow darts-backend#222. `POST /api/room/create` needs an integer `gameId`, and `POST /api/room/{id}/rematch` needs `success`, an integer `gameId` and `invitationLink` and drops `message`; a body without them fails validation instead of reaching the hand-written guards, which are gone. A rematch never calls the invite endpoint, `createRematch()` folds into `createRematchGame()`, and the summary page always stores the rematch invitation. The backend already sends these bodies, so screens are unchanged (#397)
- Types: API request and response types move from the `@/types` barrel to `@/shared/api/game` (`StartGameRequest`, `ThrowRequest`, `CreateGameSettingsPayload`, `UpdateGameSettingsPayload`, `FinishedPlayerResponse`, `GameSummaryResponse`, the rematch responses, `GameSettings`, `BackendPlayer`, `BackendRoundHistory`) and `@/shared/api/room` (`AddGuestPayload`, `AddGuestErrorResponse`). `@/types` keeps only client-only types and no longer re-exports API types, so `shared/types` no longer imports from `shared/api` and the ESLint exemption for `shared/types/game.ts` and `player.ts` is gone. `GameStatus` is no longer exported, since nothing outside `game.ts` uses it. Names, schemas and emitted JavaScript are unchanged (#346)
- API: `ThrowRequest` no longer declares `isBust`, so the compiler rejects a throw request that would carry it; darts-backend#209 answers such a request with 422 `UNKNOWN_FIELD`. No request sent it. The contract dump follows backend `main` and no longer lists `POST /api/game/settings`, `POST /api/game/{gameId}/rematch/start`, `GET /api/games/{gameId}`, `GET /api/games/{gameId}/finished` or `POST`/`DELETE /api/game/{gameId}/throw`, none of which the app calls (#392)
- Lint: render-flow files (`src/pages/**/*.tsx`, `src/pages/**/use*.ts`) may no longer import the DTO mapper `toLobbyPlayers`; `sortLobbyPlayers` and the `LobbyPlayer` type stay allowed, and `getFinishedPlayers` is now allowed because only `mapPlayersToUI` of `player-mappers` is banned. `docs/convention/api.md` defines a mapper as DTO -> UI, names UI-to-UI helpers and error-message functions as not mappers, and drops the start page exceptions (#194)
- Errors: `mapInvitationErrorMessage` and its texts move from `auth-error-handling.ts` to their own `src/shared/lib/error/invitation-error-message.ts`, and the login and registration page hooks import it from there. Every invitation error shows the same text as before (#352)
- API: undo sends `DELETE /api/game/{id}/throw/delta` instead of the deprecated `DELETE /api/game/{id}/throw`, the same path as recording a throw, and accepts only the backend's `UndoAck` in reply; a full game state fails validation. The game page applies the ack as before and reloads the game on a mismatch, and the summary page's undo reopens the game as before. darts-backend#62 can remove the old route once this is deployed (#382)
- Deploy: Caddy sends `Strict-Transport-Security: max-age=31536000` on every response: the frontend files, `/api` and the lobby stream. A browser that has seen it once uses HTTPS for this host on its own for a year, so a typed `http://` no longer sends a first request in clear text over the venue Wi-Fi. It replaces any value the backend sends, so it appears once. It has no `includeSubDomains` and no `preload`. The release archive does not ship the `Caddyfile`; install it on the VM as `deploy/README.md` describes (#375)
- Auth: the login form sends `_csrf_token=csrf-token`, the fixed field the backend's origin check reads, and a 403 `CROSS_ORIGIN_REQUEST` shows "Your request was blocked. Please reload the page and try again." on the login and registration pages. The deployed backend ignores the field, so this ships before backend `main` with darts-backend#135 is deployed (#376)
- Auth: login and registration errors come from the backend's error code and, for `422 REQUEST_VALIDATION_FAILED`, from each violation's `field` and `code`; the backend's `message` is never shown and no English or German text is matched. A failed login is a 401 `LOGIN_INVALID_CREDENTIALS` with "Incorrect email or password.", `LOGIN_RATE_LIMITED` keeps the `Retry-After` wait, and a gmail address shows the @db-n.com rule from `EMAIL_DOMAIN_NOT_ALLOWED`. Logout accepts the backend's 204, `GET /api/login/success` reads only the flat user and treats its 401 as logged out, and the CSRF prefetch and retry before registration are gone. This needs the backend sub-issues of darts-backend#45 deployed in the same window (#371)
- UI: the `@/shared/ui/button` barrel exports only `Button`. `SettingsGroupBtn` and its CSS Module move to `src/pages/GamePage/components/`, next to the settings overlay, their only consumer. The view toggle is renamed from `ViewToogleButton` to `ViewToggleButton` and lives in `shared/ui/statistics-header-controls/` as a private part of `StatisticsHeaderControls`, outside that folder's barrel. Markup, class names and behaviour are unchanged (#353)
- Auth: `clearClientSession()` moves from `shared/api/auth.ts` to `src/shared/lib/auth/clearClientSession.ts`, so the API layer no longer imports the query client or the stores. `logout()` only sends the request; `useLogout` clears the client session after a successful logout and then opens the login page. A failed logout still clears nothing and keeps the page with Retry, and the 401 handler behaves as before (#345)
- Routing: each page route loader lives in its own `<loaderName>.ts` next to the page hook: `gameDetailLoader.ts`, `gameSummaryLoader.ts` and `gamesOverviewLoader.ts` join `startPageLoader.ts`, and no page hook exports a loader. `App.tsx` no longer imports the page hooks, so the summary hook's rematch code leaves the entry chunk for the summary page's lazy chunk. Routes load the same data (#347)
- Login and registration: both forms submit through `<form action>` with `useActionState` instead of `onSubmit` with hand-written `loading` and `error` state, and the login page's second `submitError` is gone. The hooks return `formAction` and `values` instead of `login`/`register` and `handleSubmit`. Pending state, the mapped error messages, the request logic and the redirects are unchanged. React 19 resets the fields after an action, so each form feeds the submitted values back as `defaultValue` and a failed submit keeps every field (#159)
- Game page: the optimistic throw and undo logic live together in `src/pages/GamePage/lib/optimisticThrow.logic.ts`. `applyOptimisticUndo` moved there from `shared/lib/game/` without its re-export shim, `playerThrowsDisplay.logic` moved to `lib/` and `usePlayerThrowsDisplay` to the page root, and `throws/` is gone. Behaviour is unchanged (#348, #349)
- Logging: a failed CSRF prefetch before registration logs the warning `auth.csrf_prefetch.failed` instead of a free-text message, as `docs/convention/errors.md` requires (#218)
- Settings: `SettingsPage` splits into the markup and the `useGameSettings` hook. The game mode options and helpers move to `shared/lib/game/gameMode.ts`, which the game page's settings overlay now imports instead of its own copy, and the default start score of 301 is one `DEFAULT_START_SCORE` there. The route game's settings live only in its query cache entry, which takes the optimistic change, the save response, or the rollback on a failed save; the page without a game id reads and writes the pre-create draft. The page behaves as before. The settings query also starts from the game store's game when the one-game settings cache holds another game, where the page used to wait without a request. The game page's settings overlay writes its save response to that cache entry too, so the settings page no longer shows or saves the mode from before that change. A failed save rolls the cache back only while it still holds that save's value, so it no longer overwrites a later save made after the page was left and opened again (#337)
- Game page: `Keyboard` uses `React.memo` instead of `memo` imported bare from `"react"`, as `docs/convention/react.md` requires (#215)
- Routing: an invalid game id (`abc`, `0`, `-5`, `1e3`) on `/start`, `/game`, `/settings`, `/summary` and `/details` answers 404 and shows the not found page, before the loader sends any request. These routes redirected to the tablet game, stayed on the summary with a settings error, or showed "Something went wrong". `ErrorBoundary` shows the not found page for a 404 route error and no longer logs it as `route_error_boundary_crash`. `/details/1e3` and `/details/1.5` were accepted before and are 404 now. ADR 0004 records the new rule (#260)
- API: the Player profile response follows the refreshed backend contract. It carries `registeredAt`, the Registration date, and the stats carry wins, win rate, checkout rate, checkout hits and attempts, the hit distribution, the most hit segment, favorite doubles and the highest finish from darts-backend#149. A response without the new required stats fields fails validation, so this needs the backend with darts-backend#149 deployed (#257)
- Player profile: "Member since" shows the month the player registered, such as "Member since Feb 2026", from `registeredAt` in the timestamp's own offset, without a "Sample data" badge. The line is left out while the profile loads, when it failed to load, and when the player has no valid Registration date (#262)
- Dependencies: `nanostores` is 1.5.5 and `@nanostores/react` is 2.0.1, which needs `nanostores` 1. The lockfile resolves one `nanostores` copy for the app and `@nanostores/react`, and the stores behave as before. `@nanostores/react` 2 runs on Node.js 22, 24 and 26 or later, so local installs on Node.js 25 print `EBADENGINE`. This replaces Dependabot PR #245 (#268)
- Dependencies: `vitest` and `@vitest/coverage-v8` are 5.0.5, on the current Vite 7. The Vitest config needs no change for the Vitest 5 migration guide, and coverage reports the same files with the same thresholds. Vitest 5 turns `clearMocks` on by default, so each test starts with empty mock call history; no test relied on calls from an earlier test. This replaces Dependabot PRs #297 and #298, which moved one package each and broke the exact peer between them (#290)
- Dependencies: `vite` is 8.3.5 and `@vitejs/plugin-react` is 6.1.2, which needs Vite 8. Vite 8 builds with Rolldown and Oxc and needs no config change. Lazy pages get chunks named after the page, `clientLogger` moves into its own chunk instead of warning about its mixed imports, and the first load is the same 343 kB of JavaScript spread over six files. Total JavaScript drops from 245.5 kB to 242.5 kB gzipped. The default build target rises to Chrome and Edge 111, Firefox 114 and Safari 16.4, so browsers older than that are no longer a build target. This replaces Dependabot PRs #296 and #299, which moved one package each (#291)
- Dependencies: `react` and `react-dom` are 19.3.1, `@types/react` and `@types/react-dom` are 19.3.0, and `npm ci` resolves without `--legacy-peer-deps`. The app behaves as before. `PaginationContent` and `PaginationItem` take `ref` as a normal prop instead of through `forwardRef`, and code and tests use `React.JSX` instead of the global `JSX` namespace, which `@types/react` 19 removes. Dependabot offers React majors again (#293)
- Dependencies: `typescript` is 6.0.3. TypeScript 6 deprecates `baseUrl`, so `tsconfig.json` drops it; the `@/` path aliases resolve as before because every `paths` entry starts with `./`. `typescript-eslint` 8.72.0 accepts TypeScript below 6.1, so the `"6.0"` pin stays. This replaces Dependabot PR #306, which failed `npm run typecheck` (#309)
- Not found page: a dart stuck in a cracked floor in front of a large "404", the heading "Page not found", the line "This page seems to have missed the target." and one "Back to start" link. The "Go to login" link is gone. The illustration is a 96 kB WebP. The page fits a 375 px phone and a 1024x768 tablet with "Back to start" in view and no horizontal scroll (#260)
- Player profile: Won, Checkout rate, Hit distribution, Favorite doubles, Highest finish and Most hit segment show the player's real statistics from `GET /api/player/profile` instead of sample values, and the "Sample data" badges and the "Consistent finisher" subtitle are gone. Rates show as whole percentages, a missing rate as "–", and each empty block shows one line, such as "No finish yet". Bull and Bullseye hits share the board's centre spot (#263)
- Agent rules: `.github/copilot-instructions.md` points to `AGENTS.md` instead of carrying its own outdated rules, so Copilot and CodeRabbit read one rule set (#265)
- Lint: ESLint runs the full `eslint-plugin-react-hooks` 7 `recommended` preset. Only `SettingsPage` (#213) and `useGamePlayersState` (#123) are exempt from `react-hooks/set-state-in-effect`. `SettingsOverlay`, `LoginForm`, `useEventSource`, `ViewToogleBtn` and `NavigationBar` no longer set state synchronously in an effect. `useEventSource` reports a new url as disconnected from its first render, and the login status region gets its text one frame after it mounts (#247)

- CI: Dependabot npm updates skip `eslint` and `@eslint/js` majors until `eslint-plugin-jsx-a11y` and `eslint-plugin-react` accept ESLint 10 as a peer. Minor and patch updates still arrive in the `npm-minor-patch` group. This replaces Dependabot PRs #244 and #249, which failed `npm ci` with `ERESOLVE` (#267)
- CI: Dependabot npm updates skip `react`, `react-dom`, `@types/react` and `@types/react-dom` majors until the React 19 migration in #293. Dependabot PR #285 moved only `react` and `@types/react` to 19 and failed `npm ci` with `ERESOLVE` (#294)
- CI: Dependabot npm updates skip `typescript` 7 and later until a `typescript-eslint` release accepts TypeScript 7; 8.72.0 accepts `>=4.8.4 <6.1.0`. Dependabot may offer TypeScript 6 instead. This replaces Dependabot PR #300, which failed `npm ci` with `ERESOLVE` (#302)
- CI: Dependabot npm updates skip `@types/node` majors, because `@types/node` follows the Node.js major in `.nvmrc` and a Node.js major is done by hand. Minor and patch updates still arrive in the `npm-minor-patch` group (#240)
- CI: the `e2e` job and the `E2E live` workflow run in the `mcr.microsoft.com/playwright:v1.64.1-noble` image, which ships Chromium and its system libraries. They no longer install those through apt, which hung for more than 8 minutes on a slow Ubuntu mirror (#275)
- Game page: `useGameSession` now loads the game on screen and is the only code that writes its store. It replaces `useGameState`, `useThrowHandler`, `useThrowQueue`, `useUndoFlow` and `useThrowReconciliation`. The throw queue follows ADR 0003, which is now accepted. Up to 6 throws may wait for the server. Each Undo tap steps the scoreboard back at once: an unsent throw leaves the queue without a request, and a sent one gets an undo request in the same queue. A rejected request drops the queue and reloads the game, so the next player's unconfirmed throws roll back as well. A status line above the keyboard shows "Syncing throws…" and "Your last throws were not saved." (#123)
- Game page: the settings button is disabled once the game has a throw, misses, busts and throws still on their way to the server included, and while the server has not answered an undo. Undoing every throw enables it again. `GAME_OUT_RULE_CHANGE_NOT_ALLOWED` and `GAME_CONFLICTING_OUT_RULES` from darts-backend#159 show a readable message instead of the raw code, and `docs/backend-api-contract.json` carries both (#321)
- Summary: Undo no longer writes the game store. It undoes the throw on the server and the game page loads the reopened game, so only `useGameSession` writes the game on screen (#123)
- Docs: the README trees list every folder in `src/` and `src/shared/` (`test/`, `query/`, `services/`), `soundPlayer` sits under `services/`, a short note names the local Compose stack, and a "Further reading" section links the conventions, ADRs, test plans, `GLOSSARY.md`, `SECURITY.md` and `AGENTS.md`. `.env.example` documents the optional `VITE_API_BASE_URL` (#356)
- Docs: the test plans moved from `specs/` to `docs/test-plans/`, with a README on how they relate to `tests/`; the `// spec:` comment of each Playwright spec points there. The finished player profile feature docs moved to `docs/archive/player-profile-login-success/`, and Vitest drops the `specs/**` exclude that no longer matches anything (#359)
- Docs: ADR 0005 records why the app is pages-based instead of Feature-Sliced Design or MVC. The README architecture section shrinks to one paragraph that links to `docs/convention/architecture.md` (#384)

### Removed

- Config: the unused `@/types/*` path alias in `tsconfig.json`; shared types are imported through the `@/types` barrel (#360)

### Fixed

- Deploy: Caddy sends `Content-Security-Policy` (`default-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'`), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff` and `Referrer-Policy: strict-origin-when-cross-origin` on every response: the frontend files, `/api` and the lobby stream. Another site can no longer load the app in an iframe and trick a tap on the tablet. The headers replace any value the backend sends, so each appears once. The release archive does not ship the `Caddyfile`; install it on the VM as `deploy/README.md` describes. The README now recreates the proxy after a `Caddyfile` change, because the running container keeps the old file (#227)
- Statistics: alphabetical mode requests `sort=name:asc` and shows rows in the server's order, so page 2 continues the A–Z list where page 1 ended. Before, the page fetched the players with the best average and sorted only that page by name. Needs darts-backend#166 deployed (#342)
- API: the game start response is validated against the contract as `GameResponseDto`, after darts-backend#46. A start or rematch start answer that is not a game state now fails with a validation error instead of passing unchecked (#206)
- Lobby: when the room stream closes, the start page revalidates its route. A game that was started or aborted elsewhere now leaves the start page instead of the stream reconnecting every 30 s, and a game still in the lobby stays and keeps reconnecting. `useEventSource` gains an optional `onClosed` callback for an `error` that leaves the source closed (#206)
- Lobby: a stale lobby tab that removes a player, adds a guest or reorders players after the game started shows "This game has already started. The lobby can no longer be changed." instead of the raw code `GAME_SEATS_NOT_EDITABLE`, then reloads the route so the tab ends on the game page. Adding a guest to a full lobby shows "The lobby is full. Remove a player to add another." instead of the generic guest error (#327)
- Settings: while a game's settings save is pending, both the Game Mode and the Points buttons are disabled. Before, the other group looked enabled but ignored the click (#338)

- Statistics: every screen shows the backend three-dart average with two decimals under the label `Ø AVG` (podium, leaderboard, Statistics, Profile stats card and history, scoring trend chart), with the accessible name "three-dart average". The per-round fallback from the start score is gone, and the summary page no longer requests the game settings it only read for it, so a failed settings request cannot replace the summary with an error. Podium and leaderboard show `-` for a player with no rounds, including the podium placeholder (#333)
- Game: standings and the podium use placement for rank, while position stays the turn order. Optimistic checkout assigns placement, scoreboard updates preserve it, and undo clears placements only for players whose scores are above zero, keeping a winner who has not been undone (#330)

- Game page: leaving the page while End Game is still running no longer starts a rematch or opens its lobby. If the abort request finishes after you left, the page sends no rematch request and does not navigate, and returning to that game lets you end it again (#331)
- Game page: a second "Yes" on the End Game overlay no longer starts a second exit. The first tap locks the exit at once and the Yes button is disabled while it runs, so the page sends one abort and one rematch request instead of two, and no longer shows the backend's 409 `GAME_NOT_NEWEST` as an error beside the new lobby. A failed exit releases the lock, so Yes works again; after a successful exit or a finished game's summary the lock stays until the page leaves (#106)
- Game page: Undo after a completed turn takes back the latest turn. When a player had checked out and was skipped, it took back that player's old turn, moved the game to the earlier round and wrote the wrong throw history into the confirmed game. Undo now passes over players whose last turn is not from the current round, or from the previous round for later seats. When no turn can be identified, the page reloads the game instead of guessing (#104)
- Game page: leaving a game that finished while the exit overlay was open opens its summary. Before, the backend answered 409 `GAME_ABORT_NOT_ALLOWED` and the page stayed on the game with an error. The page reads the game again to tell a finished game from a lobby; a lobby, or a failed read, keeps the error. The backend contract lists the new 409 responses of abort, finish and undo (#325)
- Game page: Undo is enabled after a miss or a bust that leaves every score at the start score. It was disabled while all scores equalled the start score, so the throw could not be taken back; it is now disabled only when no player has a throw, and a queued throw that is not yet saved counts (#103)
- Game page: the optimistic throw treats a remaining score of 1 in double-out, and 1 or 2 in triple-out, as a bust. The score returns to its value at the start of the turn and the turn passes to the next player, as the backend already did. Before, the board showed the reduced score and kept the player active until the server response arrived (#102)
- Game page: a throw or undo response that arrives after the tablet left the game, or opened another one, no longer changes the scoreboard on screen (#95)
- Game page: after a failed sync the page reloads the game and shows "Your last throws were not saved." If the reload fails too, throw and undo input stay disabled until Retry reloads the game. When the first load fails while the store still shows the game from an earlier page, the page shows "Could not load the game." with the same Retry instead of a scoreboard with dead input, and a load that works shows no notice (#98)
- Game page: a full throw queue disables throw input and shows "Syncing throws…" instead of dropping taps without a word (#105)
- Game page: the server finishes the game inside the winning throw request, and the summary opens once that throw's ack says the game is finished and every throw is saved. Throw input closes with the winning throw, so no tap for the other player reaches the server before the ack. A rejected winning throw rolls the scoreboard back and finishes nothing. `useAutoFinishGame` is gone, and the client sends no request of its own to finish the game (#96)
- Summary: Undo, Play Again and Back To Start share one lock. While one runs, all three buttons are disabled and a second tap sends no request. The lock stays taken after a success and after a "This game can no longer be changed." error, while the page moves away, and any other failure releases it (#100)
- Node.js: build, CI, the dev container and the deploy image run Node.js 24.22.1, the October 2026 security release (CVE-2026-111497, CVE-2026-106069, CVE-2026-105482, CVE-2026-105483 and others). Node.js 20 is end of life and gets no fix. Every GitHub workflow reads the version from `.nvmrc`, and `@types/node` follows to `^24` (#271, #233)
- Dependencies: `vitest` and `@vitest/coverage-v8` are 4.1.12, and both ranges start at 4.1.12. The lockfile no longer resolves `@vitest/mocker` 4.1.11, which Dependabot alert #4 flags for GHSA-xp26-3454-mjgp (#277)
- Dependencies: `lint-staged` is 17.6.0, which no longer pulls `micromatch` and `braces` (GHSA-vfj7-8cjw-p6xm), so `npm audit` drops from 8 to 7 high findings. The rest come through `stylelint`, which has no fixed release yet. `@commitlint/config-conventional` is 21.2.4 to match `@commitlint/cli` 21, with the same rules. `@dnd-kit/core` starts at 6.3.0, the peer that `@dnd-kit/modifiers` 9 needs (#287)

## [0.1.4] - 2026-10-22

### Added

- CI: Dependabot opens weekly update PRs for npm, GitHub Actions and the Docker base images. npm minor and patch updates come as one PR, Actions updates as one PR. The `node` image gets no major bumps and `nginx` stays on 1.28 (#230)
- Agent rules: `AGENTS.md` has a `## Review guidelines` section with severities P0 to P2 and the checks no tool runs. The new `SECURITY.md` explains how to report a vulnerability privately and holds the threat model for security reviews (#226)
- ADR: `docs/adr/0003-optimistic-throw-queue.md` records the optimistic throw queue on the game page (#123)
- ADR: `docs/adr/0004-tablet-game-from-server.md` records that the admin routes read the tablet game from the server and never from a URL (#203)
- Player profile: the page reads `GET /api/player/profile` and shows a stats card next to the tabs Overview, Performance and History; the tab lives in `?tab=`. Games played and Avg. points come from the API, the Scoring trend plots each recent game's round average, and History lists the 10 newest finished games with placement, average and all participants. Blocks the API does not carry yet show sample values with a "Sample data" badge. Overview shows a dartboard heatmap, favorite doubles, highest finish, the scoring trend and the most hit segment; their blocks drop to one column when the panel is narrower than 640px. The range buttons of the hit distribution and the scoring trend open a menu with the one range the API serves. The page is in English and stacks to one column at 600px (#198)
- Tooling: `npm run test:red-on-base` runs the tests a branch changed against the base ref's code and lists the ones that fail (#185)
- Login: the login page shows a full-screen spinner with "Checking your login…" while it checks for a Remembered login, and the form only when nobody is logged in or the check gets no answer within 5 seconds. A remembered player who scans an invite goes straight to the Waiting room. When the backend cannot join the invitation, the player sees why ("This game has already started", "This game is full", "This game no longer exists" or "This game can no longer be joined") and a button to their profile. The check also runs while the browser counts as offline, so its timeout still brings up the form. After the button, the login page no longer shows that error again (#151)
- Waiting room and player profile: a "Log out" button ends the Remembered login on this phone and opens the login page. The button stays disabled while the request runs. On success the app clears the query cache, the room store with its stored game id, and the game store, the same cleanup a 401 runs. On failure the page stays as it was and shows an error with a "Retry" button (#154)
- Waiting room: the page asks `GET /api/player/current-game` every 3 seconds. When the admin starts the game, the spinner turns into a green check mark with "The game has started" and "Follow your score on the tablet", and polling stops. A removed player sees "You are no longer in this game" with a button to their profile. After 3 failed requests in a row, including while the phone is offline, the page shows "Connection lost. Trying again…" in red until the next answer. A player without a current game goes to their profile (#153)

- Auth: the registration form says the password needs at least 8 characters and does not send a shorter one. A short password the backend rejects shows "Password must be at least 8 characters." A 429 from login shows "Too many login attempts" with the wait from `Retry-After`, rounded up to seconds or minutes. A 429 from registration says to try again later. `ApiError` carries `retryAfterSeconds` for a 429 (#190)
- Registration: when the backend answers 409 `REGISTRATION_ACCOUNT_EXISTS`, the form shows "Email or username is already taken." instead of the generic error. The text names neither field, because the backend hides which one clashed (#171)
- Registration: a new player is taken over like a login. The app stores the joined `gameId`, goes to the Waiting room while "Joining the game…" shows, and shows the same invitation error text with a button to the profile when the backend cannot join the invitation. The "Create account" button is disabled and shows a spinner while the request runs (#152)

### Changed

- Deploy: releases build `darts-backend` at `0981bf4`. The backend runs PHP 8.4.27, which fixes CVE-2026-109618 and CVE-2026-109619, turns off session upload progress and rejects multipart requests with 415 (IliasAlmerekov/darts-backend#146). The pin also brings the player profile and tablet game endpoints, the `@db-n.com` registration rule, the 6-character password minimum, the newest-game rule for undo, reopen and rematch, and four migrations, among them the `registeredAt` column
- Registration: the email field says "Use your @db-n.com email address." and its placeholder is `name@db-n.com`, the same placeholder as on the login form. When the backend rejects an address on another domain (darts-backend#129), the form shows "Only @db-n.com email addresses can register." instead of "Please enter a valid email address." The form still sends any address; the backend alone checks the domain. `docs/backend-api-contract.json` documents the rule on `RegistrationRequest.email` (#254)
- Backend contract: `docs/backend-api-contract.json` is refreshed again. `POST /api/room/create` documents 404 `PLAYER_NOT_FOUND` for an unknown player id and 409 `GAME_ROOM_FULL` when a new lobby would seat more than 10 players, and no longer validates the ignored `previousGameId`. The dump also carries the `@db-n.com` registration rule from darts-backend#144 in its descriptions (IliasAlmerekov/darts-backend#133)
- Backend contract: `docs/backend-api-contract.json` is refreshed. It marks `previousGameId` in `POST /api/room/create` as deprecated and ignored, documents `GET /api/tablet/game` and the 409 `GAME_NOT_NEWEST` answers of undo, reopen and rematch (IliasAlmerekov/darts-backend#133)
- Registration: the password needs at least 6 characters instead of 8, the same minimum as darts-backend since darts-backend#130. The hint reads "At least 6 characters." and a short password the backend rejects shows "Password must be at least 6 characters." `docs/backend-api-contract.json` is a fresh dump of darts-backend `main` (#250)
- Docs: `docs/convention/architecture.md` and the README name React Router 7, the version since the `react-router-dom` 7.18.4 update (#155)
- Dependencies: knip is 6.41.0. It reports an exported type that no file imports, even when another export uses it, so `ThrowDisplayValue`, `HttpMethod`, `QueryValue`, `ProfileHistoryRow` and `Round` are no longer exported (#243)
- Dependencies: `eslint-plugin-react-hooks` is 7.1.1. ESLint runs its `rules-of-hooks` and `exhaustive-deps` rules, as with version 5. The React Compiler rules that version 7 adds to `recommended` stay off until #241 (#238)
- Dependencies: Prettier is 3.9.10, which writes a union type that fits after `=` on one line. The file table in `docs/player-profile-login-success/research/research.md` escapes the `|` in `AuthenticatedUser \| null`, so it has two columns again (#235)
- Dependencies: `react-router-dom` is 7.18.4. The v7 future flags and the test shim that set them are gone, `ErrorBoundary.test.tsx` throws `data()` instead of the removed `json()`, and loader tests build their arguments with `makeLoaderArgs()` from `src/test/loaderArgs.ts` (#231)
- API: `docs/backend-api-contract.json` is a fresh, unformatted dump of darts-backend `main`, and Prettier skips it. The game, throw ack and undo ack schemas read `type` from the payload, with the contract default when it is missing, instead of adding it on the client. The rematch and login schemas drop the body `status` the contract no longer documents, so a rematch without a game id fails with status 200 (#209)
- Agent rules: `AGENTS.md` sizes each task before the first edit. A small task goes straight to a branch, one failing test and the change; a large one goes through `/grill-with-docs`, a plan of subtasks with acceptance criteria, the `tdd` skill per subtask and `code-review` against `main`. `code-review` reads the scope rules as a repo standard, and the no-agent-attribution rule outranks the `triage` disclaimer (#219)
- Docs: the convention files match the code again. `api.md` describes the TanStack Query layer in `src/shared/query/`, false claims about store symbols, the store barrel, Playwright paths and breakpoints are fixed, advice that is not specific to this project is cut, and the verification commands that used `rg -nP` now run with the installed ripgrep. `AGENTS.md` carries the table of which convention file to read for which change (#211)
- Agent rules: branches live in the main checkout, without worktrees. `AGENTS.md` names the backend checkout in `../dartsapp-backend`, documents how to refresh `docs/backend-api-contract.json`, a fast test loop and a scope rule, and drops the Tickets section. A domain without a convention file follows the neighbouring code, and the agent asks only when there is no precedent (#208)
- Agent rules: each issue gets its own branch, cut from the latest `main` after a pull. Once the PR is open, the agent removes its worktree and scratch files and keeps only the branch. The rematch invite fallback test now mocks the invite response without a body `status`, as the backend sends it (#162)
- Waiting room: the page reads its game from the server instead of session storage, so a reload keeps working. It no longer subscribes to the admin-only room stream (#153)
- Deploy: releases build `darts-backend` at `57c1908`, which adds `GET /api/player/current-game` for the Waiting room. The pin also brings registration that logs in and joins the invited room, the 7-day Remembered login and Symfony 8.1 (#153)
- API: each response is checked once by a Valibot schema, and its type is inferred from that schema. The hand-written response guards and interfaces are gone, and ADR 0002 records the choice (#158)
- API: game start and rematch start send the settings as `startScore`, `doubleOut` and `tripleOut`, the same camelCase keys as every other request. The backend accepts them since darts-backend#97 (#161)
- Login and registration: the prompt under the submit button is one line of grey text with a bold blue "Sign up" or "Sign in" link. The full-width outline button is gone (#187)
- Login: a form login reads the user, `redirect`, `gameId` and `invitationError` from the `POST /api/login` response, stores `gameId` as the current game, and redirects the same way as the login check. A player with an old stored game id is no longer sent to the host start page (#151)
- Tooling: `compose.dev.yaml` uses the Compose project name `darts`, the same as the workspace stack, so `docker compose` run in this repo reaches the running containers instead of starting a second project (#187)

### Removed

- Start page: creating a room no longer sends `previousGameId`, which the backend ignores since IliasAlmerekov/darts-backend#133. The `$lastFinishedGameId` store that fed it is gone (#252)
- Auth: the optional `profile` field of the login response and the profile envelope of the auth check, which the backend never sends (#198)
- Docs: `docs/convention/coding-standards.md` and `docs/repo-map.md` are gone. The first repeated `AGENTS.md` apart from its table, which moved there, and the second restated the directory tree and had fallen behind it (#211)
- Docs: `CONTRIBUTING.md` is gone. The README now carries the setup steps, and the rest already lived in `AGENTS.md` and `docs/convention/` (#208)
- Game page: the page no longer opens the room stream. The backend never sent the `game-started` or `game-finished` events it waited for, and the tablet gets the scoreboard from its own throw and undo responses. Only the start page subscribes to the room stream now, for its `players` events. `useRoomStream`, `useRoomEventRefetch` and the `RoomStreamEventType` and `RoomStreamEvent` types are gone (#165)

### Fixed

- Routing: `/start`, `/game` and `/settings` follow the tablet game that `GET /api/tablet/game` reports. A game id in the URL never changes it; a route that shows another game or an invalid id such as `-5` or `1e3` redirects to the tablet game and replaces the history entry. The Game and Settings links point to the tablet game, so a visit to `/settings/<finished game id>` no longer traps the start page in a redirect loop. While the read runs, the page shows a skeleton; when it fails, an error with Retry (#203)
- Summary: `/summary/<id>` shows only the last finished game that `GET /api/tablet/game` reports; any other game moves to `/details/<id>` without Undo and Rematch. When Undo, Play Again or Back To Start gets 409 `GAME_NOT_NEWEST`, the page shows "This game can no longer be changed.", disables its actions and moves to the tablet game 2 seconds later. A successful Undo, rematch or room create makes the next route read the tablet game again (#225)
- Summary: when Back To Start fails, for example with 409 `GAME_NOT_NEWEST` on an older summary, the open room's game id and invitation stay in the store. The page now clears them only after the rematch succeeds (#252)
- Summary: reloading `/summary/<id>` or opening it in a new tab shows the podium and leaderboard instead of "start score is missing". The page reads the start score through `GET /api/game/{id}/settings` and its loader prefetches it. Coming from the game page sends no extra request. A failed settings read shows an error with Retry (#229)
- Buttons: the red Log out, Cancel (game exit) and mobile Start buttons show white text at 4.9:1 contrast instead of 3.84:1 (#198)
- Auth: a player who opens a route their role may not use, such as the start page, goes to the Player profile instead of the Waiting room (#199)
- Settings: when the first settings read for a game fails, the page shows "Could not load settings" with a "Retry" button instead of leaving every option disabled with no message. The options stay disabled and unselected until a retry loads the game's saved values (#108)
- Settings: a save that answers after the route moved to another game's settings no longer changes that game's screen. It stays out of the selected button, the rollback and the error message. A pending save of one game no longer blocks the buttons of the next (#99)
- Registration: on phones the form has the same width and side spacing as the login form (#187)
- Auth: logout no longer follows the backend's 302, which points at the backend origin and failed CORS after the cookies were already deleted. `apiClient` treats an opaque redirect as success when the caller sets `redirect: "manual"` (#154)
- API: the request timeout covers reading the response body, so a body that stalls after the headers rejects with `TimeoutError` instead of hanging. An external abort while the body streams rejects with `AbortError`, and the client removes its listener from the caller's signal once the request settles (#109)
- API: throw and undo acks may omit the optional `position`, `isBust`, `winnerId` and `throw` keys, as the contract allows. A missing `winnerId` or `throw` becomes `null`, and a player whose delta omits `position` keeps their position. The start response goes unvalidated until darts-backend#46 is fixed (#121)

## [0.1.3] - 2026-10-14

### Added

- Tooling: ESLint fails when a page component or `use*` hook imports a DTO mapper, so mapping stays in a page `lib/` file (#176)
- Login: Sign up is a full-width outlined button below Sign in, and "Don't have an account?" is blue (#150)
- Registration: Sign in is a full-width outlined button below Create account, and "Already have an account?" is blue (#150)
- Navigation: the main navigation is a `<nav>` landmark and marks the current page with `aria-current` (#120)
- Tooling: `knip` runs in `validate:push` and CI, so unused code fails the build (#117)
- Tests: `npm run test:e2e:live` runs the Playwright suite against a real backend, on demand in CI (#116)
- Tooling: a Vite dev server compose file, `compose.dev.yaml`
- CI: the build fails on high-severity production advisories (#115)

### Changed

- Lobby: the invitation link and the Copy Invite Link button are hidden at 1020px wide and below, so tablets show only the QR code (#178)
- Data: game detail, games overview, game settings and the lobby player list are TanStack Query reads, so a late response updates only its own key. Game detail reuses the finished game the summary page cached, games overview retries without a route reload, and the lobby player list no longer fetches what the start page loader already read (#169)
- Docs: the glossary defines _lobby_ (#169)
- Data: the auth check and player statistics are TanStack Query reads, so a late response updates only its own key. Statistics load only after login, and logout and the 401 handler clear the query cache (#157)
- Data: the game summary reads the finished game from the `['finishedGame', id]` query through a route loader, so game A's standings can no longer show on game B. Undo and rematch remove the entry (#168, #107)
- Tests: `npm run test:e2e` is a mocked suite that fails any spec with an unmocked `/api` request (#116)
- Game pages: the summary and detail pages build podium and leaderboard with one shared mapper, `buildFinishedGameStandings` (#113)
- Docs: ADR 0001 records that server reads go through TanStack Query, and the glossary defines _current game_ (#157)
- Docs: commits follow Conventional Commits and every PR body follows one template (#129)
- Docs: contribution docs match the repo, and generated Playwright reports are no longer tracked (#118)
- Tooling: Playwright tests are typechecked and linted
- Dependencies: `react-router-dom` is 6.30.6, and non-breaking audit fixes are applied to dev tooling (#115)
- Release: tags are `v`-prefixed, such as `v0.1.3`, and each tag's GitHub release shows its `CHANGELOG.md` section
- Deploy: releases build `darts-backend` at `ae475cd`, which adds admin-only API access, the invitation login payload and camelCase game settings

### Removed

- Auth: the Nanostores auth store (`$user`, `$authChecked`, `$authError`) is gone; the query cache owns the authenticated user (#157)
- Game summary: `$lastFinishedGameSummary`, `$lastFinishedGameId` and the `summary` field in navigation state are gone (#168)
- Login: the Remember me checkbox, which never changed the login request (#150, #111)
- Code: unused styles, unused exports, the `react-error-boundary` dependency and the `clientLogger` re-export (#117)

### Fixed

- Statistics: the player statistics prefetch runs only for admins, and the Statistics page reuses the prefetched first page for 30 seconds (#110)
- Accessibility: login and registration error and success banners are announced to screen readers (#112)
- Invitations: when copying the link fails, a selectable link is shown (#119)
- Tooling: the stylelint glob no longer breaks on shell expansion (#114)
- Security: login and registration redirects reject backslashes (#115)

## [0.3.0] - 2026-02-03

### Changed

- Authentication: Changed login to use email instead of username across all login-related components and hooks
- API: Added CSRF token support for authentication and registration to enhance security
- API: Added ForbiddenError class for better handling of 403 Forbidden responses
- API: Separated FINISH_GAME and FINISHED_GAME endpoints for clearer distinction between finishing a game and retrieving finished game data
- Game Logic: Fixed useFinishGame hook to properly call the finish game API endpoint
- Error Handling: Improved error message display in Game component to show actual error messages instead of generic text

### Added

- API: Added getCsrfTokens and getCsrfToken functions for managing CSRF tokens
- API: Added finishGame function to properly finish games via POST request

### Fixed

- AuthenticatedUser interface: Made email and username fields optional to handle different response formats

## [0.2.0] - 17.12.2025

### Changed

- Shifted core game/auth logic from the client to backend endpoints; frontend now focuses on UI and orchestration
- Adopted Feature-Sliced Design (FSD) for clearer feature boundaries and maintainable module ownership
- Stylelint ignores build artifacts (`dist/`, `coverage/`, `node_modules/`) to keep CI focused on source styles

### Removed

- Deprecated `UserProvider`; session handling now relies on backend-driven auth

## [0.1.1] - 11.04.2025

### Fixed

- 'Summary': fixed the infinity of the average score on the game summary page
- 'Summary': fixed an error when clicking the undo buton and re-ending the game by double saving the game to localStorage
- 'Summary': fixed an error where players disappeared when the page was reloaded
- 'Summary': fixed a bug where the average score was false
- 'Game': fixed the display error for double and triple [D10] or [T20]
- 'Game': fixed the border-left for the active player

### Changed

- 'GamePlayerItem': changed types in GamePlayerItem to number | string | JSX.Element
- 'BASIC': changed types for throw to number | string | undefined
- 'Settings button': changed to SettingsGroupBtn to use in other components

### Chore

- General `refactoring` and cleanup across multiple components

## [0.3.1] - 2026-02-03

### Changed

- API: Refactored API structure to follow bulletproof-react patterns by moving endpoints from centralized config.ts to feature-specific API files (auth, game, room, statistics)
- API: Simplified client.ts by consolidating helper functions, removing unnecessary abstractions, and embedding API_BASE_URL directly
- API: Ensured all API calls import from their respective feature API files for better encapsulation and maintainability

## [0.1.0] - 10.04.2025

### Added

- 'Gamemode': initial 'Game.tsx' feature added
- 'Settings' page implemented
- 'Navigation' component created
- 'Player Management': create, list, save to localStorage
- 'Game Overview': show completed games and basic stats
- 'Podium': display top 3 players with average results

### Changed

- All class names converted to `kebab-case`
- Removed unnecessary `any` types
- Centralized state with `useReducer`
- Improved structure of `UserProvider`

### Fixed

- Fixed `localStorage` bug that prevented saving finished games
- localStorage key typo that caused save errors on reload

### Chore

- Setup: `husky`, `commitlint`, `knip`, and initial changelog
- Setup: integrated `stylelint-prettier` config
- General `refactoring` and cleanup across multiple components

### Internal

- Added Prettier and Stylelint with autoformat on commit
- Vatious small merge commits and branch syns
