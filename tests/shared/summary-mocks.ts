import type { Page } from "@playwright/test";

/** Answers `GET /api/game/<gameId>/finished` with a one-player summary. */
export async function mockFinishedGame(page: Page, gameId: number): Promise<void> {
  await page.route(`**/api/game/${gameId}/finished`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        gameId,
        winnerRoundsPlayed: 5,
        winnerRoundAverage: 60.2,
        finishedPlayers: [
          {
            playerId: 1,
            username: "Alice",
            position: 0,
            placement: 1,
            roundsPlayed: 5,
            roundAverage: 60.2,
          },
        ],
      }),
    });
  });
}

/** The backend's answer when a change targets a game that is no longer the newest one. */
export const GAME_NOT_NEWEST_RESPONSE = {
  status: 409,
  contentType: "application/json",
  body: JSON.stringify({ success: false, error: "GAME_NOT_NEWEST", message: "Conflict" }),
};
