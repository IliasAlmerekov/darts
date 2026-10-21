import type { PlayerProfileGame, PlayerProfileResponse } from "@/shared/api/player";
import type { UserProps } from "./player";

export function buildUserProps(overrides: Partial<UserProps> = {}): UserProps {
  return {
    id: 1,
    name: "Player",
    ...overrides,
  };
}

/** One finished game of `GET /api/player/profile`: Anna won, the player came second. */
export function buildPlayerProfileGame(
  overrides: Partial<PlayerProfileGame> = {},
): PlayerProfileGame {
  return {
    gameId: 31,
    finishedAt: "2026-10-20T18:42:00+00:00",
    placement: 2,
    roundAverage: 45.25,
    participantsCount: 2,
    participants: [
      { playerId: 7, displayName: "Anna", placement: 1, isSelf: false },
      { playerId: 42, displayName: "Alice", placement: 2, isSelf: true },
    ],
    ...overrides,
  };
}

export function buildPlayerProfile(
  overrides: Partial<PlayerProfileResponse> = {},
): PlayerProfileResponse {
  return {
    stats: { gamesPlayed: 18, scoreAverage: 56.4 },
    recentGames: [buildPlayerProfileGame()],
    ...overrides,
  };
}
