import { test, expect } from "../shared/test";
import {
  mockPendingUnauthenticatedSession,
  mockRememberedPlayerSession,
  REMEMBERED_PLAYER_JOINED_RESPONSE,
  REMEMBERED_PLAYER_RESPONSE,
} from "../shared/auth-route-mocks";
import { mockQuietRoomStream } from "../shared/room-stream-mocks";

test.describe("Remembered login", () => {
  test("shows the login check until the auth check answers, then the form", async ({ page }) => {
    const releaseAuthCheck = await mockPendingUnauthenticatedSession(page);

    await page.goto("/");

    await expect(page.getByText("Checking your login…")).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Email *" })).toHaveCount(0);

    releaseAuthCheck();

    await expect(page.getByRole("textbox", { name: "Email *" })).toBeVisible();
    await expect(page.getByText("Checking your login…")).toHaveCount(0);
  });

  test("a remembered player who scans an invite lands in the Waiting room", async ({ page }) => {
    await mockQuietRoomStream(page);
    await mockRememberedPlayerSession(page);

    await page.goto("/");

    await expect(page).toHaveURL("/joined");
    await expect(page.getByRole("heading", { name: /Joined game/ })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Email *" })).toHaveCount(0);
    const storedGameId = await page.evaluate(() =>
      window.sessionStorage.getItem("darts_current_game_id"),
    );
    expect(storedGameId).toBe(String(REMEMBERED_PLAYER_JOINED_RESPONSE.gameId));
  });

  test("a scan of a started game shows the already-started screen", async ({ page }) => {
    await mockRememberedPlayerSession(page, {
      ...REMEMBERED_PLAYER_RESPONSE,
      invitationError: "GAME_ALREADY_STARTED",
    });

    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: "This game has already started" }),
    ).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Email *" })).toHaveCount(0);

    await page.getByRole("button", { name: "Go to my profile" }).click();

    await expect(page).toHaveURL("/playerprofile");
  });
});
