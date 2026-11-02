import { test, expect } from "../shared/test";
import { mockRememberedPlayerSession } from "../shared/auth-route-mocks";
import {
  gameSeat,
  lobbyCurrentGame,
  mockCurrentGame,
  mockGameSeat,
  NO_CURRENT_GAME,
  startedCurrentGame,
} from "../shared/current-game-mocks";
import { mockPlayerProfile } from "../shared/player-profile-mocks";

test.describe("Waiting room", () => {
  test.beforeEach(async ({ page }) => {
    await mockRememberedPlayerSession(page);
    await mockPlayerProfile(page);
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
    await mockGameSeat(page, gameSeat(42, "lobby", false));

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
    await mockGameSeat(page, gameSeat(42, "finished", true));

    await page.goto("/joined");

    await expect(page).toHaveURL("/playerprofile");
  });

  test("opens the profile from the profile link and keeps the player in the game", async ({
    page,
  }) => {
    await mockCurrentGame(page, lobbyCurrentGame(42));

    await page.goto("/joined");
    await expect(page.getByText("Game #42")).toBeVisible();

    await page.getByRole("link", { name: "My profile" }).click();
    await expect(page).toHaveURL("/playerprofile");

    await page.goBack();

    await expect(page).toHaveURL("/joined");
    await expect(page.getByText("Game #42")).toBeVisible();
  });

  test("tells a player removed while on the profile once they come back", async ({ page }) => {
    const answerCurrentGame = await mockCurrentGame(page, lobbyCurrentGame(42));
    await mockGameSeat(page, gameSeat(42, "lobby", false));

    await page.goto("/joined");
    await expect(page.getByText("Game #42")).toBeVisible();
    await page.getByRole("link", { name: "My profile" }).click();
    await expect(page).toHaveURL("/playerprofile");

    answerCurrentGame(NO_CURRENT_GAME);
    await page.goBack();

    await expect(
      page.getByRole("heading", { name: "You are no longer in this game" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "My profile" })).toHaveCount(0);
  });

  for (const status of ["finished", "aborted"] as const) {
    test(`opens the profile without a removal when the game was ${status} meanwhile`, async ({
      page,
    }) => {
      const answerCurrentGame = await mockCurrentGame(page, lobbyCurrentGame(42));
      await mockGameSeat(page, gameSeat(42, status, true));

      await page.goto("/joined");
      await expect(page.getByText("Game #42")).toBeVisible();
      await page.getByRole("link", { name: "My profile" }).click();
      await expect(page).toHaveURL("/playerprofile");

      answerCurrentGame(NO_CURRENT_GAME);
      await page.goBack();

      await expect(page).toHaveURL("/playerprofile");
      await expect(page.getByText("You are no longer in this game")).toHaveCount(0);
    });
  }

  test("shows a red lost-connection line while requests fail", async ({ page }) => {
    let isDown = false;
    await page.route("**/api/player/current-game", async (route) => {
      if (isDown) {
        await route.abort("internetdisconnected");
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(lobbyCurrentGame(42)),
      });
    });

    await page.goto("/joined");
    await expect(page.getByText("Game #42")).toBeVisible();

    isDown = true;
    const lostConnection = page.getByText("Connection lost. Trying again…");
    await expect(lostConnection).toBeVisible({ timeout: 15_000 });
    // --color-danger
    await expect(lostConnection).toHaveCSS("color", "rgb(255, 32, 1)");

    isDown = false;
    await expect(lostConnection).toHaveCount(0, { timeout: 5_000 });
  });
});
