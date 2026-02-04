# Backend API

This document describes the backend endpoints used by the frontend. It is derived from current frontend API clients.

## Base URL

All API requests go through the API client with base URL:

- `/api`

## Auth

- `GET /api/csrf` — fetch CSRF tokens. See response type in `src/features/auth/api/csrf.ts`.
- `POST /api/login` — login using form-urlencoded credentials. See payload in `src/features/auth/api/login.ts`.
- `POST /api/logout` — logout current user. See `src/features/auth/api/logout.ts`.
- `POST /api/register` — register new user. See payload in `src/features/auth/api/register.ts`.
- `GET /api/login/success` — returns current authenticated user. See `src/features/auth/api/get-user.ts`.

## Room

- `POST /api/room/create` — create a new room. See `src/features/room/api/create-room.ts`.
- `GET /api/invite/create/{gameId}` — fetch invitation link. See `src/features/room/api/create-room.ts`.
- `GET /api/room/{gameId}` — fetch room players. See `src/features/room/api/leave-room.ts`.
- `DELETE /api/room/{gameId}?playerId={playerId}` — remove a player or leave room. See `src/features/room/api/leave-room.ts`.
- `POST /api/room/{gameId}/positions` — update player order. See `src/features/room/api/update-player-order.ts`.

## Game

- `GET /api/game/{gameId}` — fetch game state. See `src/features/game/api/get-game.ts`.
- `POST /api/game/{gameId}/throw` — record a throw. See `src/features/game/api/record-throw.ts`.
- `DELETE /api/game/{gameId}/throw` — undo last throw. See `src/features/game/api/undo-throw.ts`.
- `POST /api/game/{gameId}/start` — start game. See `src/features/game/api/start-game.ts`.
- `PATCH /api/game/{gameId}/abort` — abort game. See `src/features/game/api/abort-game.ts`.
- `POST /api/game/{gameId}/finish` — finish game. See `src/features/game/api/finish-game.ts`.
- `GET /api/game/{gameId}/finished` — get finished game results. See `src/features/game/api/finish-game.ts`.
- `POST /api/game/settings` — create game settings. See `src/features/game/api/game-settings.ts`.
- `PATCH /api/game/{gameId}/settings` — update game settings. See `src/features/game/api/game-settings.ts`.
- `POST /api/room/{gameId}/rematch` — create rematch. See `src/features/game/api/rematch.ts`.

## Statistics

- `GET /api/players/stats` — get player stats with pagination and sorting. See `src/features/statistics/api/get-player-stats.ts`.
- `GET /api/games/overview` — get games overview with pagination and sorting. See `src/features/statistics/api/get-games-overview.ts`.

## Streams (SSE)

- `GET /api/room/{gameId}/stream` — server-sent events stream for room updates. See `src/features/room/hooks/useRoomStream.ts` and `src/features/room/hooks/useGamePlayers.ts`.

## Notes

If backend contracts change, update this document and the related API client files.
