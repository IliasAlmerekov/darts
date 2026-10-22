import type { Page } from "@playwright/test";

interface PlayerProfileParticipantBody {
  playerId: number | null;
  displayName: string | null;
  placement: number | null;
  isSelf: boolean;
}

interface PlayerProfileGameBody {
  gameId: number;
  finishedAt: string | null;
  placement: number | null;
  roundAverage: number;
  participantsCount: number;
  participants: PlayerProfileParticipantBody[];
}

interface PlayerProfileStatsBody {
  gamesPlayed: number;
  scoreAverage: number | null;
  wins: number;
  winRate: number | null;
  checkoutRate: number | null;
  checkoutHits: number;
  checkoutAttempts: number;
  hitDistribution: { segment: string; hits: number }[];
  mostHitSegment: { segment: string; hits: number; share: number } | null;
  favoriteDoubles: { double: string; hits: number; attempts: number; hitRate: number }[];
  highestFinish: { score: number; darts: number; throws: string[] } | null;
}

/** Body of `GET /api/player/profile`. */
interface PlayerProfileBody {
  stats: PlayerProfileStatsBody;
  recentGames: PlayerProfileGameBody[];
  registeredAt: string | null;
}

const SEGMENTS = [
  ...Array.from({ length: 20 }, (_, index) => String(index + 1)),
  "BULL",
  "BULLSEYE",
];

export const PLAYER_PROFILE: PlayerProfileBody = {
  stats: {
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
  },
  recentGames: [
    {
      gameId: 31,
      finishedAt: "2026-10-20T18:42:00+00:00",
      placement: 2,
      roundAverage: 45.3,
      participantsCount: 3,
      participants: [
        { playerId: 7, displayName: "Anna", placement: 1, isSelf: false },
        { playerId: 23, displayName: "Captain Double", placement: 2, isSelf: true },
        { playerId: null, displayName: "Guest", placement: 3, isSelf: false },
      ],
    },
  ],
  registeredAt: "2026-09-01T08:15:00+00:00",
};

/** Answers the Player profile's request with `PLAYER_PROFILE`. */
export async function mockPlayerProfile(page: Page): Promise<void> {
  await page.route("**/api/player/profile", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(PLAYER_PROFILE),
    });
  });
}
