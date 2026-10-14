# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0),
and this project does **not** yet follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html), but will adopt it in the future.

## [Unreleased]

### Added

- Login: Sign up is a full-width outlined button below Sign in, and "Don't have an account?" is blue (#150)
- Registration: Sign in is a full-width outlined button below Create account, and "Already have an account?" is blue (#150)
- Navigation: the main navigation is a `<nav>` landmark and marks the current page with `aria-current` (#120)
- Tooling: `knip` runs in `validate:push` and CI, so unused code fails the build (#117)
- Tests: `npm run test:e2e:live` runs the Playwright suite against a real backend, on demand in CI (#116)
- Tooling: a Vite dev server compose file, `compose.dev.yaml`
- CI: the build fails on high-severity production advisories (#115)

### Changed

- Data: the auth check and player statistics are TanStack Query reads, so a late response updates only its own key. Statistics load only after login, and logout and the 401 handler clear the query cache (#157)
- Data: the game summary reads the finished game from the `['finishedGame', id]` query through a route loader, so game A's standings can no longer show on game B. Undo and rematch remove the entry (#168, #107)
- Tests: `npm run test:e2e` is a mocked suite that fails any spec with an unmocked `/api` request (#116)
- Game pages: the summary and detail pages build podium and leaderboard with one shared mapper, `buildFinishedGameStandings` (#113)
- Docs: ADR 0001 records that server reads go through TanStack Query, and the glossary defines _current game_ (#157)
- Docs: commits follow Conventional Commits and every PR body follows one template (#129)
- Docs: contribution docs match the repo, and generated Playwright reports are no longer tracked (#118)
- Tooling: Playwright tests are typechecked and linted
- Dependencies: `react-router-dom` is 6.30.6, and non-breaking audit fixes are applied to dev tooling (#115)

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
