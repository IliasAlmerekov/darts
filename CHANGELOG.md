# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0),
and this project does **not** yet follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html), but will adopt it in the future.

## [Unreleased]

### Added

- Tooling: `npm run test:red-on-base` runs the tests a branch changed against the base ref's code and lists the ones that fail (#185)
- Login: the login page shows a full-screen spinner with "Checking your login…" while it checks for a Remembered login, and the form only when nobody is logged in or the check gets no answer within 5 seconds. A remembered player who scans an invite goes straight to the Waiting room. When the backend cannot join the invitation, the player sees why ("This game has already started", "This game is full", "This game no longer exists" or "This game can no longer be joined") and a button to their profile. The check also runs while the browser counts as offline, so its timeout still brings up the form. After the button, the login page no longer shows that error again (#151)
- Waiting room and player profile: a "Log out" button ends the Remembered login on this phone and opens the login page. The button stays disabled while the request runs. On success the app clears the query cache, the room store with its stored game id, and the game store, the same cleanup a 401 runs. On failure the page stays as it was and shows an error with a "Retry" button (#154)
- Waiting room: the page asks `GET /api/player/current-game` every 3 seconds. When the admin starts the game, the spinner turns into a green check mark with "The game has started" and "Follow your score on the tablet", and polling stops. A removed player sees "You are no longer in this game" with a button to their profile. After 3 failed requests in a row, including while the phone is offline, the page shows "Connection lost. Trying again…" in red until the next answer. A player without a current game goes to their profile (#153)

- Auth: the registration form says the password needs at least 8 characters and does not send a shorter one. A short password the backend rejects shows "Password must be at least 8 characters." A 429 from login shows "Too many login attempts" with the wait from `Retry-After`, rounded up to seconds or minutes. A 429 from registration says to try again later. `ApiError` carries `retryAfterSeconds` for a 429 (#190)
- Registration: when the backend answers 409 `REGISTRATION_ACCOUNT_EXISTS`, the form shows "Email or username is already taken." instead of the generic error. The text names neither field, because the backend hides which one clashed (#171)
- Registration: a new player is taken over like a login. The app stores the joined `gameId`, goes to the Waiting room while "Joining the game…" shows, and shows the same invitation error text with a button to the profile when the backend cannot join the invitation. The "Create account" button is disabled and shows a spinner while the request runs (#152)

### Changed

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

- Docs: `docs/convention/coding-standards.md` and `docs/repo-map.md` are gone. The first repeated `AGENTS.md` apart from its table, which moved there, and the second restated the directory tree and had fallen behind it (#211)
- Docs: `CONTRIBUTING.md` is gone. The README now carries the setup steps, and the rest already lived in `AGENTS.md` and `docs/convention/` (#208)
- Game page: the page no longer opens the room stream. The backend never sent the `game-started` or `game-finished` events it waited for, and the tablet gets the scoreboard from its own throw and undo responses. Only the start page subscribes to the room stream now, for its `players` events. `useRoomStream`, `useRoomEventRefetch` and the `RoomStreamEventType` and `RoomStreamEvent` types are gone (#165)

### Fixed

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
