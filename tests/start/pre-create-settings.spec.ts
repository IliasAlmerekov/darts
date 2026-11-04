import { expect, test } from "../shared/test";
import { loginAsAdmin } from "../shared/start-page-helpers";
import { mockLobbyApi } from "../shared/lobby-route-mocks";
import { lobbyTabletGame, mockTabletGame } from "../shared/tablet-game-mocks";

test.describe("Pre-create game settings", () => {
  test("sends selected settings when creating a room after editing /settings", async ({ page }) => {
    let createRoomPayload: Record<string, unknown> | null = null;

    await mockLobbyApi(page);
    await loginAsAdmin(page);
    await page.goto("/settings");

    await page.getByRole("button", { name: "Double-out" }).click();
    await page.getByRole("button", { name: "501" }).click();

    await page.goto("/start");

    const answerTabletGame = await mockTabletGame(page);
    await page.route("**/api/room/create", async (route, request) => {
      createRoomPayload = request.postDataJSON() as Record<string, unknown>;
      answerTabletGame(lobbyTabletGame(520));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, gameId: 520 }),
      });
    });

    await page.route("**/api/invite/create/520", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          gameId: 520,
          invitationLink: "/invite/520",
        }),
      });
    });

    await page.getByRole("button", { name: /^create game$/i }).click();

    await expect(page).toHaveURL("/start/520");
    expect(createRoomPayload).toEqual({
      startScore: 501,
      doubleOut: true,
      tripleOut: false,
    });

    const settingsRequests: string[] = [];
    page.on("request", (request) => {
      if (
        request.method() === "GET" &&
        new URL(request.url()).pathname === "/api/game/520/settings"
      ) {
        settingsRequests.push(request.url());
      }
    });
    await page.getByRole("link", { name: "Settings" }).click();
    await expect(page).toHaveURL("/settings/520");
    await expect(page.getByRole("button", { name: "Double-out" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.getByRole("button", { name: "501" })).toHaveAttribute("aria-pressed", "true");
    expect(settingsRequests).toEqual([]);
  });
});
