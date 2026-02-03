# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0),
and this project does **not** yet follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html), but will adopt it in the future.

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
