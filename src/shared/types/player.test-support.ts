import type { PlayerProfileGame, PlayerProfileResponse } from "@/shared/api/player";
import type { UserProps } from "./player";

type PlayerProfileStats = PlayerProfileResponse["stats"];

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

const SEGMENTS = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "11",
  "12",
  "13",
  "14",
  "15",
  "16",
  "17",
  "18",
  "19",
  "20",
  "BULL",
  "BULLSEYE",
] as const;

/** Stats of `GET /api/player/profile` for 18 counted games, 20 the most hit segment. */
export function buildPlayerProfileStats(
  overrides: Partial<PlayerProfileStats> = {},
): PlayerProfileStats {
  return {
    gamesPlayed: 18,
    scoreAverage: 56.4,
    wins: 7,
    winRate: 38.9,
    checkoutRate: 31.8,
    checkoutHits: 7,
    checkoutAttempts: 22,
    hitDistribution: SEGMENTS.map((segment) => ({ segment, hits: segment === "20" ? 96 : 12 })),
    mostHitSegment: { segment: "20", hits: 96, share: 7.4 },
    favoriteDoubles: [{ double: "D16", hits: 4, attempts: 11, hitRate: 36.4 }],
    highestFinish: { score: 121, darts: 3, throws: ["T20", "S11", "BULLSEYE"] },
    ...overrides,
  };
}

export function buildPlayerProfile(
  overrides: Partial<PlayerProfileResponse> = {},
): PlayerProfileResponse {
  return {
    stats: buildPlayerProfileStats(),
    recentGames: [buildPlayerProfileGame()],
    ...overrides,
  };
}
