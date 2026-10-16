import { test, expect } from "../shared/test";
import { mockRememberedPlayerSession } from "../shared/auth-route-mocks";
import {
  lobbyCurrentGame,
  mockCurrentGame,
  NO_CURRENT_GAME,
  startedCurrentGame,
} from "../shared/current-game-mocks";

test.describe("Waiting room", () => {
  test.beforeEach(async ({ page }) => {
    await mockRememberedPlayerSession(page);
  });

  test("shows the start once the admin starts the game", async ({ page }) => {
    const answerCurrentGame = await mockCurrentGame(page, lobbyCurrentGame(42));

    await page.goto("/joined");

    await expect(page.getByText("Game #42")).toBeVisible();
    const status = page.getByRole("status");
    await expect(status).toContainText("Waiting for the game to start...");

    answerCurrentGame(startedCurrentGame(42));

    await expect(status).toContainText("The game has started");
    await expect(status).toContainText("Follow your score on the tablet");
  });

  test("tells a removed player and opens the player profile", async ({ page }) => {
    const answerCurrentGame = await mockCurrentGame(page, lobbyCurrentGame(42));

    await page.goto("/joined");

    await expect(page.getByText("Game #42")).toBeVisible();
    answerCurrentGame(NO_CURRENT_GAME);

    await expect(
      page.getByRole("heading", { name: "You are no longer in this game" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Go to my profile" }).click();

    await expect(page).toHaveURL("/playerprofile");
  });

  test("opens the player profile when there is no current game", async ({ page }) => {
    await mockCurrentGame(page, NO_CURRENT_GAME);

    await page.goto("/joined");

    await expect(page).toHaveURL("/playerprofile");
  });
});
