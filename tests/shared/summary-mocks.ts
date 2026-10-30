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

interface SummaryPlayer {
  playerId: number;
  username: string;
  placement: number;
}

/**
 * Answers `POST /api/game/<gameId>/finish` with the summary of `players`, ranked by the server,
 * or with `status` when it is not 200. Returns the number of finish requests seen so far.
 */
export async function mockFinishGame(
  page: Page,
  gameId: number,
  players: SummaryPlayer[],
  status = 200,
): Promise<() => number> {
  let requests = 0;
  await page.route(`**/api/game/${gameId}/finish`, async (route) => {
    requests += 1;
    if (status !== 200) {
      await route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify({ success: false, error: "INTERNAL_ERROR", message: "Server error" }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        gameId,
        winnerRoundsPlayed: 5,
        winnerRoundAverage: 60.2,
        finishedPlayers: players.map((player, index) => ({
          ...player,
          position: index,
          roundsPlayed: 5,
          roundAverage: 60.2,
        })),
      }),
    });
  });
  return () => requests;
}

/** The backend's answer when a change targets a game that is no longer the newest one. */
export const GAME_NOT_NEWEST_RESPONSE = {
  status: 409,
  contentType: "application/json",
  body: JSON.stringify({ success: false, error: "GAME_NOT_NEWEST", message: "Conflict" }),
};
