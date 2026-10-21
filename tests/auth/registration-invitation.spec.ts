import { test, expect } from "../shared/test";
import {
  mockUnauthenticatedSession,
  REMEMBERED_PLAYER_JOINED_RESPONSE,
  REMEMBERED_PLAYER_RESPONSE,
} from "../shared/auth-route-mocks";
import { lobbyCurrentGame, mockCurrentGame } from "../shared/current-game-mocks";
import { mockPlayerProfile } from "../shared/player-profile-mocks";
import type { Page } from "@playwright/test";

async function mockRegistration(page: Page, body: unknown): Promise<void> {
  await page.route("**/api/register", async (route) => {
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  });
}

async function fillAndSubmit(page: Page): Promise<void> {
  await page.goto("/register");
  await page.getByRole("textbox", { name: "Username *" }).fill("Captain Double");
  await page.getByRole("textbox", { name: "Email *" }).fill("captain@example.com");
  await page.getByRole("textbox", { name: "Password *" }).fill("Password123!");
  await page.getByRole("button", { name: "Create account" }).click();
}

test.describe("Registration after scanning an invitation", () => {
  test.beforeEach(async ({ page }) => {
    await mockUnauthenticatedSession(page);
  });

  test("scan → register → Waiting room shows the joined game", async ({ page }) => {
    await mockCurrentGame(page, lobbyCurrentGame(42));
    await mockRegistration(page, REMEMBERED_PLAYER_JOINED_RESPONSE);

    await fillAndSubmit(page);

    await expect(page).toHaveURL("/joined");
    await expect(page.getByRole("heading", { name: /Joined game/ })).toBeVisible();
    const storedGameId = await page.evaluate(() =>
      window.sessionStorage.getItem("darts_current_game_id"),
    );
    expect(storedGameId).toBe(String(REMEMBERED_PLAYER_JOINED_RESPONSE.gameId));
  });

  test("a scan of a started game shows the already-started screen", async ({ page }) => {
    await mockRegistration(page, {
      ...REMEMBERED_PLAYER_RESPONSE,
      invitationError: "GAME_ALREADY_STARTED",
    });
    await mockPlayerProfile(page);

    await fillAndSubmit(page);

    await expect(
      page.getByRole("heading", { name: "This game has already started" }),
    ).toBeVisible();
    await expect(page).toHaveURL("/register");

    await page.getByRole("button", { name: "Go to my profile" }).click();

    await expect(page).toHaveURL("/playerprofile");
  });
});
