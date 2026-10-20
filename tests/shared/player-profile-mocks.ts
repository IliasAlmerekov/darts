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

/** Body of `GET /api/player/profile`. */
interface PlayerProfileBody {
  stats: { gamesPlayed: number; scoreAverage: number | null };
  recentGames: PlayerProfileGameBody[];
}

export const PLAYER_PROFILE: PlayerProfileBody = {
  stats: { gamesPlayed: 18, scoreAverage: 56.4 },
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
};

/** Answers the Player profile's request with `body`. */
export async function mockPlayerProfile(
  page: Page,
  body: PlayerProfileBody = PLAYER_PROFILE,
): Promise<void> {
  await page.route("**/api/player/profile", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  });
}
