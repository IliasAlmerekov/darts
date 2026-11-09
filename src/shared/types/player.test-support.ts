import type { AuthenticatedUser } from "@/shared/api/auth";
import type {
  PlayerProfileGame,
  PlayerProfileResponse,
  PlayerPublicProfileResponse,
} from "@/shared/api/player";
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

const NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20] as const;
/**
 * The 62 board fields of `hitDistribution` in contract order: `S1`, `D1`, `T1` up to `T20`,
 * then `BULL` and `BULLSEYE`.
 */
export const BOARD_FIELDS = [
  ...NUMBERS.flatMap((number) =>
    (["S", "D", "T"] as const).map((ring) => `${ring}${number}` as const),
  ),
  "BULL" as const,
  "BULLSEYE" as const,
];

/** The 62 board fields with `hits` on the given ones and 0 on every other. */
export function buildHitDistribution(
  hits: Partial<Record<(typeof BOARD_FIELDS)[number], number>> = {},
): PlayerProfileStats["hitDistribution"] {
  return BOARD_FIELDS.map((field) => ({ field, hits: hits[field] ?? 0 }));
}

/**
 * Stats of `GET /api/player/profile` for 18 counted games, T20 the most hit board field.
 * Double out holds 60 of the 96 T20 hits and single out the rest; no game used triple out.
 */
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
    hitDistribution: BOARD_FIELDS.map((field) => ({ field, hits: field === "T20" ? 96 : 12 })),
    hitDistributionByOutRule: {
      singleout: BOARD_FIELDS.map((field) => ({ field, hits: field === "T20" ? 36 : 12 })),
      doubleout: buildHitDistribution({ T20: 60 }),
      tripleout: buildHitDistribution(),
    },
    mostHitSegment: { segment: "20", hits: 96, share: 7.4 },
    favoriteDoubles: [{ double: "D16", hits: 4, attempts: 11, hitRate: 36.4 }],
    highestFinish: { score: 121, darts: 3, throws: ["T20", "S11", "BULLSEYE"] },
    ...overrides,
  };
}

/** Stats of a player without counted games: zero counts, no rates, no hits, no finish. */
export function buildEmptyPlayerProfileStats(): PlayerProfileStats {
  return {
    gamesPlayed: 0,
    scoreAverage: null,
    wins: 0,
    winRate: null,
    checkoutRate: null,
    checkoutHits: 0,
    checkoutAttempts: 0,
    hitDistribution: buildHitDistribution(),
    hitDistributionByOutRule: {
      singleout: buildHitDistribution(),
      doubleout: buildHitDistribution(),
      tripleout: buildHitDistribution(),
    },
    mostHitSegment: null,
    favoriteDoubles: [],
    highestFinish: null,
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

/** `GET /api/player/{id}/profile` of Anna, another registered player, with the default stats. */
export function buildPlayerPublicProfile(
  overrides: Partial<PlayerPublicProfileResponse> = {},
): PlayerPublicProfileResponse {
  return {
    playerId: 7,
    displayName: "Anna",
    stats: buildPlayerProfileStats(),
    ...overrides,
  };
}

/** The session answer of Alice, a logged-in player with the id 42. */
export function buildAuthenticatedPlayer(
  overrides: Partial<AuthenticatedUser> = {},
): AuthenticatedUser {
  return {
    success: true,
    id: 42,
    roles: ["ROLE_PLAYER"],
    email: "alice@example.com",
    username: "Alice",
    redirect: "/playerprofile",
    ...overrides,
  };
}
