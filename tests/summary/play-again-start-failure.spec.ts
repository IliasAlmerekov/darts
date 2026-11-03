import { expect, test } from "../shared/test";
import { fulfillJson } from "../shared/json-response";
import { mockLobbyApi } from "../shared/lobby-route-mocks";
import { loginAsAdmin } from "../shared/start-page-helpers";
import { mockFinishedGame } from "../shared/summary-mocks";
import { lobbyTabletGame, mockTabletGame } from "../shared/tablet-game-mocks";

const FINISHED_GAME_ID = 56;
const LOBBY_GAME_ID = 57;

test.describe("Play Again when the rematch lobby cannot be started", () => {
  test("shows the start error on the summary, then opens the new lobby's start page", async ({
    page,
  }) => {
    await mockLobbyApi(page);
    await loginAsAdmin(page);
    const answerTabletGame = await mockTabletGame(page, {
      game: null,
      lastFinishedGameId: FINISHED_GAME_ID,
    });
    await mockFinishedGame(page, FINISHED_GAME_ID);
    await page.route(`**/api/room/${FINISHED_GAME_ID}/rematch`, async (route) => {
      answerTabletGame({ ...lobbyTabletGame(LOBBY_GAME_ID), lastFinishedGameId: FINISHED_GAME_ID });
      await fulfillJson(route, {
        success: true,
        gameId: LOBBY_GAME_ID,
        invitationLink: `/invite/${LOBBY_GAME_ID}`,
      });
    });
    await page.route(`**/api/game/${LOBBY_GAME_ID}/start`, async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ success: false, error: "INTERNAL_ERROR", message: "Server error" }),
      });
    });

    await page.goto(`/summary/${FINISHED_GAME_ID}`);
    await page.getByRole("button", { name: "Play Again" }).click();

    await expect(page.getByText("Server error. Please try again later.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Play Again" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Back To Start" })).toBeDisabled();
    await expect(page.getByText("Alice")).toBeVisible();

    await expect(page).toHaveURL(`/start/${LOBBY_GAME_ID}`);
  });
});
