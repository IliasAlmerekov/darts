import { expect, test, type Page } from "../shared/test";
import { mockLobbyApi } from "../shared/lobby-route-mocks";
import { loginAsAdmin } from "../shared/start-page-helpers";
import { lobbyTabletGame, mockTabletGame } from "../shared/tablet-game-mocks";

const OLDER_GAME_ID = 55;
const LAST_FINISHED_GAME_ID = 56;
const NEW_GAME_ID = 57;

async function mockFinishedGame(page: Page, gameId: number): Promise<void> {
  await page.route(`**/api/game/${gameId}/finished`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        gameId,
        winnerRoundsPlayed: 5,
        winnerRoundAverage: 60.2,
        finishedPlayers: [
          { playerId: 1, username: "Alice", position: 1, roundsPlayed: 5, roundAverage: 60.2 },
        ],
      }),
    });
  });
}

const GAME_NOT_NEWEST = {
  status: 409,
  contentType: "application/json",
  body: JSON.stringify({ success: false, error: "GAME_NOT_NEWEST", message: "Conflict" }),
};

test.describe("Summary of a game that is not the last finished game", () => {
  test("moves an older game's summary to its details, without Undo and Rematch", async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await mockTabletGame(page, { game: null, lastFinishedGameId: LAST_FINISHED_GAME_ID });
    await mockFinishedGame(page, OLDER_GAME_ID);

    await page.goto(`/summary/${OLDER_GAME_ID}`);

    await expect(page).toHaveURL(`/details/${OLDER_GAME_ID}`);
    await expect(page.getByRole("heading", { name: "Game details" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Play Again" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Return to game" })).toHaveCount(0);
  });

  for (const { action, button, endpoint } of [
    {
      action: "Undo",
      button: "Return to game",
      endpoint: `/api/game/${LAST_FINISHED_GAME_ID}/throw`,
    },
    {
      action: "Rematch",
      button: "Back To Start",
      endpoint: `/api/room/${LAST_FINISHED_GAME_ID}/rematch`,
    },
  ]) {
    test(`shows that the game is locked on a 409 from ${action}, then moves to the tablet game`, async ({
      page,
    }) => {
      await mockLobbyApi(page);
      await loginAsAdmin(page);
      const answerTabletGame = await mockTabletGame(page, {
        game: null,
        lastFinishedGameId: LAST_FINISHED_GAME_ID,
      });
      await mockFinishedGame(page, LAST_FINISHED_GAME_ID);
      await page.goto(`/summary/${LAST_FINISHED_GAME_ID}`);
      await expect(page.getByRole("button", { name: "Play Again" })).toBeVisible();

      // Another tablet opened a room after this summary loaded.
      await page.route(`**${endpoint}`, async (route) => {
        answerTabletGame({
          ...lobbyTabletGame(NEW_GAME_ID),
          lastFinishedGameId: LAST_FINISHED_GAME_ID,
        });
        await route.fulfill(GAME_NOT_NEWEST);
      });
      await page.getByRole("button", { name: button }).click();

      await expect(page.getByText("This game can no longer be changed.")).toBeVisible();
      await expect(page).toHaveURL(`/start/${NEW_GAME_ID}`);
    });
  }
});
