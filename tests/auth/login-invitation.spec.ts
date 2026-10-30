import { test, expect } from "../shared/test";
import {
  MOCK_LOGIN_CREDENTIALS,
  mockInvitedPlayerLoginFlow,
  mockUnauthenticatedSession,
  REMEMBERED_PLAYER_JOINED_RESPONSE,
} from "../shared/auth-route-mocks";
import { lobbyCurrentGame, mockCurrentGame } from "../shared/current-game-mocks";
import type { Page } from "@playwright/test";

const INVITATION_PATH = "/api/invite/join/0b9c6f1e-4d2a-4f8e-9a3b-7c5d1e2f3a4b";

/** The scanned QR code opens the backend join route, which stores the invitation and redirects to the app. */
async function scanInvitation(page: Page): Promise<void> {
  await page.route(`**${INVITATION_PATH}`, async (route) => {
    await route.fulfill({ status: 302, headers: { location: "/" } });
  });
  await page.goto(INVITATION_PATH);
  await expect(page).toHaveURL("/");
}

async function logIn(page: Page): Promise<void> {
  await scanInvitation(page);
  await page.getByRole("textbox", { name: "Email *" }).fill(MOCK_LOGIN_CREDENTIALS.email);
  await page.getByRole("textbox", { name: "Password *" }).fill(MOCK_LOGIN_CREDENTIALS.password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

async function expectJoinedGame(page: Page): Promise<void> {
  await expect(page).toHaveURL("/joined");
  await expect(page.getByRole("heading", { name: /Joined game/ })).toBeVisible();
  const storedGameId = await page.evaluate(() =>
    window.sessionStorage.getItem("darts_current_game_id"),
  );
  expect(storedGameId).toBe(String(REMEMBERED_PLAYER_JOINED_RESPONSE.gameId));
}

test.describe("Login after scanning an invitation", () => {
  test.beforeEach(async ({ page }) => {
    await mockCurrentGame(page, lobbyCurrentGame(42));
  });

  test("scan → log in → Waiting room, with the user in the login response", async ({ page }) => {
    await mockUnauthenticatedSession(page);
    await page.route("**/api/login", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(REMEMBERED_PLAYER_JOINED_RESPONSE),
      });
    });

    await logIn(page);

    await expectJoinedGame(page);
  });

  test("scan → log in → Waiting room, with the user read from the session", async ({ page }) => {
    await mockInvitedPlayerLoginFlow(page);

    await logIn(page);

    await expectJoinedGame(page);
  });
});
